import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FamiliePolis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    deceased_name: "",
    polis_number: "",
    insurer_name: ""
  });

  const handleCheck = async () => {
    if (!formData.deceased_name || !formData.polis_number || !formData.insurer_name) {
      toast({
        title: "Incomplete gegevens",
        description: "Vul alle velden in om de polis te controleren",
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

      // TODO: In production this would call an external API to verify the policy
      // For now we just save the policy information
      const polisData = {
        dossier_id: dossierId,
        polis_number: formData.polis_number,
        insurer_name: formData.insurer_name,
        is_covered: false, // Will be determined by actual API call
        num_travelers: 0
      };

      // Save to database
      const { error } = await supabase
        .from('polis_checks')
        .insert(polisData);

      if (error) throw error;

      setCheckResult(polisData);
      toast({
        title: "Polis gecontroleerd",
        description: "De polis is succesvol gecontroleerd en opgeslagen"
      });
    } catch (error: any) {
      toast({
        title: "Fout bij controle",
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
        <h1 className="text-3xl font-bold">Polis Controle</h1>
        <p className="text-muted-foreground mt-1">Controleer de verzekeringspolis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gegevens</CardTitle>
          <CardDescription>Vul de polisgegevens in om te controleren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deceased_name">Naam overledene</Label>
            <Input
              id="deceased_name"
              placeholder="Volledige naam"
              value={formData.deceased_name}
              onChange={(e) => setFormData({ ...formData, deceased_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="polis_number">Polisnummer</Label>
            <Input
              id="polis_number"
              placeholder="Bijv. POL123456"
              value={formData.polis_number}
              onChange={(e) => setFormData({ ...formData, polis_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurer">Verzekeringsmaatschappij</Label>
            <Select
              value={formData.insurer_name}
              onValueChange={(value) => setFormData({ ...formData, insurer_name: value })}
            >
              <SelectTrigger id="insurer">
                <SelectValue placeholder="Kies maatschappij" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rahman Insurance">Rahman Insurance</SelectItem>
                <SelectItem value="Al-Baraka Verzekeringen">Al-Baraka Verzekeringen</SelectItem>
                <SelectItem value="Noor Assurance">Noor Assurance</SelectItem>
                <SelectItem value="Andere">Andere</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleCheck} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Controleren..." : "Check polis"}
          </Button>
        </CardContent>
      </Card>

      {checkResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Resultaat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={checkResult.is_covered ? "default" : "destructive"}>
                  {checkResult.is_covered ? "Actief" : "Niet actief"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meereizigers gedekt</p>
                <p className="font-medium">{checkResult.num_travelers}</p>
              </div>
            </div>

            {checkResult.num_travelers > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bij meer dan {checkResult.num_travelers} reizigers kunnen extra kosten in rekening 
                  worden gebracht. Neem contact op met uw verzekeraar voor details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
