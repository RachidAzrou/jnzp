import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SendFeedbackButtonProps {
  dossierId: string;
}

export function SendFeedbackButton({ dossierId }: SendFeedbackButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async (sendWhatsApp: boolean) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-feedback-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            dossierId,
            sendWhatsApp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create feedback link");
      }

      setFeedbackUrl(data.feedbackUrl);

      toast({
        title: sendWhatsApp ? t("feedback.sentViaWhatsApp") : t("feedback.linkCreated"),
        description: sendWhatsApp
          ? t("feedback.sentViaWhatsAppDesc")
          : t("feedback.linkCreatedDesc"),
      });
    } catch (error: any) {
      console.error("Error creating feedback link:", error);
      toast({
        title: t("feedback.createError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: t("feedback.linkCopied"),
      description: t("feedback.linkCopiedDesc"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("feedback.requestFeedback")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("feedback.requestFeedbackTitle")}</DialogTitle>
          <DialogDescription>
            {t("feedback.requestFeedbackDesc")}
          </DialogDescription>
        </DialogHeader>

        {feedbackUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("feedback.generatedLink")}</Label>
              <div className="flex gap-2">
                <Input value={feedbackUrl} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("feedback.chooseMethod")}
            </p>
          </div>
        )}

        <DialogFooter>
          {!feedbackUrl ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleCreateLink(false)}
                disabled={loading}
              >
                {t("feedback.createLinkOnly")}
              </Button>
              <Button
                onClick={() => handleCreateLink(true)}
                disabled={loading}
              >
                {loading ? t("feedback.sending") : t("feedback.sendViaWhatsApp")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
