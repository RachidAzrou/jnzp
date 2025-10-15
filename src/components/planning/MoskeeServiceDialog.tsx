import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MoskeeServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function MoskeeServiceDialog({ open, onOpenChange, onSuccess }: MoskeeServiceDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDossier, setSelectedDossier] = useState<string>("");
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedPrayer, setSelectedPrayer] = useState("Dhuhr");
  const [location, setLocation] = useState("");

  const prayerTimes = [
    { value: "Fajr", label: "Fajr (Ochtendgebed)" },
    { value: "Dhuhr", label: "Dhuhr (Middaggebed)" },
    { value: "Asr", label: "Asr (Namiddaggebed)" },
    { value: "Maghrib", label: "Maghrib (Avondgebed)" },
    { value: "Isha", label: "Isha (Nachtgebed)" },
    { value: "Jumuah", label: "Jumu'ah (Vrijdaggebed)" }
  ];

  // Auto-select Jumu'ah on Friday
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && date.getDay() === 5) { // 5 = Friday
      setSelectedPrayer("Jumuah");
    } else if (selectedPrayer === "Jumuah") {
      // Reset to Dhuhr if Jumu'ah was selected but date is no longer Friday
      setSelectedPrayer("Dhuhr");
    }
  };

  // Fetch active dossiers from user's organization
  const { data: dossiers } = useQuery({
    queryKey: ["planning-dossiers"],
    queryFn: async () => {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      const orgIds = userRoles?.map(r => r.organization_id).filter(Boolean) || [];
      
      if (orgIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, display_id, deceased_name")
        .in('assigned_fd_org_id', orgIds)
        .eq('assignment_status', 'ASSIGNED')
        .is('deleted_at', null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch mosques
  const { data: mosques } = useQuery({
    queryKey: ["mosques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, address")
        .eq("type", "MOSQUE")
        .eq("verification_status", "ACTIVE");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create mosque service mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDossier || !selectedMosque || !selectedDate) {
        throw new Error(t("moskeeService.errorSelectAll"));
      }

      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(14, 0, 0, 0); // Default time, prayer-specific time to be set by mosque

      // Get mosque name for location_text
      const mosqueName = mosques?.find(m => m.id === selectedMosque)?.name || "";

      const { data, error } = await supabase
        .from("case_events")
        .insert({
          dossier_id: selectedDossier,
          event_type: "MOSQUE_SERVICE",
          scheduled_at: scheduledAt.toISOString(),
          location_text: location || mosqueName,
          status: "PLANNED",
          metadata: {
            mosque_org_id: selectedMosque,
            prayer_time: selectedPrayer
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-events"] });
      toast({
        title: t("moskeeService.created"),
        description: t("moskeeService.createdDesc"),
      });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDossier("");
    setSelectedMosque("");
    setSelectedDate(undefined);
    setSelectedPrayer("Dhuhr");
    setLocation("");
  };

  const handleCreate = () => {
    if (!selectedDossier || !selectedMosque || !selectedDate) {
      toast({
        title: t("common.error"),
        description: t("moskeeService.errorSelectAll"),
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moskeeService.title")}</DialogTitle>
          <DialogDescription>
            {t("moskeeService.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("moskeeService.dossier")}</Label>
            <Select value={selectedDossier} onValueChange={setSelectedDossier}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.selectDossierEllipsis")} />
              </SelectTrigger>
              <SelectContent>
                {dossiers?.map((dossier) => (
                  <SelectItem key={dossier.id} value={dossier.id}>
                    {dossier.display_id} - {dossier.deceased_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("moskeeService.mosque")}</Label>
            <Select value={selectedMosque} onValueChange={setSelectedMosque}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.selectMosque")} />
              </SelectTrigger>
              <SelectContent>
                {mosques?.map((mosque) => (
                  <SelectItem key={mosque.id} value={mosque.id}>
                    {mosque.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("moskeeService.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: nl }) : t("placeholders.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>{t("moskeeService.prayer")}</Label>
            <Select value={selectedPrayer} onValueChange={setSelectedPrayer}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.selectPrayer")} />
              </SelectTrigger>
              <SelectContent>
                {prayerTimes.map((prayer) => (
                  <SelectItem key={prayer.value} value={prayer.value}>
                    {prayer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("moskeeService.location")}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("placeholders.locationExample")}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t("moskeeService.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedDossier || !selectedMosque || !selectedDate || createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? t("common.loading") : t("moskeeService.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}