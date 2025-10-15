import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ReleaseDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  dossierDisplayId: string;
  onSuccess?: () => void;
}

const RELEASE_REASONS = [
  { value: "no_capacity", label_key: "releaseDialog.reasonNoCapacity" },
  { value: "geographical", label_key: "releaseDialog.reasonGeographical" },
  { value: "family_request", label_key: "releaseDialog.reasonFamilyRequest" },
  { value: "service_mismatch", label_key: "releaseDialog.reasonServiceMismatch" },
  { value: "other", label_key: "releaseDialog.reasonOther" },
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
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleRelease = async () => {
    if (!reason) {
      toast({
        title: t("toasts.errors.reasonRequired"),
        description: t("releaseDialog.reasonRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    const finalReason = reason === "other" ? customReason : t(RELEASE_REASONS.find(r => r.value === reason)?.label_key || "");
    
    if (!finalReason.trim()) {
      toast({
        title: t("toasts.errors.reasonRequired"),
        description: t("releaseDialog.enterReasonDesc"),
        variant: "destructive",
      });
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
        toast({
          title: t("common.success"),
          description: t("releaseDialog.successDesc"),
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: t("common.error"),
          description: result?.error || t("releaseDialog.errorDesc"),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Release error:", err);
      toast({
        title: t("common.error"),
        description: t("releaseDialog.errorDesc") + ": " + err.message,
        variant: "destructive",
      });
    } finally {
      setReleasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("releaseDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("releaseDialog.description", { dossierDisplayId })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t("releaseDialog.reasonLabel")} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={t("releaseDialog.reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {RELEASE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {t(r.label_key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">{t("releaseDialog.customReasonLabel")} *</Label>
              <Textarea
                id="customReason"
                placeholder={t("forms.placeholders.releaseDescription")}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleRelease} disabled={releasing}>
            {releasing ? t("releaseDialog.releasing") : t("releaseDialog.release")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
