import { useState } from "react";
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
        title: "Fout",
        description: "Notities konden niet worden opgeslagen",
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
      title: "Notities opgeslagen",
      description: "Interne notities zijn bijgewerkt",
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
            <Label className="text-base font-semibold">Interne Notities</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Alleen zichtbaar voor het FD team
            </p>
          </div>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Bewerken
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Voeg interne notities toe over dit dossier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {notes.length} karakters
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Annuleren
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasChanges}
                >
                  {saving ? "Opslaan..." : "Opslaan"}
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
                  Klik om notities toe te voegen
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
