import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MoskeeServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function MoskeeServiceDialog({ open, onOpenChange, onSuccess }: MoskeeServiceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDossier, setSelectedDossier] = useState<string>("");
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [location, setLocation] = useState("");

  // Fetch active dossiers from user's organization
  const { data: dossiers } = useQuery({
    queryKey: ["planning-dossiers"],
    queryFn: async () => {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      const orgIds = userRoles?.map(r => r.organization_id).filter(Boolean) || [];
      
      if (orgIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, display_id, deceased_name")
        .in('assigned_fd_org_id', orgIds)
        .eq('assignment_status', 'ASSIGNED')
        .is('deleted_at', null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch mosques
  const { data: mosques } = useQuery({
    queryKey: ["mosques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, address")
        .eq("type", "MOSQUE")
        .eq("verification_status", "ACTIVE");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create mosque service mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDossier || !selectedMosque || !selectedDate) {
        throw new Error("Selecteer een dossier, moskee en datum");
      }

      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Get mosque name for location_text
      const mosqueName = mosques?.find(m => m.id === selectedMosque)?.name || "";

      const { data, error } = await supabase
        .from("case_events")
        .insert({
          dossier_id: selectedDossier,
          event_type: "MOSQUE_SERVICE",
          scheduled_at: scheduledAt.toISOString(),
          location_text: location || mosqueName,
          status: "PLANNED",
          metadata: {
            mosque_org_id: selectedMosque
          }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-events"] });
      toast({
        title: "Moskee afspraak aangemaakt",
        description: "De afspraak is succesvol ingepland.",
      });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Fout bij aanmaken afspraak",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDossier("");
    setSelectedMosque("");
    setSelectedDate(undefined);
    setSelectedTime("14:00");
    setLocation("");
  };

  const handleCreate = () => {
    if (!selectedDossier || !selectedMosque || !selectedDate) {
      toast({
        title: "Incomplete gegevens",
        description: "Selecteer een dossier, moskee en datum",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe Moskee Afspraak</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Dossier</Label>
            <Select value={selectedDossier} onValueChange={setSelectedDossier}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer dossier..." />
              </SelectTrigger>
              <SelectContent>
                {dossiers?.map((dossier) => (
                  <SelectItem key={dossier.id} value={dossier.id}>
                    {dossier.display_id} - {dossier.deceased_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Moskee</Label>
            <Select value={selectedMosque} onValueChange={setSelectedMosque}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer moskee..." />
              </SelectTrigger>
              <SelectContent>
                {mosques?.map((mosque) => (
                  <SelectItem key={mosque.id} value={mosque.id}>
                    {mosque.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Datum & Tijd</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: nl }) : "Kies datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>

              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div>
            <Label>Locatie (optioneel)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Hoofdgebouw, zaal A"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedDossier || !selectedMosque || !selectedDate || createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? "Bezig..." : "Aanmaken"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}