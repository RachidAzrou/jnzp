import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EditMortuariumReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  onSuccess?: () => void;
}

export function EditMortuariumReservationDialog({ 
  open, 
  onOpenChange, 
  reservationId,
  onSuccess 
}: EditMortuariumReservationDialogProps) {
  const [reservation, setReservation] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && reservationId) {
      fetchReservation();
    }
  }, [open, reservationId]);

  const fetchReservation = async () => {
    const { data, error } = await supabase
      .from("cool_cell_reservations")
      .select(`
        *,
        dossier:dossiers(display_id, deceased_name),
        cool_cell:cool_cells(label),
        facility:organizations!cool_cell_reservations_facility_org_id_fkey(name)
      `)
      .eq("id", reservationId)
      .single();

    if (error) {
      toast({
        title: "Fout bij ophalen reservering",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setReservation(data);
    setStatus(data.status);
    setNote(data.note || "");
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cool_cell_reservations")
        .update({
          status: status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
          note,
          updated_at: new Date().toISOString()
        })
        .eq("id", reservationId);

      if (error) throw error;

      toast({
        title: "Reservering bijgewerkt",
        description: "De wijzigingen zijn opgeslagen"
      });

      onSuccess?.();
      onOpenChange(false);
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

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cool_cell_reservations")
        .delete()
        .eq("id", reservationId);

      if (error) throw error;

      toast({
        title: "Reservering verwijderd",
        description: "De reservering is succesvol verwijderd"
      });

      onSuccess?.();
      setDeleteDialogOpen(false);
      onOpenChange(false);
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

  if (!reservation) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mortuarium reservering bewerken</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier</Label>
              <div className="text-sm font-mono bg-muted p-2 rounded">
                {reservation.dossier?.display_id} - {reservation.dossier?.deceased_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Locatie</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {reservation.facility?.name}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Koelcel</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {reservation.cool_cell?.label}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Datum & Tijd</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {format(new Date(reservation.start_at), "dd/MM/yyyy HH:mm")} - {format(new Date(reservation.end_at), "HH:mm")}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">In afwachting</SelectItem>
                  <SelectItem value="CONFIRMED">Bevestigd</SelectItem>
                  <SelectItem value="COMPLETED">Voltooid</SelectItem>
                  <SelectItem value="CANCELLED">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notitie</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Extra informatie..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              Verwijderen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button onClick={handleUpdate} disabled={loading}>
                {loading ? "Bezig..." : "Opslaan"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reservering verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze reservering wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? "Bezig..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
