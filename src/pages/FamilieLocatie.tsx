import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LocationType = 'HOME' | 'HOSPITAL' | 'OTHER';

export default function FamilieLocatie() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    location_type: 'HOME' as LocationType,
    address: "",
    floor: ""
  });

  const handleSave = async () => {
    if (!formData.address) {
      toast({
        title: "Adres vereist",
        description: "Vul een adres in",
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

      // Save location to medical_docs table
      const { error } = await supabase
        .from('medical_docs')
        .insert([{
          dossier_id: dossierId,
          location_type: formData.location_type,
          address: formData.address,
          floor: formData.floor || undefined,
          notes: undefined
        }]);

      if (error) throw error;

      toast({
        title: "Locatie opgeslagen",
        description: "De locatiegegevens zijn succesvol opgeslagen"
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
        <h1 className="text-3xl font-bold">Locatie Informatie</h1>
        <p className="text-muted-foreground mt-1">Geef de locatie van de overledene op</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locatiegegevens</CardTitle>
          <CardDescription>Deze informatie helpt de uitvaartondernemer bij het ophalen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Type locatie</Label>
            <RadioGroup
              value={formData.location_type}
              onValueChange={(value: LocationType) => 
                setFormData({ ...formData, location_type: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HOME" id="home" />
                <Label htmlFor="home" className="font-normal cursor-pointer">Thuis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HOSPITAL" id="hospital" />
                <Label htmlFor="hospital" className="font-normal cursor-pointer">Ziekenhuis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OTHER" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">Andere</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres *</Label>
            <Input
              id="address"
              placeholder="Straat, nummer, postcode, plaats"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor">Verdieping (optioneel)</Label>
            <Input
              id="floor"
              placeholder="bijv. 3e verdieping, appartement 12"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Opslaan..." : "Opslaan"}
            </Button>
            <Button variant="outline" className="flex-1">
              <MapPin className="h-4 w-4 mr-2" />
              Deel live-locatie
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
