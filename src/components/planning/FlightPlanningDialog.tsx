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
import { Plus, Trash2, Upload, X } from "lucide-react";

interface FlightPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Passenger {
  name: string;
}

interface Attachment {
  file: File;
  uploading: boolean;
}

export function FlightPlanningDialog({ open, onOpenChange, onSuccess }: FlightPlanningDialogProps) {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [selectedDossier, setSelectedDossier] = useState("");
  
  // General departure/destination (applies to all)
  const [departureCountry, setDepartureCountry] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationAirport, setDestinationAirport] = useState("");
  
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: "" }]);
  
  const [coffin, setCoffin] = useState({
    departureCountry: "",
    departureCity: "",
    departureAirport: "",
    destinationCountry: "",
    destinationCity: "",
    destinationAirport: ""
  });
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
    setPassengers([...passengers, { name: "" }]);
  };

  const removePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      file,
      uploading: false
    }));
    
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDossier || !departureCountry || !departureCity || !destinationCountry || !destinationCity) {
      toast({
        title: "Vul de verplichte velden in",
        description: "Vertrek en bestemming zijn verplicht",
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

      // Upload attachments
      const uploadedFiles: string[] = [];
      for (const attachment of attachments) {
        const fileName = `${repatriation.id}/${Date.now()}_${attachment.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('flight-attachments')
          .upload(fileName, attachment.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Store file path only - signed URLs will be generated on-demand for security

        // Save attachment record
        await supabase
          .from('flight_attachments')
          .insert({
            repatriation_id: repatriation.id,
            file_name: attachment.file.name,
            file_url: fileName, // Store path, not public URL
            file_size: attachment.file.size,
            uploaded_by: user.id
          });

        uploadedFiles.push(attachment.file.name);
      }

      // Store flight preferences as notes
      const preferencesNote = `Vluchtvoorkeuren:
Algemeen:
- Vertrek: ${departureCountry}, ${departureCity} (${departureAirport || 'N/A'})
- Bestemming: ${destinationCountry}, ${destinationCity} (${destinationAirport || 'N/A'})

Medereizigers (${passengers.filter(p => p.name).length}):
${passengers.filter(p => p.name).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}

Kist vervoer:
- Van: ${coffin.departureCity || departureCity}, ${coffin.departureCountry || departureCountry} (${coffin.departureAirport || departureAirport || 'N/A'})
- Naar: ${coffin.destinationCity || destinationCity}, ${coffin.destinationCountry || destinationCountry} (${coffin.destinationAirport || destinationAirport || 'N/A'})

${uploadedFiles.length > 0 ? `Bijlagen (${uploadedFiles.length}): ${uploadedFiles.join(', ')}` : ''}
${notes ? `\nExtra notities: ${notes}` : ''}`;

      // Update repatriation with preferences
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
        description: `Voorkeuren geregistreerd${uploadedFiles.length > 0 ? ` met ${uploadedFiles.length} bijlage(n)` : ''}`
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
    setDepartureCountry("");
    setDepartureCity("");
    setDepartureAirport("");
    setDestinationCountry("");
    setDestinationCity("");
    setDestinationAirport("");
    setPassengers([{ name: "" }]);
    setCoffin({ 
      departureCountry: "", 
      departureCity: "", 
      departureAirport: "",
      destinationCountry: "",
      destinationCity: "",
      destinationAirport: ""
    });
    setAttachments([]);
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

            {/* Vertrek (algemeen) */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Vertrek (algemeen voor alle reizigers)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Land *</Label>
                  <Input
                    value={departureCountry}
                    onChange={(e) => setDepartureCountry(e.target.value)}
                    placeholder="Bijv. België"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stad *</Label>
                  <Input
                    value={departureCity}
                    onChange={(e) => setDepartureCity(e.target.value)}
                    placeholder="Bijv. Brussel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Luchthaven</Label>
                  <Input
                    value={departureAirport}
                    onChange={(e) => setDepartureAirport(e.target.value)}
                    placeholder="Bijv. BRU"
                  />
                </div>
              </div>
            </div>

            {/* Bestemming (algemeen) */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Bestemming (algemeen voor alle reizigers)</Label>
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
                  <Label>Luchthaven</Label>
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
                <div key={index} className="border rounded-lg p-4">
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
                  
                  <div className="mt-3">
                    <Input
                      value={passenger.name}
                      onChange={(e) => updatePassenger(index, "name", e.target.value)}
                      placeholder="Naam passagier"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Kist vervoer */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Vervoer kist (optioneel - anders algemeen)</Label>
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Vertrek</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      value={coffin.departureCountry}
                      onChange={(e) => setCoffin({ ...coffin, departureCountry: e.target.value })}
                      placeholder="Land (of algemeen)"
                    />
                    <Input
                      value={coffin.departureCity}
                      onChange={(e) => setCoffin({ ...coffin, departureCity: e.target.value })}
                      placeholder="Stad (of algemeen)"
                    />
                    <Input
                      value={coffin.departureAirport}
                      onChange={(e) => setCoffin({ ...coffin, departureAirport: e.target.value })}
                      placeholder="Luchthaven"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">Bestemming</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      value={coffin.destinationCountry}
                      onChange={(e) => setCoffin({ ...coffin, destinationCountry: e.target.value })}
                      placeholder="Land (of algemeen)"
                    />
                    <Input
                      value={coffin.destinationCity}
                      onChange={(e) => setCoffin({ ...coffin, destinationCity: e.target.value })}
                      placeholder="Stad (of algemeen)"
                    />
                    <Input
                      value={coffin.destinationAirport}
                      onChange={(e) => setCoffin({ ...coffin, destinationAirport: e.target.value })}
                      placeholder="Luchthaven"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bijlagen */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Bijlagen</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md cursor-pointer hover:bg-secondary/80"
                  >
                    <Upload className="h-4 w-4" />
                    Bestand toevoegen
                  </Label>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate flex-1">{attachment.file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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