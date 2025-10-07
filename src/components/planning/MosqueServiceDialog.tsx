import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MosqueServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PRAYER_TIMES = [
  { value: "FAJR", label: "Fajr (Ochtendgebed)" },
  { value: "DHUHR", label: "Dhuhr (Middaggebed)" },
  { value: "ASR", label: "Asr (Middaggebed)" },
  { value: "MAGHRIB", label: "Maghrib (Avondgebed)" },
  { value: "ISHA", label: "Isha (Nachtgebed)" },
  { value: "JUMAH", label: "Jumah (Vrijdaggebed)" }
];

export function MosqueServiceDialog({ open, onOpenChange, onSuccess }: MosqueServiceDialogProps) {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [mosques, setMosques] = useState<any[]>([]);
  const [selectedDossier, setSelectedDossier] = useState("");
  const [searchMosque, setSearchMosque] = useState("");
  const [selectedMosque, setSelectedMosque] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedPrayer, setSelectedPrayer] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDossiers();
      fetchMosques();
    }
  }, [open]);

  const fetchDossiers = async () => {
    const { data } = await supabase
      .from("dossiers")
      .select("id, display_id, deceased_name")
      .order("created_at", { ascending: false })
      .limit(50);
    setDossiers(data || []);
  };

  const fetchMosques = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, address_line1, city")
      .eq("type", "MOSQUE")
      .eq("verification_status", "ACTIVE");
    setMosques(data || []);
  };

  const filteredMosques = mosques.filter(m => 
    m.name.toLowerCase().includes(searchMosque.toLowerCase()) ||
    m.city?.toLowerCase().includes(searchMosque.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedDossier || !selectedMosque || !selectedDate || !selectedPrayer) {
      toast({
        title: "Vul alle velden in",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      // Service datum/tijd samenstellen
      const serviceDate = new Date(selectedDate);
      
      const { error } = await supabase
        .from("janaz_services")
        .insert({
          dossier_id: selectedDossier,
          mosque_org_id: selectedMosque.id,
          mosque_name: selectedMosque.name,
          service_date: serviceDate.toISOString(),
          status: "CONFIRMED", // Standaard goedgekeurd zoals gevraagd
          notes,
          prayer_time: selectedPrayer
        });

      if (error) throw error;

      toast({
        title: "Moskee afspraak aangemaakt",
        description: "De moskee ontvangt een melding"
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
    setSearchMosque("");
    setSelectedMosque(null);
    setSelectedDate(undefined);
    setSelectedPrayer("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nieuwe moskee afspraak</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Dossier selectie */}
            <div className="space-y-2">
              <Label>Dossier</Label>
              <Select value={selectedDossier} onValueChange={setSelectedDossier}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een dossier" />
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

            {/* Moskee zoeken */}
            <div className="space-y-2">
              <Label>Moskee zoeken</Label>
              <Input
                placeholder="Zoek op naam of stad..."
                value={searchMosque}
                onChange={(e) => setSearchMosque(e.target.value)}
              />
              {searchMosque && (
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredMosques.map(mosque => (
                      <Button
                        key={mosque.id}
                        variant={selectedMosque?.id === mosque.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedMosque(mosque)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{mosque.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {mosque.address_line1}, {mosque.city}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Datum selectie */}
            <div className="space-y-2">
              <Label>Datum</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={nl}
                className="rounded-md border"
              />
            </div>

            {/* Gebed selectie */}
            <div className="space-y-2">
              <Label>Gebedstijd</Label>
              <Select value={selectedPrayer} onValueChange={setSelectedPrayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een gebed" />
                </SelectTrigger>
                <SelectContent>
                  {PRAYER_TIMES.map(prayer => (
                    <SelectItem key={prayer.value} value={prayer.value}>
                      {prayer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notities */}
            <div className="space-y-2">
              <Label>Notities (optioneel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra informatie..."
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Bezig..." : "Afspraak maken"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}