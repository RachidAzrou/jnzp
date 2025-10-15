import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InternalNotesCardProps {
  dossierId: string;
  initialNotes: string | null;
  onNotesSaved: () => void;
}

export function InternalNotesCard({ dossierId, initialNotes, onNotesSaved }: InternalNotesCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasChanges = notes !== (initialNotes || "");

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("dossiers")
      .update({ internal_notes: notes })
      .eq("id", dossierId);

    if (error) {
      toast({
        title: t("internalNotes.error"),
        description: t("internalNotes.errorSaving"),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Log event
    await supabase.from("dossier_events").insert({
      dossier_id: dossierId,
      event_type: "NOTES_UPDATED",
      event_description: "Interne notities bijgewerkt",
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    toast({
      title: t("internalNotes.saved"),
      description: t("internalNotes.savedDesc"),
    });

    setSaving(false);
    setIsEditing(false);
    onNotesSaved();
  };

  const handleCancel = () => {
    setNotes(initialNotes || "");
    setIsEditing(false);
  };

  return (
    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">{t("internalNotes.title")}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {t("internalNotes.visibilityNote")}
            </p>
          </div>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {t("common.edit")}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              placeholder={t("forms.placeholders.internalNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {notes.length} {t("internalNotes.characters")}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasChanges}
                >
                  {saving ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[120px] p-4 bg-muted/30 border">
            {notes ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-muted-foreground"
                >
                  {t("internalNotes.addNotes")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
