import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";

interface BlockDossierDialogProps {
  dossierId: string;
  dossierRef: string;
  onSuccess?: () => void;
}

export function BlockDossierDialog({ dossierId, dossierRef, onSuccess }: BlockDossierDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor het blokkeren van dit dossier.",
        variant: "destructive",
      });
      return;
    }

    setIsBlocking(true);
    try {
      const { error } = await supabase.rpc('insurer_block_dossier', {
        p_dossier_id: dossierId,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      toast({
        title: "✅ Dossier geblokkeerd",
        description: `Dossier ${dossierRef} is succesvol geblokkeerd.`,
      });

      setOpen(false);
      setReason("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error blocking dossier:', error);
      toast({
        title: "Fout bij blokkeren",
        description: error.message || "Er is een fout opgetreden bij het blokkeren van het dossier.",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <ShieldAlert className="h-4 w-4 mr-2" />
          Blokkeer Dossier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dossier Blokkeren</DialogTitle>
          <DialogDescription>
            U staat op het punt dossier <strong>{dossierRef}</strong> te blokkeren.
            Dit plaatst een legal hold op het dossier en blokkeert de claim.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reden voor blokkade *</Label>
            <Textarea
              id="reason"
              placeholder="Geef een gedetailleerde reden op voor het blokkeren van dit dossier..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Deze reden wordt gelogd in het audit trail en is zichtbaar voor de uitvaartondernemer.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isBlocking}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={isBlocking}>
            {isBlocking ? "Blokkeren..." : "Bevestig Blokkade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
