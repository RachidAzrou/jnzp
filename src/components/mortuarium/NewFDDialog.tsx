import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const fdSchema = z.object({
  company_name: z.string().min(2, "Minimaal 2 karakters").max(120, "Maximaal 120 karakters"),
  legal_name: z.string().min(2, "Minimaal 2 karakters").max(160, "Maximaal 160 karakters"),
  business_number: z.string().regex(/^(BE)?0\d{9}$/, "Ongeldig ondernemingsnummer (BE0XXXXXXXXX)"),
  email: z.string().email("Ongeldig e-mailadres"),
  phone: z.string().min(10, "Ongeldig telefoonnummer"),
  contact_first_name: z.string().min(2, "Minimaal 2 karakters").max(60, "Maximaal 60 karakters"),
  contact_last_name: z.string().min(2, "Minimaal 2 karakters").max(80, "Maximaal 80 karakters"),
  address_street: z.string().min(2, "Minimaal 2 karakters").max(120, "Maximaal 120 karakters"),
  address_postcode: z.string().regex(/^\d{4}$/, "Ongeldige postcode (4 cijfers)"),
  address_city: z.string().min(2, "Minimaal 2 karakters").max(80, "Maximaal 80 karakters"),
  address_country: z.string().default("BE"),
  language: z.string().default("nl"),
  website: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  billing_email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, "Ongeldig IBAN").optional().or(z.literal("")),
});

interface NewFDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orgId: string) => void;
  mortuariumOrgId: string;
  mortuariumName: string;
  dossierRef: string;
}

export function NewFDDialog({
  open,
  onOpenChange,
  onSuccess,
  mortuariumOrgId,
  mortuariumName,
  dossierRef,
}: NewFDDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    legal_name: "",
    business_number: "",
    email: "",
    phone: "",
    contact_first_name: "",
    contact_last_name: "",
    address_street: "",
    address_postcode: "",
    address_city: "",
    address_country: "BE",
    language: "nl",
    website: "",
    billing_email: "",
    iban: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validatedData = fdSchema.parse(formData);

      // Call edge function to create pending FD
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("create-pending-fd", {
        body: {
          ...validatedData,
          mortuarium_org_id: mortuariumOrgId,
          mortuarium_name: mortuariumName,
          dossier_ref: dossierRef,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("FD-uitnodiging succesvol verstuurd!");
      onSuccess(data.organization_id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating FD:", error);
      if (error.errors) {
        // Zod validation errors
        error.errors.forEach((err: any) => {
          toast.error(`${err.path.join(".")}: ${err.message}`);
        });
      } else {
        toast.error(error.message || "Fout bij aanmaken van uitvaartondernemer");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe uitvaartondernemer toevoegen</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Deze FD ontvangt een uitnodiging om zich te registreren op Janazapp en wacht op goedkeuring door de platform admin.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Bedrijfsgegevens</h3>
            <div>
              <Label htmlFor="company_name">Bedrijfsnaam *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Publieke naam"
                required
              />
            </div>
            <div>
              <Label htmlFor="legal_name">Juridische naam *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Officiële naam"
                required
              />
            </div>
            <div>
              <Label htmlFor="business_number">Ondernemingsnummer *</Label>
              <Input
                id="business_number"
                value={formData.business_number}
                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                placeholder="BE0XXXXXXXXX"
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Contactgegevens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_first_name">Voornaam contactpersoon *</Label>
                <Input
                  id="contact_first_name"
                  value={formData.contact_first_name}
                  onChange={(e) => setFormData({ ...formData, contact_first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_last_name">Achternaam contactpersoon *</Label>
                <Input
                  id="contact_last_name"
                  value={formData.contact_last_name}
                  onChange={(e) => setFormData({ ...formData, contact_last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefoonnummer *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+32470123456"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Adresgegevens</h3>
            <div>
              <Label htmlFor="address_street">Straat + nr *</Label>
              <Input
                id="address_street"
                value={formData.address_street}
                onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                placeholder="Stationsstraat 12"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_postcode">Postcode *</Label>
                <Input
                  id="address_postcode"
                  value={formData.address_postcode}
                  onChange={(e) => setFormData({ ...formData, address_postcode: e.target.value })}
                  placeholder="2800"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address_city">Gemeente *</Label>
                <Input
                  id="address_city"
                  value={formData.address_city}
                  onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                  placeholder="Mechelen"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_country">Land *</Label>
                <Select
                  value={formData.address_country}
                  onValueChange={(value) => setFormData({ ...formData, address_country: value })}
                >
                  <SelectTrigger id="address_country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">België</SelectItem>
                    <SelectItem value="NL">Nederland</SelectItem>
                    <SelectItem value="FR">Frankrijk</SelectItem>
                    <SelectItem value="DE">Duitsland</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="language">Taal *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="fr">Frans</SelectItem>
                    <SelectItem value="en">Engels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Optionele gegevens</h3>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.voorbeeld.be"
              />
            </div>
            <div>
              <Label htmlFor="billing_email">Facturatie e-mail</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="BE71096123456769"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan & uitnodigen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
