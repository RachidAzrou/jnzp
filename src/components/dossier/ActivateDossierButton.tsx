import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { PlayCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivateDossierButtonProps {
  dossierId: string;
  currentStatus: string;
  flow: string;
  onActivated: () => void;
}

export function ActivateDossierButton({ 
  dossierId, 
  currentStatus, 
  flow,
  onActivated 
}: ActivateDossierButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [activating, setActivating] = useState(false);

  // Show button for INTAKE status (uppercase to match database enum)
  if (currentStatus !== "INTAKE") {
    return null;
  }

  const handleActivate = async () => {
    if (!reason.trim()) {
    toast({
      title: t("toasts.errors.activationReasonRequired"),
      description: t("toasts.errors.activationReasonRequiredDesc"),
      variant: "destructive",
    });
      return;
    }

    setActivating(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Update dossier status to OPERATIONAL - tasks will be seeded automatically by trigger
    const { error } = await supabase
      .from("dossiers")
      .update({ status: "OPERATIONAL" as any })
      .eq("id", dossierId);

    if (error) {
      toast({
        title: t("toasts.errors.activationError"),
        description: t("toasts.errors.activationErrorDesc"),
        variant: "destructive",
      });
      setActivating(false);
      return;
    }

    // Log activation event
    await supabase.from("dossier_events").insert({
      dossier_id: dossierId,
      event_type: "DOSSIER_ACTIVATED",
      event_description: `Dossier operationeel gemaakt. Reden: ${reason}`,
      created_by: userId,
      metadata: { reason, flow },
    });

    toast({
      title: t("toasts.success.dossierActivated"),
      description: t("toasts.success.dossierActivatedDesc", { flow: flow === 'REP' ? 'repatriëring' : 'lokale begrafenis' }),
      duration: 6000,
    });

    setActivating(false);
    setOpen(false);
    setReason("");
    onActivated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button 
          variant="default" 
          size="lg"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setOpen(true)}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          Dossier Activeren
        </Button>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>🚀 Dossier Operationeel Maken</DialogTitle>
            <DialogDescription>
              Bij het operationeel maken worden automatisch taken gegenereerd op basis van het flow type ({flow === 'REP' ? 'Repatriëring' : 'Lokaal'}).
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertDescription>
              <strong>Automatische taken die worden aangemaakt:</strong>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Wassing (mortuarium) plannen</li>
                <li>Moskee (Janāza) plannen</li>
                {flow === 'REP' && <li>Vlucht/Cargo boeken</li>}
                <li>Documenten uploaden</li>
                <li>Familie informeren</li>
                <li>Facturen verzamelen en dossier afronden</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Reden voor activering *</Label>
            <Textarea
              placeholder="Bijv. 'Intakegegevens compleet, klaar voor planning'"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleActivate} 
              disabled={activating}
              className="bg-green-600 hover:bg-green-700"
            >
              {activating ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
