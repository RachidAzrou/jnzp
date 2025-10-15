import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format, addHours, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MortuariumReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MortuariumReservationDialog({ open, onOpenChange, onSuccess }: MortuariumReservationDialogProps) {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [mortuariums, setMortuariums] = useState<any[]>([]);
  const [coolCells, setCoolCells] = useState<any[]>([]);
  const [selectedDossier, setSelectedDossier] = useState("");
  const [selectedMortuarium, setSelectedMortuarium] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedCoolCell, setSelectedCoolCell] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      fetchDossiers();
      fetchMortuariums();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMortuarium && selectedDate) {
      fetchCoolCells();
    }
  }, [selectedMortuarium, selectedDate]);

  const fetchDossiers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's organization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole?.organization_id) return;

    const { data } = await supabase
      .from("dossiers")
      .select("id, display_id, deceased_name")
      .eq("assigned_fd_org_id", userRole.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    setDossiers(data || []);
  };

  const fetchMortuariums = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("type", "MORTUARIUM")
      .eq("verification_status", "ACTIVE");
    setMortuariums(data || []);
  };

  const fetchCoolCells = async () => {
    if (!selectedMortuarium || !selectedDate) return;

    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);

    // Get all cool cells for this mortuarium
    const { data: allCells } = await supabase
      .from("cool_cells")
      .select("id, label, status")
      .eq("facility_org_id", selectedMortuarium)
      .eq("status", "FREE");

    // Get reservations for the selected date
    const { data: reservations } = await supabase
      .from("cool_cell_reservations")
      .select("cool_cell_id")
      .eq("facility_org_id", selectedMortuarium)
      .gte("start_at", startOfSelectedDay.toISOString())
      .lte("end_at", endOfSelectedDay.toISOString())
      .neq("status", "CANCELLED");

    const reservedCellIds = new Set(reservations?.map(r => r.cool_cell_id) || []);
    const availableCells = (allCells || []).map(cell => ({
      ...cell,
      available: !reservedCellIds.has(cell.id)
    }));

    setCoolCells(availableCells);
  };

  const handleSubmit = async () => {
    if (!selectedDossier || !selectedMortuarium || !selectedDate || !selectedCoolCell) {
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

      const [startHour, startMinute] = startTime.split(':');
      const [endHour, endMinute] = endTime.split(':');
      
      const startAt = new Date(selectedDate);
      startAt.setHours(parseInt(startHour), parseInt(startMinute));
      
      const endAt = new Date(selectedDate);
      endAt.setHours(parseInt(endHour), parseInt(endMinute));

      const { error } = await supabase
        .from("cool_cell_reservations")
        .insert({
          dossier_id: selectedDossier,
          facility_org_id: selectedMortuarium,
          cool_cell_id: selectedCoolCell,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: "PENDING",
          note,
          created_by_user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Reservering aangemaakt",
        description: "Het mortuarium ontvangt een melding"
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
    setSelectedMortuarium("");
    setSelectedDate(undefined);
    setSelectedCoolCell("");
    setStartTime("08:00");
    setEndTime("10:00");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("mortuariumReservation.title")}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Dossier selectie */}
            <div className="space-y-2">
              <Label>{t("mortuariumReservation.dossier")}</Label>
              <Select value={selectedDossier} onValueChange={setSelectedDossier}>
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.selectDossier2")} />
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

            {/* Mortuarium selectie */}
            <div className="space-y-2">
              <Label>{t("mortuariumReservation.mortuarium")}</Label>
              <Select value={selectedMortuarium} onValueChange={setSelectedMortuarium}>
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.selectMortuarium")} />
                </SelectTrigger>
                <SelectContent>
                  {mortuariums.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datum selectie */}
            <div className="space-y-2">
              <Label>{t("mortuariumReservation.date")}</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={nl}
                className="rounded-md border"
              />
            </div>

            {/* Tijd selectie */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("mortuariumReservation.from")}</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("mortuariumReservation.to")}</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Koelcel selectie */}
            {coolCells.length > 0 && (
              <div className="space-y-2">
                <Label>{t("mortuariumReservation.coolCell")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {coolCells.map(cell => (
                    <Button
                      key={cell.id}
                      variant={selectedCoolCell === cell.id ? "default" : "outline"}
                      className="relative"
                      disabled={!cell.available}
                      onClick={() => setSelectedCoolCell(cell.id)}
                    >
                      {cell.label}
                      {!cell.available && (
                        <Badge variant="destructive" className="ml-2">
                          Bezet
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Notitie */}
            <div className="space-y-2">
              <Label>{t("mortuariumReservation.note")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("placeholders.extraInfoMortuarium")}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}