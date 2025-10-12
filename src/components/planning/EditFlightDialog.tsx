import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EditFlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flightId: string;
  onSuccess?: () => void;
}

export function EditFlightDialog({ 
  open, 
  onOpenChange, 
  flightId,
  onSuccess 
}: EditFlightDialogProps) {
  const [flight, setFlight] = useState<any>(null);
  const [carrier, setCarrier] = useState("");
  const [reservationRef, setReservationRef] = useState("");
  const [airWaybill, setAirWaybill] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && flightId) {
      fetchFlight();
    }
  }, [open, flightId]);

  const fetchFlight = async () => {
    const { data, error } = await supabase
      .from("flights")
      .select(`
        *,
        repatriation:repatriations!inner(
          dossier:dossiers!inner(
            display_id,
            deceased_name
          )
        )
      `)
      .eq("id", flightId)
      .single();

    if (error) {
      toast({
        title: "Fout bij ophalen vlucht",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setFlight(data);
    setCarrier(data.carrier);
    setReservationRef(data.reservation_ref);
    setAirWaybill(data.air_waybill || "");
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("flights")
        .update({
          carrier,
          reservation_ref: reservationRef,
          air_waybill: airWaybill
        })
        .eq("id", flightId);

      if (error) throw error;

      toast({
        title: "Vlucht bijgewerkt",
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
        .from("flights")
        .delete()
        .eq("id", flightId);

      if (error) throw error;

      toast({
        title: "Vlucht verwijderd",
        description: "De vlucht is succesvol verwijderd"
      });

      // First call onSuccess to refresh the parent data
      if (onSuccess) {
        await onSuccess();
      }
      
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

  if (!flight) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vlucht bewerken</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier</Label>
              <div className="text-sm font-mono bg-muted p-2 rounded">
                {flight.repatriation?.dossier?.display_id} - {flight.repatriation?.dossier?.deceased_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vertrek</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {format(new Date(flight.depart_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aankomst</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {format(new Date(flight.arrive_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maatschappij</Label>
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Bijv. KLM"
              />
            </div>

            <div className="space-y-2">
              <Label>Reserveringsnummer</Label>
              <Input
                value={reservationRef}
                onChange={(e) => setReservationRef(e.target.value)}
                placeholder="Reserveringsnummer"
              />
            </div>

            <div className="space-y-2">
              <Label>Air Waybill (AWB)</Label>
              <Input
                value={airWaybill}
                onChange={(e) => setAirWaybill(e.target.value)}
                placeholder="AWB nummer (optioneel)"
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
            <AlertDialogTitle>Vlucht verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze vlucht wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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
