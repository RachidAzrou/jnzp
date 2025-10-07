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

interface EditMosqueServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  onSuccess?: () => void;
}

export function EditMosqueServiceDialog({ 
  open, 
  onOpenChange, 
  serviceId,
  onSuccess 
}: EditMosqueServiceDialogProps) {
  const [service, setService] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && serviceId) {
      fetchService();
    }
  }, [open, serviceId]);

  const fetchService = async () => {
    const { data, error } = await supabase
      .from("janaz_services")
      .select(`
        *,
        dossier:dossiers(display_id, deceased_name)
      `)
      .eq("id", serviceId)
      .single();

    if (error) {
      toast({
        title: "Fout bij ophalen service",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setService(data);
    setStatus(data.status);
    setNotes(data.notes || "");
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("janaz_services")
        .update({
          status: status as "PENDING" | "CONFIRMED" | "COMPLETED" | "FAILED",
          notes
        })
        .eq("id", serviceId);

      if (error) throw error;

      toast({
        title: "Service bijgewerkt",
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
        .from("janaz_services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast({
        title: "Service verwijderd",
        description: "De moskee service is succesvol verwijderd"
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

  if (!service) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Moskee afspraak bewerken</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier</Label>
              <div className="text-sm font-mono bg-muted p-2 rounded">
                {service.dossier?.display_id} - {service.dossier?.deceased_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Moskee</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {service.mosque_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Datum & Tijd</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {format(new Date(service.service_date), "dd/MM/yyyy HH:mm")}
              </div>
            </div>

            {service.prayer_time && (
              <div className="space-y-2">
                <Label>Gebed</Label>
                <div className="text-sm bg-muted p-2 rounded">
                  {service.prayer_time}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">Bevestigd</SelectItem>
                  <SelectItem value="COMPLETED">Voltooid</SelectItem>
                  <SelectItem value="CANCELLED">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notities</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
            <AlertDialogTitle>Service verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze moskee service wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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
