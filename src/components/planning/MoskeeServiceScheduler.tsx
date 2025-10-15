import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Building2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MoskeeServiceSchedulerProps = {
  dossierId: string;
  onSuccess?: () => void;
};

export function MoskeeServiceScheduler({ dossierId, onSuccess }: MoskeeServiceSchedulerProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [location, setLocation] = useState("");

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
  });

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMosque || !selectedDate) {
        throw new Error("Selecteer een moskee en datum");
      }

      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase.rpc("fn_auto_schedule_janazah" as any, {
        p_dossier_id: dossierId,
        p_mosque_org_id: selectedMosque,
        p_requested: scheduledAt.toISOString(),
        p_location: location || null,
      });

      if (error) throw error;
      
      // Check result
      const result = data as any;
      if (!result?.ok) {
        throw new Error(
          result?.reason === "NO_SLOT" 
            ? "Geen beschikbaarheid op deze datum/tijd" 
            : "Inplannen mislukt"
        );
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-events"] });
      queryClient.invalidateQueries({ queryKey: ["dossier", dossierId] });
      toast({
        title: "Janazah ingepland",
        description: "De janazah is succesvol ingepland en de moskee is op de hoogte gesteld.",
      });
      setOpen(false);
      setSelectedMosque("");
      setSelectedDate(undefined);
      setLocation("");
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Fout bij inplannen",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSchedule = () => {
    if (!selectedMosque || !selectedDate) {
      toast({
        title: t("planning.mosque.incomplete"),
        description: t("planning.mosque.incompleteDesc"),
        variant: "destructive",
      });
      return;
    }
    scheduleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building2 className="mr-2 h-4 w-4" />
          Janazah Inplannen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Janazah inplannen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedMosque || !selectedDate || scheduleMutation.isPending}
              className="flex-1"
            >
              {scheduleMutation.isPending ? "Bezig..." : "Inplannen"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            De beschikbaarheid wordt automatisch gecontroleerd. Als het tijdslot niet beschikbaar is,
            krijgt u een melding.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
