import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";

interface FlightPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Passenger {
  name: string;
  departureCountry: string;
  departureCity: string;
  departureAirport: string;
}

export function FlightPlanningDialog({ open, onOpenChange, onSuccess }: FlightPlanningDialogProps) {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [selectedDossier, setSelectedDossier] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationAirport, setDestinationAirport] = useState("");
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", departureCountry: "", departureCity: "", departureAirport: "" }
  ]);
  const [coffin, setCoffin] = useState({
    departureCountry: "",
    departureCity: "",
    departureAirport: ""
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDossiers();
    }
  }, [open]);

  const fetchDossiers = async () => {
    const { data } = await supabase
      .from("dossiers")
      .select("id, display_id, deceased_name")
      .eq("flow", "REP") // Only repatriation dossiers
      .order("created_at", { ascending: false })
      .limit(50);
    setDossiers(data || []);
  };

  const addPassenger = () => {
    setPassengers([
      ...passengers,
      { name: "", departureCountry: "", departureCity: "", departureAirport: "" }
    ]);
  };

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleSubmit = async () => {
    if (!selectedDossier || !destinationCountry || !destinationCity || !destinationAirport) {
      toast({
        title: "Vul de verplichte velden in",
        description: "Bestemming is verplicht",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      // First, get or create a repatriation record for this dossier
      let { data: repatriation, error: repError } = await supabase
        .from("repatriations")
        .select("id")
        .eq("dossier_id", selectedDossier)
        .maybeSingle();

      if (repError) throw repError;

      // If no repatriation exists, create one
      if (!repatriation) {
        const { data: newRep, error: createRepError } = await supabase
          .from("repatriations")
          .insert({
            dossier_id: selectedDossier,
            dest_country: destinationCountry,
            dest_city: destinationCity,
            dest_address: destinationAirport
          })
          .select()
          .single();

        if (createRepError) throw createRepError;
        repatriation = newRep;
      }

      // Store flight preferences as notes for now
      const preferencesNote = `Vluchtvoorkeuren:
Bestemming: ${destinationCountry}, ${destinationCity} (${destinationAirport})

Medereizigers (${passengers.filter(p => p.name).length}):
${passengers.filter(p => p.name).map((p, i) => 
  `${i + 1}. ${p.name} - Van ${p.departureCity}, ${p.departureCountry} (${p.departureAirport})`
).join('\n')}

Kist vervoer: Van ${coffin.departureCity}, ${coffin.departureCountry} (${coffin.departureAirport})

${notes ? `Extra notities: ${notes}` : ''}`;

      // Update repatriation with note
      const { error: updateError } = await supabase
        .from("repatriations")
        .update({
          dest_country: destinationCountry,
          dest_city: destinationCity,
          dest_address: `${destinationAirport} - ${preferencesNote}`
        })
        .eq("id", repatriation.id);

      if (updateError) throw updateError;

      toast({
        title: "Vluchtvoorkeuren opgeslagen",
        description: "De voorkeuren zijn geregistreerd voor verdere planning"
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDossier("");
    setDestinationCountry("");
    setDestinationCity("");
    setDestinationAirport("");
    setPassengers([{ name: "", departureCountry: "", departureCity: "", departureAirport: "" }]);
    setCoffin({ departureCountry: "", departureCity: "", departureAirport: "" });
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Vluchtplanning voorkeuren</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Dossier selectie */}
            <div className="space-y-2">
              <Label>Dossier (Repatriëring)</Label>
              <Select value={selectedDossier} onValueChange={setSelectedDossier}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een repatriëring dossier" />
                </SelectTrigger>
                <SelectContent>
                  {dossiers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.display_id} - {d.deceased_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bestemming */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Bestemming</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Land *</Label>
                  <Input
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    placeholder="Bijv. Marokko"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stad *</Label>
                  <Input
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="Bijv. Casablanca"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Luchthaven *</Label>
                  <Input
                    value={destinationAirport}
                    onChange={(e) => setDestinationAirport(e.target.value)}
                    placeholder="Bijv. CMN"
                  />
                </div>
              </div>
            </div>

            {/* Medereizigers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Medereizigers</Label>
                <Button type="button" size="sm" onClick={addPassenger}>
                  <Plus className="h-4 w-4 mr-2" />
                  Toevoegen
                </Button>
              </div>
              
              {passengers.map((passenger, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Passagier {index + 1}</Label>
                    {passengers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePassenger(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Naam</Label>
                      <Input
                        value={passenger.name}
                        onChange={(e) => updatePassenger(index, "name", e.target.value)}
                        placeholder="Naam passagier"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vertrek land</Label>
                      <Input
                        value={passenger.departureCountry}
                        onChange={(e) => updatePassenger(index, "departureCountry", e.target.value)}
                        placeholder="Bijv. België"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vertrek stad</Label>
                      <Input
                        value={passenger.departureCity}
                        onChange={(e) => updatePassenger(index, "departureCity", e.target.value)}
                        placeholder="Bijv. Brussel"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Vertrek luchthaven</Label>
                      <Input
                        value={passenger.departureAirport}
                        onChange={(e) => updatePassenger(index, "departureAirport", e.target.value)}
                        placeholder="Bijv. BRU"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Kist vervoer */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Vervoer kist</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Vertrek land</Label>
                    <Input
                      value={coffin.departureCountry}
                      onChange={(e) => setCoffin({ ...coffin, departureCountry: e.target.value })}
                      placeholder="Bijv. België"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vertrek stad</Label>
                    <Input
                      value={coffin.departureCity}
                      onChange={(e) => setCoffin({ ...coffin, departureCity: e.target.value })}
                      placeholder="Bijv. Brussel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vertrek luchthaven</Label>
                    <Input
                      value={coffin.departureAirport}
                      onChange={(e) => setCoffin({ ...coffin, departureAirport: e.target.value })}
                      placeholder="Bijv. BRU"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notities */}
            <div className="space-y-2">
              <Label>Extra notities</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Speciale wensen of opmerkingen..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Bezig..." : "Voorkeuren opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}