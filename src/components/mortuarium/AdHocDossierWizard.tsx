import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Mail, QrCode, FolderOpen, Plus } from "lucide-react";
import { createQRToken, generateQRCodeURL } from "@/utils/qrToken";
import { NewFDDialog } from "./NewFDDialog";

type WizardStep = 1 | 2 | 3 | 4;

interface DossierData {
  deceasedName: string;
  dateOfDeath: string;
  notes: string;
}

interface FDData {
  mode: "new" | "existing";
  existingFdOrgId?: string;
  newFdOrgId?: string;
}

interface CoolCellAllocation {
  coolCellId: string;
  startAt: string;
  endAt: string;
  note: string;
}

interface CoolCell {
  id: string;
  label: string;
  status: string;
  facility_org_id: string;
}

export function AdHocDossierWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [createdDossierId, setCreatedDossierId] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");

  const [dossierData, setDossierData] = useState<DossierData>({
    deceasedName: "",
    dateOfDeath: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [fdData, setFDData] = useState<FDData>({
    mode: "existing",
  });
  
  const [showNewFDDialog, setShowNewFDDialog] = useState(false);
  const [mortuariumOrgId, setMortuariumOrgId] = useState<string>("");
  const [mortuariumName, setMortuariumName] = useState<string>("");

  const [coolCellData, setCoolCellData] = useState<CoolCellAllocation>({
    coolCellId: "",
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    note: "",
  });

  const [availableCells, setAvailableCells] = useState<CoolCell[]>([]);
  const [existingFDs, setExistingFDs] = useState<any[]>([]);

  // Load available cool cells
  const loadCoolCells = async () => {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
      .single();

    if (!userRoles) return;

    const { data, error } = await supabase
      .from("cool_cells")
      .select("*")
      .eq("facility_org_id", userRoles.organization_id)
      .in("status", ["FREE", "RESERVED"]);

    if (!error && data) {
      setAvailableCells(data as any);
    }
  };

  // Load existing FDs and mortuarium info
  const loadExistingFDs = async () => {
    // Get current user's org
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("organization_id, organizations(id, name)")
      .eq("user_id", user.id)
      .single();

    if (userRole?.organizations) {
      setMortuariumOrgId(userRole.organization_id);
      setMortuariumName((userRole.organizations as any).name);
    }

    // Load active FD organizations
    const { data } = await supabase
      .from("organizations")
      .select("id, company_name, name, status")
      .eq("type", "FUNERAL_DIRECTOR")
      .eq("status", "active");

    if (data) {
      setExistingFDs(data as any);
    }
  };

  // Check cool cell overlap
  const checkCoolCellOverlap = async (): Promise<boolean> => {
    const { data } = await supabase
      .from("cool_cell_reservations")
      .select("*")
      .eq("cool_cell_id", coolCellData.coolCellId)
      .or(`start_at.lte.${coolCellData.endAt},end_at.gte.${coolCellData.startAt}`);

    if (data && data.length > 0) {
      toast.error("Deze koelcel is al gereserveerd in het gekozen tijdsinterval");
      return false;
    }
    return true;
  };

  // Generate temporary password
  const generateTempPassword = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!dossierData.deceasedName || !dossierData.dateOfDeath) {
        toast.error("Vul alle verplichte velden in");
        return;
      }
      await loadExistingFDs();
      setStep(2);
    } else if (step === 2) {
      if (fdData.mode === "new" && !fdData.newFdOrgId) {
        toast.error("Voeg eerst een nieuwe FD toe");
        return;
      }
      if (fdData.mode === "existing" && !fdData.existingFdOrgId) {
        toast.error("Selecteer een bestaande uitvaartondernemer");
        return;
      }
      await loadCoolCells();
      setStep(3);
    } else if (step === 3) {
      if (!coolCellData.coolCellId || !coolCellData.startAt || !coolCellData.endAt) {
        toast.error("Vul alle verplichte velden in");
        return;
      }
      const noOverlap = await checkCoolCellOverlap();
      if (!noOverlap) return;
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole) throw new Error("No organization found");

      // Create dossier
      const { data: dossier, error: dossierError } = await supabase
        .from("dossiers")
        .insert({
          deceased_name: dossierData.deceasedName,
          date_of_death: dossierData.dateOfDeath,
          internal_notes: dossierData.notes,
          ref_number: `AD-${Date.now()}`,
          flow: "LOC",
          status: "CREATED",
        })
        .select()
        .single();

      if (dossierError) throw dossierError;
      setCreatedDossierId(dossier.id);

      // Link FD organization to dossier
      const fdOrgId = fdData.mode === "new" ? fdData.newFdOrgId : fdData.existingFdOrgId;
      
      await supabase.from("dossiers").update({
        assigned_fd_org_id: fdOrgId,
      }).eq("id", dossier.id);

      // Create cool cell reservation
      await supabase.from("cool_cell_reservations").insert({
        dossier_id: dossier.id,
        cool_cell_id: coolCellData.coolCellId,
        start_at: coolCellData.startAt,
        end_at: coolCellData.endAt,
        note: coolCellData.note,
        facility_org_id: userRole.organization_id,
        created_by_user_id: user.id,
        status: "CONFIRMED",
      });

      // Generate QR code (reuse existing flow)
      const qrToken = await createQRToken({
        dossierId: dossier.id,
        expiresInHours: 168, // 7 days
        scopes: { basic_info: true, documents: true, status: true },
      });

      if (qrToken) {
        const url = generateQRCodeURL(qrToken.token);
        setQrUrl(url);
      }

      toast.success("Ad-hoc dossier succesvol aangemaakt!");
    } catch (error: any) {
      console.error("Error creating ad-hoc dossier:", error);
      toast.error(error.message || "Fout bij aanmaken van dossier");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="deceasedName">Naam overledene *</Label>
              <Input
                id="deceasedName"
                value={dossierData.deceasedName}
                onChange={(e) => setDossierData({ ...dossierData, deceasedName: e.target.value })}
                placeholder="Volledige naam"
              />
            </div>
            <div>
              <Label htmlFor="dateOfDeath">Overlijdensdatum *</Label>
              <Input
                id="dateOfDeath"
                type="date"
                value={dossierData.dateOfDeath}
                onChange={(e) => setDossierData({ ...dossierData, dateOfDeath: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={dossierData.notes}
                onChange={(e) => setDossierData({ ...dossierData, notes: e.target.value })}
                placeholder="Extra informatie..."
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <RadioGroup value={fdData.mode} onValueChange={(v) => setFDData({ ...fdData, mode: v as any })}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">Nieuwe uitvaartondernemer aanmaken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing">Bestaande uitvaartondernemer selecteren</Label>
              </div>
            </RadioGroup>

            {fdData.mode === "new" ? (
              <div className="space-y-3">
                {fdData.newFdOrgId ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Nieuwe FD toegevoegd</p>
                        <p className="text-sm text-muted-foreground">
                          Uitnodiging verstuurd naar de FD
                        </p>
                        <Badge variant="secondary" className="mt-2">In afwachting van goedkeuring</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFDData({ ...fdData, newFdOrgId: undefined })}
                      >
                        Wijzigen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewFDDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe FD toevoegen
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Label>Selecteer uitvaartondernemer *</Label>
                <RadioGroup value={fdData.existingFdOrgId} onValueChange={(v) => setFDData({ ...fdData, existingFdOrgId: v })}>
                  <div className="grid gap-2">
                    {existingFDs.map((org: any) => (
                      <div key={org.id} className="flex items-center space-x-2 p-3 border rounded hover:bg-accent">
                        <RadioGroupItem value={org.id} id={org.id} />
                        <Label htmlFor={org.id} className="flex-1 cursor-pointer">
                          <span className="font-medium">{org.company_name || org.name}</span>
                          <Badge variant="default" className="ml-2">Actief</Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {existingFDs.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Geen actieve uitvaartondernemers gevonden. Maak een nieuwe aan.
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Selecteer koelcel *</Label>
              <RadioGroup value={coolCellData.coolCellId} onValueChange={(v) => setCoolCellData({ ...coolCellData, coolCellId: v })}>
                <div className="grid gap-2">
                  {availableCells.map((cell) => (
                    <div key={cell.id} className="flex items-center space-x-2 p-3 border rounded hover:bg-accent">
                      <RadioGroupItem value={cell.id} id={cell.id} />
                      <Label htmlFor={cell.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{cell.label}</span>
                        <Badge variant={cell.status === "FREE" ? "default" : "secondary"} className="ml-2">
                          {cell.status === "FREE" ? "Vrij" : "Gereserveerd"}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startAt">Start datum/tijd *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={coolCellData.startAt}
                  onChange={(e) => setCoolCellData({ ...coolCellData, startAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endAt">Eind datum/tijd *</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={coolCellData.endAt}
                  onChange={(e) => setCoolCellData({ ...coolCellData, endAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cellNote">Notities</Label>
              <Textarea
                id="cellNote"
                value={coolCellData.note}
                onChange={(e) => setCoolCellData({ ...coolCellData, note: e.target.value })}
                placeholder="Extra informatie over de reservering..."
                rows={2}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Dossier</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Naam:</span> {dossierData.deceasedName}</p>
                <p><span className="text-muted-foreground">Overlijdensdatum:</span> {dossierData.dateOfDeath}</p>
                {dossierData.notes && <p><span className="text-muted-foreground">Notities:</span> {dossierData.notes}</p>}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Uitvaartondernemer</h3>
              <div className="text-sm space-y-1">
                {fdData.mode === "new" ? (
                  <>
                    <p><span className="text-muted-foreground">Status:</span> Nieuwe FD (in afwachting goedkeuring)</p>
                    <Badge variant="secondary">Pending</Badge>
                  </>
                ) : (
                  <p><span className="text-muted-foreground">Organisatie:</span> {existingFDs.find(f => f.id === fdData.existingFdOrgId)?.company_name || existingFDs.find(f => f.id === fdData.existingFdOrgId)?.name}</p>
                )}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Koelcel</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Label:</span> {availableCells.find(c => c.id === coolCellData.coolCellId)?.label}</p>
                <p><span className="text-muted-foreground">Periode:</span> {new Date(coolCellData.startAt).toLocaleString('nl-NL')} - {new Date(coolCellData.endAt).toLocaleString('nl-NL')}</p>
              </div>
            </div>

            {createdDossierId && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button variant="outline" onClick={async () => {
                  if (fdData.mode === "new") {
                    toast.info("Uitnodigingsmail wordt verzonden...");
                  }
                }}>
                  <Mail className="h-4 w-4 mr-2" />
                  Verstuur uitnodiging
                </Button>
                
                {qrUrl && (
                  <Button variant="outline" onClick={() => window.open(qrUrl, "_blank")}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Genereer QR
                  </Button>
                )}

                <Button onClick={() => navigate(`/dossiers/${createdDossierId}`)}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open dossier
                </Button>
              </div>
            )}
          </div>
        );
    }
  };

  const steps = [
    { number: 1, label: "Dossier" },
    { number: 2, label: "FD" },
    { number: 3, label: "Koelcel" },
    { number: 4, label: "Bevestig" },
  ];

  return (
    <>
      <Card className="max-w-3xl mx-auto p-6">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s.number
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.number ? <CheckCircle2 className="h-5 w-5" /> : s.number}
                  </div>
                  <span className="text-xs mt-2 font-medium">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      step > s.number ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="mb-6">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading || !!createdDossierId}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={loading}>
              Volgende
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !!createdDossierId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Bevestigen & Aanmaken
            </Button>
          )}
        </div>
      </Card>

      <NewFDDialog
        open={showNewFDDialog}
        onOpenChange={setShowNewFDDialog}
        onSuccess={(orgId) => {
          setFDData({ ...fdData, newFdOrgId: orgId });
          toast.success("Nieuwe FD succesvol toegevoegd!");
        }}
        mortuariumOrgId={mortuariumOrgId}
        mortuariumName={mortuariumName}
        dossierRef={dossierData.deceasedName || "AD-HOC"}
      />
    </>
  );
}
