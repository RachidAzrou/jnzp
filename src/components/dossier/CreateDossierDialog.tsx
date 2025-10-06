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
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";

// Validation schema - errors are shown via translation keys
const dossierSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  flow: z.union([z.literal("LOC"), z.literal("REP")]),
  place_of_death: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(50),
  has_insurance: z.union([z.literal("yes"), z.literal("no"), z.literal("unknown")]),
  destination: z.string().trim().max(200).optional(),
  mosque: z.string().trim().max(200).optional(),
  cemetery: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type DossierFormData = z.infer<typeof dossierSchema>;

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
    flow: "LOC" as const,
    place_of_death: "",
    contact_name: "",
    relationship: "",
    has_insurance: "unknown" as const,
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

      // Create dossier
      const { data: dossier, error: dossierError } = await (supabase as any)
        .from("dossiers")
        .insert({
          ref_number: refNumber,
          deceased_name: deceasedName,
          flow: validatedData.flow,
          status: "created",
          assigned_fd_org_id: fdOrgId,
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Create dossier_fd assignment with source='MANUAL'
      const { error: assignError } = await (supabase as any)
        .from("dossier_fd")
        .insert({
          dossier_id: dossier.id,
          fd_org_id: fdOrgId,
          source: "MANUAL",
          assigned_by: user.id,
        });

      if (assignError) throw assignError;

      // Create family contact
      const { error: contactError } = await supabase
        .from("family_contacts")
        .insert({
          dossier_id: dossier.id,
          name: validatedData.contact_name,
          relationship: validatedData.relationship,
        });

      if (contactError) throw contactError;

      // Create dossier event for manual creation
      await (supabase as any).from("dossier_events").insert({
        dossier_id: dossier.id,
        event_type: "DOSSIER_CREATED_MANUALLY",
        event_description: `Dossier handmatig aangemaakt door FD`,
        created_by: user.id,
        metadata: {
          place_of_death: validatedData.place_of_death,
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
        description: "Dossier handmatig aangemaakt",
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
        flow: "LOC",
        place_of_death: "",
        contact_name: "",
        relationship: "",
        has_insurance: "unknown",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createDossier.title")}</DialogTitle>
          <DialogDescription>
            {t("createDossier.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Naam van overledene */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {t("createDossier.firstName")} <span className="text-destructive">{t("createDossier.required")}</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder={t("createDossier.placeholders.firstName")}
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{t("createDossier.validation.firstNameRequired")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                {t("createDossier.lastName")} <span className="text-destructive">{t("createDossier.required")}</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder={t("createDossier.placeholders.lastName")}
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{t("createDossier.validation.lastNameRequired")}</p>
              )}
            </div>
          </div>

          {/* Type uitvaart */}
          <div className="space-y-2">
            <Label htmlFor="flow">
              {t("createDossier.flowType")} <span className="text-destructive">{t("createDossier.required")}</span>
            </Label>
            <Select
              value={formData.flow}
              onValueChange={(value) => handleInputChange("flow", value)}
            >
              <SelectTrigger className={errors.flow ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOC">{t("createDossier.flow.local")}</SelectItem>
                <SelectItem value="REP">{t("createDossier.flow.repatriation")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.flow && <p className="text-xs text-destructive">{errors.flow}</p>}
          </div>

          {/* Plaats overlijden */}
          <div className="space-y-2">
            <Label htmlFor="place_of_death">
              {t("createDossier.placeOfDeath")} <span className="text-destructive">{t("createDossier.required")}</span>
            </Label>
            <Input
              id="place_of_death"
              value={formData.place_of_death}
              onChange={(e) => handleInputChange("place_of_death", e.target.value)}
              placeholder={t("createDossier.placeholders.placeOfDeath")}
              className={errors.place_of_death ? "border-destructive" : ""}
            />
            {errors.place_of_death && (
              <p className="text-xs text-destructive">{t("createDossier.validation.placeOfDeathRequired")}</p>
            )}
          </div>

          {/* Contactpersoon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">
                {t("createDossier.contactName")} <span className="text-destructive">{t("createDossier.required")}</span>
              </Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleInputChange("contact_name", e.target.value)}
                placeholder={t("createDossier.placeholders.contactName")}
                className={errors.contact_name ? "border-destructive" : ""}
              />
              {errors.contact_name && (
                <p className="text-xs text-destructive">{t("createDossier.validation.contactNameRequired")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">
                {t("createDossier.relationship")} <span className="text-destructive">{t("createDossier.required")}</span>
              </Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => handleInputChange("relationship", e.target.value)}
                placeholder={t("createDossier.placeholders.relationship")}
                className={errors.relationship ? "border-destructive" : ""}
              />
              {errors.relationship && (
                <p className="text-xs text-destructive">{t("createDossier.validation.relationshipRequired")}</p>
              )}
            </div>
          </div>

          {/* Verzekering */}
          <div className="space-y-2">
            <Label htmlFor="has_insurance">
              {t("createDossier.insurance")} <span className="text-destructive">{t("createDossier.required")}</span>
            </Label>
            <Select
              value={formData.has_insurance}
              onValueChange={(value) => handleInputChange("has_insurance", value)}
            >
              <SelectTrigger className={errors.has_insurance ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t("createDossier.insuranceOptions.yes")}</SelectItem>
                <SelectItem value="no">{t("createDossier.insuranceOptions.no")}</SelectItem>
                <SelectItem value="unknown">{t("createDossier.insuranceOptions.unknown")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.has_insurance && (
              <p className="text-xs text-destructive">{errors.has_insurance}</p>
            )}
          </div>

          {/* Optionele velden */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">{t("createDossier.optionalInfo")}</p>

            {formData.flow === "REP" && (
              <div className="space-y-2 mb-3">
                <Label htmlFor="destination">{t("createDossier.destination")}</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                  placeholder={t("createDossier.placeholders.destination")}
                />
              </div>
            )}

            {formData.flow === "LOC" && (
              <>
                <div className="space-y-2 mb-3">
                  <Label htmlFor="mosque">{t("createDossier.mosque")}</Label>
                  <Input
                    id="mosque"
                    value={formData.mosque}
                    onChange={(e) => handleInputChange("mosque", e.target.value)}
                    placeholder={t("createDossier.placeholders.mosque")}
                  />
                </div>

                <div className="space-y-2 mb-3">
                  <Label htmlFor="cemetery">{t("createDossier.cemetery")}</Label>
                  <Input
                    id="cemetery"
                    value={formData.cemetery}
                    onChange={(e) => handleInputChange("cemetery", e.target.value)}
                    placeholder={t("createDossier.placeholders.cemetery")}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">{t("createDossier.notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder={t("createDossier.placeholders.notes")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("createDossier.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("createDossier.buttons.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
