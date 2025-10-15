import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = DELETABLE_STATUSES.includes(currentStatus);
  const cannotDeleteReason = !canDelete 
    ? t("deleteDossier.cannotDelete", { currentStatus })
    : null;

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: t("toasts.errors.deleteReasonRequired"),
        description: t("toasts.errors.deleteReasonRequiredDesc"),
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
        title: t("toasts.success.dossierDeleted"),
        description: t("toasts.success.dossierDeletedDesc", { displayId: dossierDisplayId }),
      });

      // Navigate back to dossiers list
      navigate("/dossiers");
    } catch (error: any) {
      console.error("Error deleting dossier:", error);
      toast({
        title: t("toasts.errors.deleteError"),
        description: error.message || t("toasts.errors.deleteErrorDesc"),
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
            {t("deleteDossier.title")}
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
                  {t("deleteDossier.confirmMessage", { dossierDisplayId })}
                </p>
                
                <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t("common.warning")}:</strong> {t("deleteDossier.warning")}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t("deleteDossier.reasonLabel")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder={t("deleteDossier.reasonPlaceholder")}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t("deleteDossier.reasonHint")}
              </p>
            </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {cannotDeleteReason ? t("common.close") : t("common.cancel")}
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
              {isDeleting ? t("common.loading") : t("common.confirm")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
