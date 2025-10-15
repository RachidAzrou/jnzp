import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, User, Users, Building2, FileText } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

// Validation schema - errors use translation keys
const createDossierSchema = (t: (key: string) => string) => z.object({
  first_name: z.string().trim().min(1, t("forms.errors.firstNameRequired")).max(100, t("forms.errors.firstNameTooLong")),
  last_name: z.string().trim().min(1, t("forms.errors.lastNameRequired")).max(100, t("forms.errors.lastNameTooLong")),
  gender: z.union([z.literal("M"), z.literal("V"), z.literal("X")]),
  flow: z.union([z.literal("LOC"), z.literal("REP")]),
  address_of_death: z.string().trim().min(1, t("forms.errors.addressRequired")).max(200),
  contact_name: z.string().trim().min(1, t("forms.errors.contactNameRequired")).max(100),
  contact_phone: z.string().trim().min(1, t("forms.errors.phoneRequired")).max(20),
  contact_email: z.string().trim().email(t("forms.errors.invalidEmail")).max(255).optional().or(z.literal("")),
  relationship: z.string().trim().min(1, t("forms.errors.relationshipRequired")),
  has_insurance: z.union([z.literal("yes"), z.literal("no"), z.literal("unknown")]),
  policy_number: z.string().trim().max(100).optional().or(z.literal("")),
  destination: z.string().trim().max(200).optional(),
  mosque: z.string().trim().max(200).optional(),
  cemetery: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});


type DossierFormData = {
  first_name: string;
  last_name: string;
  gender: "M" | "V" | "X";
  flow: "LOC" | "REP";
  address_of_death: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  relationship: string;
  has_insurance: "yes" | "no" | "unknown";
  policy_number?: string;
  destination?: string;
  mosque?: string;
  cemetery?: string;
  notes?: string;
};


