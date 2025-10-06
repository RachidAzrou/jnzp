import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReleaseDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  dossierDisplayId: string;
  onSuccess?: () => void;
}

const RELEASE_REASONS = [
  { value: "no_capacity", label: "Geen capaciteit" },
  { value: "geographical", label: "Geografisch niet haalbaar" },
  { value: "family_request", label: "Familie verzoek" },
  { value: "service_mismatch", label: "Dienstverlening komt niet overeen" },
  { value: "other", label: "Andere reden" },
];

export default function ReleaseDossierDialog({
  open,
  onOpenChange,
  dossierId,
  dossierDisplayId,
  onSuccess,
}: ReleaseDossierDialogProps) {
  const [releasing, setReleasing] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleRelease = async () => {
    if (!reason) {
      toast.error("Selecteer een reden");
      return;
    }

    const finalReason = reason === "other" ? customReason : RELEASE_REASONS.find(r => r.value === reason)?.label || "";
    
    if (!finalReason.trim()) {
      toast.error("Voer een reden in");
      return;
    }

    setReleasing(true);
    try {
      const { data, error } = await supabase.rpc("release_dossier", {
        p_dossier_id: dossierId,
        p_action: "FD_RELEASE",
        p_reason: finalReason,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success("Dossier vrijgegeven. Familie is op de hoogte gebracht.");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result?.error || "Fout bij vrijgeven");
      }
    } catch (err: any) {
      console.error("Release error:", err);
      toast.error("Fout bij vrijgeven: " + err.message);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dossier vrijgeven</DialogTitle>
          <DialogDescription>
            U staat op het punt dossier {dossierDisplayId} vrij te geven. 
            Het dossier wordt beschikbaar voor andere uitvaartondernemingen en de familie wordt geïnformeerd.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reden *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Selecteer een reden" />
              </SelectTrigger>
              <SelectContent>
                {RELEASE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Andere reden *</Label>
              <Textarea
                id="customReason"
                placeholder="Omschrijf de reden..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={handleRelease} disabled={releasing}>
            {releasing ? "Vrijgeven..." : "Dossier vrijgeven"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
