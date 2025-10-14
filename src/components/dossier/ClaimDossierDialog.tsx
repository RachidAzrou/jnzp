import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ClaimDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: {
    id: string;
    display_id: string;
    deceased_name: string;
    deceased_gender?: string;
    date_of_death?: string;
    flow: string;
    status: string;
  };
  onClaimed?: () => void;
}

export function ClaimDossierDialog({ open, onOpenChange, dossier, onClaimed }: ClaimDossierDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("claim_dossier", {
        p_dossier_id: dossier.id,
        p_note: note || null,
        p_require_family_approval: true,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; requires_approval?: boolean };

      if (!result.success) {
        throw new Error(result.error || "Failed to claim dossier");
      }

      if (result.requires_approval) {
        toast({
          title: t("toasts.success.claimRequested"),
          description: t("toasts.success.claimRequestedDesc"),
        });
      } else {
        toast({
          title: t("toasts.success.dossierClaimed"),
          description: t("toasts.success.dossierClaimedDesc"),
        });
      }

      onOpenChange(false);
      onClaimed?.();
      setNote("");
    } catch (error: any) {
      console.error("Error claiming dossier:", error);
      toast({
        title: t("toasts.errors.claimError"),
        description: error.message || t("toasts.errors.claimErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFlowLabel = (flow: string) => {
    const flowMap: Record<string, string> = {
      LOC: "Lokaal",
      REP: "Repatriëring",
      UNSET: "Niet ingesteld",
    };
    return flowMap[flow] || flow;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      CREATED: "Nieuw dossier",
      IN_PROGRESS: "In behandeling",
      UNDER_REVIEW: "In controle",
      COMPLETED: "Operationeel afgerond",
      CLOSED: "Gearchiveerd",
    };
    return statusMap[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dossier claimen</DialogTitle>
          <DialogDescription>
            Bevestig dat je dit dossier wilt claimen voor jouw organisatie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dossier Info */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-mono text-muted-foreground">{dossier.display_id}</p>
                <p className="text-base font-semibold mt-1 blur-sm select-none">████████████</p>
              </div>
              <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {dossier.deceased_gender && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{dossier.deceased_gender === "M" ? "Man" : "Vrouw"}</span>
                </div>
              )}
              {dossier.date_of_death && (
                <div className="flex items-center gap-2 text-muted-foreground blur-sm">
                  <Calendar className="h-4 w-4" />
                  <span className="select-none">██/██/████</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <Badge variant="secondary" className="text-xs">
                Status: {getStatusLabel(dossier.status)}
              </Badge>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Opmerking (optioneel)</Label>
            <Textarea
              id="note"
              placeholder={t("forms.placeholders.claimNote")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Deze opmerking wordt gedeeld met de familie.
            </p>
          </div>

          {/* Info about family approval */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              De claim wordt in afwachting gezet totdat de familie deze goedkeurt via de Familie-app.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuleren
          </Button>
          <Button onClick={handleClaim} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Claim aanvragen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