export function CreateDossierDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DossierFormData, string>>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<DossierFormData>({
    first_name: "",
    last_name: "",
    gender: "M" as const,
    flow: "LOC" as const,
    address_of_death: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    relationship: "Zoon", // Default to first option to pass validation
    has_insurance: "unknown" as const,
    policy_number: "",
    destination: "",
    mosque: "",
    cemetery: "",
    notes: "",
  });

  const handleInputChange = (field: keyof DossierFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate form data
      const dossierSchema = createDossierSchema(t);
      const validatedData = dossierSchema.parse(formData);

      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("createDossier.notifications.notAuthenticated"));

      // Get user's FD organization
      const { data: userRole } = await (supabase as any)
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) {
        throw new Error(t("createDossier.notifications.noOrganization"));
      }

      const fdOrgId = userRole.organization_id;

      // Generate ref number
      const refNumber = `MAN-${Date.now()}`;
      const deceasedName = `${validatedData.first_name} ${validatedData.last_name}`;

      // Create dossier - status and tasks will be set automatically by database triggers
      const { data: dossier, error: dossierError} = await (supabase as any)
        .from("dossiers")
        .insert({
          ref_number: refNumber,
          deceased_name: deceasedName,
          deceased_first_name: validatedData.first_name,
          deceased_last_name: validatedData.last_name,
          deceased_gender: validatedData.gender,
          place_of_death: validatedData.address_of_death,
          flow: validatedData.flow,
          // Status will be set to INTAKE automatically by trigger if flow is LOC/REP
          assigned_fd_org_id: fdOrgId,
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Create family contact
      const { error: contactError } = await supabase
        .from("family_contacts")
        .insert({
          dossier_id: dossier.id,
          name: validatedData.contact_name,
          phone: validatedData.contact_phone,
          email: validatedData.contact_email || null,
          relationship: validatedData.relationship,
        });

      if (contactError) throw contactError;

      // Create claims row if insurance = yes and policy_number provided
      if (validatedData.has_insurance === 'yes' && validatedData.policy_number) {
        const { data: insurer } = await supabase
          .from("organizations")
          .select("id")
          .eq("type", "INSURER")
          .limit(1)
          .single();
        
        if (insurer) {
          const { error: claimError } = await supabase.from("claims").insert({
            dossier_id: dossier.id,
            policy_number: validatedData.policy_number,
            insurer_org_id: insurer.id,
            status: 'API_PENDING',
            source: 'MANUAL',
          });
          
          if (claimError) {
            console.error("Failed to create claim:", claimError);
          }
        }
      }

      // Store additional metadata (FD_CREATED event is logged automatically by trigger)
      await (supabase as any).from("dossier_events").insert({
        dossier_id: dossier.id,
        event_type: "INTAKE_DETAILS_ADDED",
        event_description: `Intake details toegevoegd`,
        created_by: user.id,
        metadata: {
          has_insurance: validatedData.has_insurance,
          destination: validatedData.destination,
          mosque: validatedData.mosque,
          cemetery: validatedData.cemetery,
          notes: validatedData.notes,
        },
      });

      // Get user's organization for webhook
      const { data: orgData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      // Trigger webhook for dossier creation
      if (orgData?.organization_id) {
        try {
          await supabase.functions.invoke("trigger-webhook", {
            body: {
              event_type: "DOSSIER_CREATED",
              dossier_id: dossier.id,
              organization_id: orgData.organization_id,
              metadata: {
                flow: validatedData.flow,
                deceased_name: deceasedName,
                created_by: user.id,
              },
            },
          });
        } catch (webhookError) {
          console.error("Error triggering webhook:", webhookError);
        }
      }

      // Create audit log
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: "DOSSIER_CREATED",
        target_type: "Dossier",
        target_id: dossier.id,
        description: t("createDossier.eventDescription"),
        metadata: {
          source: "MANUAL",
          flow: validatedData.flow,
          deceased_name: deceasedName,
        },
      });

      toast({
        title: t("createDossier.notifications.success"),
        description: t("createDossier.notifications.successDescription", { displayId: dossier.display_id || refNumber }),
      });

      // Reset form and close dialog
      setFormData({
        first_name: "",
        last_name: "",
        gender: "M",
        flow: "LOC",
        address_of_death: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        relationship: "",
        has_insurance: "unknown",
        policy_number: "",
        destination: "",
        mosque: "",
        cemetery: "",
        notes: "",
      });
      setOpen(false);

      // Navigate to dossier detail
      navigate(`/dossiers/${dossier.id}`);
    } catch (error: any) {
      console.error("Error creating dossier:", error);

      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Partial<Record<keyof DossierFormData, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof DossierFormData] = issue.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: t("createDossier.notifications.validationError"),
          description: t("createDossier.notifications.validationErrorDescription"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("createDossier.notifications.error"),
          description: error.message || t("createDossier.notifications.errorDescription"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("createDossier.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("createDossier.title")}</DialogTitle>
          <DialogDescription>
            {t("createDossier.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Overledene */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{t("createDossier.sections.deceased")}</h3>
            </div>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  {t("createDossier.fields.firstName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder={t("forms.placeholders.firstName")}
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Achternaam overledene <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder={t("forms.placeholders.lastName")}
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                Geslacht <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
              >
                <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="M">Man</SelectItem>
                  <SelectItem value="V">Vrouw</SelectItem>
                  <SelectItem value="X">Anders/Onbekend</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-destructive">{errors.gender}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_of_death">
                Adres van overlijden <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address_of_death"
                value={formData.address_of_death}
                onChange={(e) => handleInputChange("address_of_death", e.target.value)}
                placeholder={t("forms.placeholders.address")}
                className={errors.address_of_death ? "border-destructive" : ""}
              />
              {errors.address_of_death && (
                <p className="text-xs text-destructive">{errors.address_of_death}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="flow">
                Type uitvaart (lokaal of repatriëring) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.flow}
                onValueChange={(value) => handleInputChange("flow", value)}
              >
                <SelectTrigger className={errors.flow ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="LOC">Lokale begrafenis</SelectItem>
                  <SelectItem value="REP">Repatriëring</SelectItem>
                </SelectContent>
              </Select>
              {formData.flow === "REP" && (
                <p className="text-xs text-muted-foreground">
                  💡 Bij repatriëring: vul land van bestemming en vluchtgegevens in.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Contactpersoon */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Contactpersoon (Familie)</h3>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="contact_name">
                Naam van de contactpersoon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleInputChange("contact_name", e.target.value)}
                placeholder={t("forms.placeholders.contactName")}
                className={errors.contact_name ? "border-destructive" : ""}
              />
              {errors.contact_name && (
                <p className="text-xs text-destructive">{errors.contact_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">
                Relatie tot overledene <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.relationship}
                onValueChange={(value) => handleInputChange("relationship", value)}
              >
                <SelectTrigger className={errors.relationship ? "border-destructive" : ""}>
                  <SelectValue placeholder={t("forms.placeholders.selectRelation")} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Zoon">Zoon</SelectItem>
                  <SelectItem value="Dochter">Dochter</SelectItem>
                  <SelectItem value="Echtgenoot">Echtgenoot</SelectItem>
                  <SelectItem value="Echtgenote">Echtgenote</SelectItem>
                  <SelectItem value="Broer">Broer</SelectItem>
                  <SelectItem value="Zus">Zus</SelectItem>
                  <SelectItem value="Vader">Vader</SelectItem>
                  <SelectItem value="Moeder">Moeder</SelectItem>
                  <SelectItem value="Ander familielid">Ander familielid</SelectItem>
                  <SelectItem value="Vriend/Kennis">Vriend/Kennis</SelectItem>
                </SelectContent>
              </Select>
              {errors.relationship && (
                <p className="text-xs text-destructive">{errors.relationship}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">
                  Telefoonnummer contactpersoon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                  placeholder={t("forms.placeholders.phone")}
                  className={errors.contact_phone ? "border-destructive" : ""}
                />
                {errors.contact_phone && (
                  <p className="text-xs text-destructive">{errors.contact_phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">
                  E-mailadres (optioneel)
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange("contact_email", e.target.value)}
                  placeholder={t("forms.placeholders.email")}
                  className={errors.contact_email ? "border-destructive" : ""}
                />
                {errors.contact_email && (
                  <p className="text-xs text-destructive">{errors.contact_email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Uitvaartdetails */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Uitvaartdetails</h3>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="has_insurance">
                Verzekeringsstatus <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.has_insurance}
                onValueChange={(value) => handleInputChange("has_insurance", value)}
              >
                <SelectTrigger className={errors.has_insurance ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="yes">Verzekerd</SelectItem>
                  <SelectItem value="no">Niet verzekerd</SelectItem>
                  <SelectItem value="unknown">Onbekend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.has_insurance === "yes" && (
              <div className="space-y-2">
                <Label htmlFor="policy_number">
                  Polisnummer (indien bekend)
                </Label>
                <Input
                  id="policy_number"
                  value={formData.policy_number}
                  onChange={(e) => handleInputChange("policy_number", e.target.value)}
                  placeholder={t("forms.placeholders.policyNumber")}
                />
              </div>
            )}

            {formData.flow === "LOC" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mosque">Moskee (voor Janāza gebed)</Label>
                  <Input
                    id="mosque"
                    value={formData.mosque}
                    onChange={(e) => handleInputChange("mosque", e.target.value)}
                    placeholder={t("forms.placeholders.mosqueName")}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 De moskee kan later nog worden gewijzigd.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cemetery">Begraafplaats</Label>
                  <Input
                    id="cemetery"
                    value={formData.cemetery}
                    onChange={(e) => handleInputChange("cemetery", e.target.value)}
                    placeholder={t("forms.placeholders.cemeteryName")}
                  />
                </div>
              </>
            )}

            {formData.flow === "REP" && (
              <div className="space-y-2">
                <Label htmlFor="destination">Vluchtinformatie (indien repatriëring)</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                  placeholder={t("forms.placeholders.destination")}
                />
              </div>
            )}
          </div>

          {/* Section 4: Notities */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Interne notities</h3>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="notes">
                Interne notities (alleen zichtbaar voor FD-team)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder={t("forms.placeholders.notes")}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                💡 Deze notities zijn enkel zichtbaar voor uw team, niet voor de familie.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              title="Sluit zonder op te slaan"
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[180px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Dossier aanmaken..." : "Opslaan & dossier openen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
