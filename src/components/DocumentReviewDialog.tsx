import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, Download, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface DocumentReviewDialogProps {
  document: any;
  open: boolean;
  onClose: () => void;
  onReviewComplete: () => void;
}

export function DocumentReviewDialog({
  document,
  open,
  onClose,
  onReviewComplete,
}: DocumentReviewDialogProps) {
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [noteToFamily, setNoteToFamily] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!reviewDecision) {
      toast({
        title: t("toasts.errors.selectDecision"),
        description: t("toasts.errors.selectDecisionDesc"),
        variant: "destructive",
      });
      return;
    }

    if (reviewDecision === "reject" && !rejectionReason.trim()) {
      toast({
        title: t("toasts.errors.reasonRequired"),
        description: t("toasts.errors.rejectReasonRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = {
        status: reviewDecision === "approve" ? "APPROVED" : "REJECTED",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (reviewDecision === "reject") {
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", document.id);

      if (error) throw error;

      // Create audit event
      await supabase.from("dossier_events").insert({
        dossier_id: document.dossier_id,
        event_type: reviewDecision === "approve" ? "DOC_APPROVED" : "DOC_REJECTED",
        event_description: `Document ${document.doc_type} ${reviewDecision === "approve" ? "goedgekeurd" : "afgewezen"}`,
        created_by: user?.id,
        metadata: {
          document_id: document.id,
          doc_type: document.doc_type,
          rejection_reason: reviewDecision === "reject" ? rejectionReason : null,
        },
      });

      // Send chat message if needed
      if (noteToFamily.trim()) {
        await supabase.from("chat_messages").insert({
          dossier_id: document.dossier_id,
          sender_user_id: user?.id,
          sender_role: "funeral_director",
          message: noteToFamily,
          channel: "PORTAL",
        });
      }

      toast({
        title: reviewDecision === "approve" ? t("toasts.success.documentApproved") : t("toasts.success.documentRejected"),
        description: reviewDecision === "approve" 
          ? t("toasts.success.documentApprovedDesc", { type: document.doc_type })
          : t("toasts.success.documentRejectedDesc", { type: document.doc_type }),
      });

      onReviewComplete();
      handleClose();
    } catch (error) {
      console.error("Error reviewing document:", error);
      toast({
        title: t("toasts.errors.error"),
        description: t("toasts.errors.documentReviewError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReviewDecision(null);
    setRejectionReason("");
    setNoteToFamily("");
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("documentReview.title")}</DialogTitle>
          <DialogDescription>
            {t("documentReview.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("documentReview.dossier")}:</span>
              <span className="font-mono text-sm">{document.dossiers?.ref_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("documentReview.type")}:</span>
              <span className="text-sm">{document.doc_type.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("documentReview.file")}:</span>
              <span className="text-sm truncate max-w-[300px]">{document.file_name}</span>
            </div>
          </div>

          {/* Preview Placeholder */}
          <div className="bg-muted/30 border-2 border-dashed rounded-lg p-8 text-center">
            <Eye className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("documentReview.previewComing")}
            </p>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t("documentReview.download")}
            </Button>
          </div>

          {/* Review Decision */}
          <div className="space-y-3">
            <Label>{t("documentReview.decision")} *</Label>
            <RadioGroup 
              value={reviewDecision || ""} 
              onValueChange={(val) => setReviewDecision(val as "approve" | "reject")}
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="approve" id="approve-dialog" />
                <Label htmlFor="approve-dialog" className="font-normal cursor-pointer flex items-center gap-2 flex-1">
                  <CheckCircle className="h-5 w-5 text-success" />
                  {t("documentReview.approve")}
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="reject" id="reject-dialog" />
                <Label htmlFor="reject-dialog" className="font-normal cursor-pointer flex items-center gap-2 flex-1">
                  <XCircle className="h-5 w-5 text-destructive" />
                  {t("documentReview.reject")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rejection Reason (only if rejecting) */}
          {reviewDecision === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t("documentReview.rejectionReason")} *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("forms.placeholders.rejectionReason")}
                rows={3}
              />
            </div>
          )}

          {/* Note to Family */}
          <div className="space-y-2">
            <Label htmlFor="note-to-family">{t("documentReview.noteToFamily")}</Label>
            <Textarea
              id="note-to-family"
              value={noteToFamily}
              onChange={(e) => setNoteToFamily(e.target.value)}
              placeholder={t("documentReview.notePlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t("documentReview.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("documentReview.processing") : t("documentReview.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
