import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FamilieIdentificatie() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    preferred_language: "nl"
  });

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      toast({
        title: "Incomplete gegevens",
        description: "Vul alle verplichte velden in",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Get current dossier
      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!dossiers || dossiers.length === 0) {
        throw new Error("Geen dossier gevonden");
      }

      const dossierId = dossiers[0].id;

      // Save contact info
      const { error } = await supabase
        .from('family_contacts')
        .insert({
          dossier_id: dossierId,
          name: formData.name,
          relationship: formData.relationship,
          phone: formData.phone,
          email: formData.email,
          preferred_language: formData.preferred_language
        });

      if (error) throw error;

      toast({
        title: "Gegevens opgeslagen",
        description: "Uw identificatiegegevens zijn succesvol opgeslagen"
      });

      navigate('/familie');
    } catch (error: any) {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Identificatie Gegevens</h1>
        <p className="text-muted-foreground mt-1">Vul de identificatiegegevens van de overledene in</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uw gegevens</CardTitle>
          <CardDescription>
            Deze gegevens worden gebruikt om contact met u op te nemen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              placeholder="Volledige naam"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relatie tot overledene</Label>
            <Input
              id="relationship"
              placeholder="bijv. Zoon, Dochter, Echtgenoot"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoonnummer *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+31 6 12345678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres *</Label>
            <Input
              id="email"
              type="email"
              placeholder="naam@voorbeeld.nl"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Voorkeurstaal</Label>
            <Input
              id="language"
              placeholder="Nederlands"
              value={formData.preferred_language}
              onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Opslaan..." : "Opslaan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
