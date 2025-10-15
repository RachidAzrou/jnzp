import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface AddManualEventDialogProps {
  dossierId: string;
  onEventAdded: () => void;
}

export function AddManualEventDialog({ dossierId, onEventAdded }: AddManualEventDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({
        title: t("addManualEvent.titleRequired"),
        description: t("addManualEvent.titleRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { error } = await supabase.from("manual_events").insert({
      dossier_id: dossierId,
      user_id: userId,
      event_title: title,
      event_description: description,
    });

    if (error) {
      toast({
        title: t("addManualEvent.error"),
        description: t("addManualEvent.errorDesc"),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    toast({
      title: t("addManualEvent.success"),
      description: t("addManualEvent.successDesc"),
    });

    setOpen(false);
    setTitle("");
    setDescription("");
    setSaving(false);
    onEventAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          {t("addManualEvent.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addManualEvent.title")}</DialogTitle>
          <DialogDescription>
            {t("addManualEvent.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("addManualEvent.titleLabel")} *</Label>
            <Input
              placeholder={t("forms.placeholders.eventTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("addManualEvent.descriptionLabel")}</Label>
            <Textarea
              placeholder={t("forms.placeholders.eventDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
