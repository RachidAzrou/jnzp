import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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

  const handleCreateLink = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("create-feedback-link", {
        body: {
          dossierId,
          sendWhatsApp: false,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create feedback link");
      }

      setFeedbackUrl(data.feedbackUrl);

      toast({
        title: t("feedback.linkCreated"),
        description: t("feedback.linkCreatedDesc"),
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
            <Button
              onClick={() => handleCreateLink()}
              disabled={loading}
            >
              {loading ? t("feedback.loading") : t("feedback.createLinkOnly")}
            </Button>
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
