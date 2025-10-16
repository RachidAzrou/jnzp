import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { nl, enGB, fr } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle, ArrowLeft, ArrowRight, UserPlus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { NewFDDialog } from "./NewFDDialog";

interface CoolCell {
  id: string;
  label: string;
  status: string;
}

export function AdHocDossierWizard() {
  const { t, i18n } = useTranslation();
  
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'en': return enGB;
      default: return nl;
    }
  };
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1: Dossier basis info
  const [deceasedName, setDeceasedName] = useState("");
  const [receivedAt, setReceivedAt] = useState<Date>(new Date());
  const [note, setNote] = useState("");

  // Step 2: Koelcel reservering (optioneel)
  const [reserveCoolCell, setReserveCoolCell] = useState(false);
  const [selectedCoolCellId, setSelectedCoolCellId] = useState<string>("");
  const [startAt, setStartAt] = useState<Date>(new Date());
  const [endAt, setEndAt] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 dagen

  // Step 3: FD toewijzing (optioneel)
  const [assignFD, setAssignFD] = useState(false);
  const [selectedFDOrgId, setSelectedFDOrgId] = useState<string>("");
  const [showNewFDDialog, setShowNewFDDialog] = useState(false);

  // Fetch current user's organization
  const { data: userOrg } = useQuery({
    queryKey: ["user-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (error) throw error;
      return data.organization_id;
    },
  });

  // Fetch available cool cells
  const { data: coolCells } = useQuery({
    queryKey: ["cool-cells-available", userOrg],
    queryFn: async () => {
      if (!userOrg) return [];
      
      const { data, error } = await supabase
        .from("cool_cells")
        .select("*")
        .eq("facility_org_id", userOrg)
        .eq("status", "FREE")
        .order("label");

      if (error) throw error;
      return data as CoolCell[];
    },
    enabled: !!userOrg && reserveCoolCell,
  });

  // Fetch FD organizations (including provisional)
  const { data: fdOrganizations } = useQuery({
    queryKey: ["fd-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, provisional, verification_status")
        .eq("type", "FUNERAL_DIRECTOR")
        .in("verification_status", ["PENDING", "ACTIVE"])
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: assignFD,
  });

  // Create ad-hoc dossier mutation
  const createDossierMutation = useMutation({
    mutationFn: async () => {
      if (!userOrg) throw new Error("Organization not found");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create dossier manually  
      const { data: dossierData, error: dossierError } = await supabase
        .from("dossiers")
        .insert([{
          deceased_name: deceasedName.trim(),
          flow: "LOC",
          status: "IN_PROGRESS" as any,
          assignment_status: "UNASSIGNED",
          is_adhoc: true,
          internal_notes: note.trim() || null,
          ref_number: `ADHOC-${Date.now()}`,
        }])
        .select()
        .single();
      
      const dossier = dossierData;

      if (dossierError) throw dossierError;

      // Create dossier event for timeline
      await supabase.from("dossier_events").insert({
        dossier_id: dossier.id,
        event_type: "MORTUARY_INTAKE",
        event_description: t("mortuarium.adHocWizard.mortuaryIntake"),
        created_by: user.id,
        metadata: {
          note: note.trim() || null,
          received_at: receivedAt.toISOString(),
          facility_org_id: userOrg,
        },
      });

      // If cool cell reservation is requested
      if (reserveCoolCell && selectedCoolCellId) {
        await supabase.from("cool_cell_reservations").insert({
          dossier_id: dossier.id,
          cool_cell_id: selectedCoolCellId,
          facility_org_id: userOrg,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: "PENDING",
          created_by_user_id: user.id,
        });
      }

      // If FD is assigned, update dossier
      if (assignFD && selectedFDOrgId) {
        await supabase
          .from("dossiers")
          .update({
            adhoc_fd_org_id: selectedFDOrgId,
            assignment_status: "ASSIGNED",
          })
          .eq("id", dossier.id);
      }

      return dossier.id;
    },
    onSuccess: (dossierId) => {
      toast({
        title: t("common.success"),
        description: t("mortuarium.adHocWizard.dossierCreated"),
      });
      queryClient.invalidateQueries({ queryKey: ["mortuarium-dossiers"] });
      queryClient.invalidateQueries({ queryKey: ["cool-cells"] });
      queryClient.invalidateQueries({ queryKey: ["cool-cell-reservations"] });
      
      // Navigate to dossier detail
      navigate(`/dossier/${dossierId}`);
    },
    onError: (error: any) => {
      toast({
        title: t("toasts.errors.createError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canProceedStep1 = deceasedName.trim().length > 2;
  const canProceedStep2 = !reserveCoolCell || (reserveCoolCell && selectedCoolCellId);
  const canProceedStep3 = !assignFD || (assignFD && selectedFDOrgId);
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3;

  const handleNext = () => {
    if (step === 1 && canProceedStep1) setStep(2);
    else if (step === 2 && canProceedStep2) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      toast({
        title: t("toasts.errors.allFieldsRequired"),
        variant: "destructive",
      });
      return;
    }
    createDossierMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {step > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
          </div>
          <span className="text-sm font-medium">{t("mortuarium.adHocWizard.basicInfo")}</span>
        </div>
        <div className="flex-1 h-0.5 bg-muted mx-4" />
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {step > 2 ? <CheckCircle className="h-5 w-5" /> : "2"}
          </div>
          <span className="text-sm font-medium">{t("mortuarium.adHocWizard.coolCell")}</span>
        </div>
        <div className="flex-1 h-0.5 bg-muted mx-4" />
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            3
          </div>
          <span className="text-sm font-medium">{t("mortuarium.adHocWizard.fdAssignment")}</span>
        </div>
      </div>

      {/* Step 1: Basis informatie */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mortuarium.adHocWizard.basicInfoTitle")}</CardTitle>
            <CardDescription>
              {t("mortuarium.adHocWizard.basicInfoDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deceased-name">
                {t("mortuarium.adHocWizard.deceasedName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deceased-name"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder={t("mortuarium.adHocWizard.fullNamePlaceholder")}
                required
                minLength={3}
              />
              {deceasedName.length > 0 && deceasedName.length < 3 && (
                <p className="text-sm text-destructive">
                  {t("mortuarium.adHocWizard.min3Chars")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                {t("mortuarium.adHocWizard.receivedDateTime")} <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !receivedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {receivedAt ? format(receivedAt, "PPP HH:mm", { locale: getDateLocale() }) : t("mortuarium.adHocWizard.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={receivedAt}
                    onSelect={(date) => date && setReceivedAt(date)}
                    locale={getDateLocale()}
                  />
                  <div className="p-3 border-t">
                    <Input
                      type="time"
                      value={format(receivedAt, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = new Date(receivedAt);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setReceivedAt(newDate);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{t("mortuarium.adHocWizard.notes")}</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("mortuarium.adHocWizard.notesPlaceholder")}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!canProceedStep1}
            >
              {t("mortuarium.adHocWizard.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Koelcel reservering */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mortuarium.adHocWizard.coolCellTitle")}</CardTitle>
            <CardDescription>
              {t("mortuarium.adHocWizard.coolCellDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reserve-cell"
                checked={reserveCoolCell}
                onCheckedChange={(checked) => setReserveCoolCell(checked as boolean)}
              />
              <Label htmlFor="reserve-cell" className="font-normal cursor-pointer">
                {t("mortuarium.adHocWizard.reserveCell")}
              </Label>
            </div>

            {reserveCoolCell && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cool-cell">
                    {t("mortuarium.adHocWizard.coolCell")} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedCoolCellId} onValueChange={setSelectedCoolCellId}>
                    <SelectTrigger id="cool-cell">
                      <SelectValue placeholder={t("mortuarium.adHocWizard.selectCoolCell")} />
                    </SelectTrigger>
                    <SelectContent>
                      {coolCells?.map((cell) => (
                        <SelectItem key={cell.id} value={cell.id}>
                          {cell.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {coolCells?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("mortuarium.adHocWizard.noFreeCells")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("mortuarium.adHocWizard.startDateTime")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(startAt, "PPP HH:mm", { locale: getDateLocale() })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startAt}
                          onSelect={(date) => date && setStartAt(date)}
                          locale={getDateLocale()}
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={format(startAt, "HH:mm")}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(startAt);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setStartAt(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("mortuarium.adHocWizard.endDateTime")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endAt, "PPP HH:mm", { locale: getDateLocale() })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endAt}
                          onSelect={(date) => date && setEndAt(date)}
                          locale={getDateLocale()}
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={format(endAt, "HH:mm")}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(endAt);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setEndAt(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("mortuarium.adHocWizard.previous")}
            </Button>
            <Button onClick={handleNext} disabled={!canProceedStep2}>
              {t("mortuarium.adHocWizard.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: FD Toewijzing */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mortuarium.adHocWizard.fdAssignmentTitle")}</CardTitle>
            <CardDescription>
              {t("mortuarium.adHocWizard.fdAssignmentDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assign-fd"
                checked={assignFD}
                onCheckedChange={(checked) => setAssignFD(checked as boolean)}
              />
              <Label htmlFor="assign-fd" className="font-normal cursor-pointer">
                {t("mortuarium.adHocWizard.assignFD")}
              </Label>
            </div>

            {assignFD && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fd-org">{t("mortuarium.adHocWizard.funeralDirector")}</Label>
                  <div className="flex gap-2">
                    <Select value={selectedFDOrgId} onValueChange={setSelectedFDOrgId}>
                      <SelectTrigger id="fd-org" className="flex-1">
                        <SelectValue placeholder={t("mortuarium.adHocWizard.selectFD")} />
                      </SelectTrigger>
                      <SelectContent>
                        {fdOrganizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                            {org.provisional && ` (${t("mortuarium.adHocWizard.provisional")})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewFDDialog(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  {fdOrganizations?.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("mortuarium.adHocWizard.noFDsFound")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {selectedFDOrgId && fdOrganizations?.find(o => o.id === selectedFDOrgId)?.provisional && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("mortuarium.adHocWizard.provisionalAlert")}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("mortuarium.adHocWizard.previous")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || createDossierMutation.isPending}
            >
              {createDossierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("mortuarium.adHocWizard.creating")}
                </>
              ) : (
                t("mortuarium.adHocWizard.createDossier")
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* New FD Dialog */}
      <NewFDDialog
        open={showNewFDDialog}
        onOpenChange={setShowNewFDDialog}
        onFDCreated={(fdOrgId) => {
          setSelectedFDOrgId(fdOrgId);
          setAssignFD(true);
        }}
      />
    </div>
  );
}
