import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteDossierDialogProps {
  dossierId: string;
  dossierDisplayId: string;
  currentStatus: string;
  currentFlow: string;
  isFD?: boolean;
}

const DELETABLE_STATUSES = ["CREATED", "IN_PROGRESS"];

export function DeleteDossierDialog({ 
  dossierId, 
  dossierDisplayId, 
  currentStatus, 
  currentFlow,
  isFD = false 
}: DeleteDossierDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = DELETABLE_STATUSES.includes(currentStatus);
  const cannotDeleteReason = !canDelete 
    ? `Dossiers met status "${currentStatus}" kunnen niet verwijderd worden. Alleen dossiers met status "Nieuw" of "Intake" zijn verwijderbaar.`
    : null;

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor het verwijderen van dit dossier",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Soft delete: set deleted_at and deleted_by
      const { error: updateError } = await supabase
        .from("dossiers")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          delete_reason: deleteReason,
        })
        .eq("id", dossierId);

      if (updateError) throw updateError;

      // Log the deletion
      await supabase.from("audit_events").insert({
        user_id: userId,
        event_type: "DOSSIER_DELETED",
        target_type: "Dossier",
        target_id: dossierId,
        dossier_id: dossierId,
        description: `Dossier ${dossierDisplayId} verwijderd`,
        reason: deleteReason,
        metadata: {
          status: currentStatus,
          flow: currentFlow,
        },
      });

      toast({
        title: "Dossier verwijderd",
        description: `Dossier ${dossierDisplayId} is succesvol verwijderd`,
      });

      // Navigate back to dossiers list
      navigate("/dossiers");
    } catch (error: any) {
      console.error("Error deleting dossier:", error);
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Kon dossier niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button id="soft-delete-trigger" className="hidden" />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Dossier verwijderen
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left pt-2">
            {cannotDeleteReason ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {cannotDeleteReason}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p>
                  Weet je zeker dat je dossier <strong>{dossierDisplayId}</strong> wilt verwijderen?
                </p>
                
                <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Let op:</strong> Deze actie kan alleen uitgevoerd worden voor dossiers in de status 
                "Nieuw" of "Intake". Het dossier wordt niet permanent verwijderd maar wordt verborgen 
                en kan later door een admin worden teruggehaald indien nodig.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                Reden voor verwijdering <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Bijv. 'Verkeerd aangemaakt dossier' of 'Dubbel ingevoerd'"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Deze reden wordt gelogd in het auditlog
              </p>
            </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {cannotDeleteReason ? "Sluiten" : "Annuleren"}
          </AlertDialogCancel>
          {!cannotDeleteReason && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Bezig met verwijderen..." : "Ja, verwijder dossier"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
