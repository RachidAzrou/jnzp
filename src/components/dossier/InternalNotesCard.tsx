import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Edit2 } from "lucide-react";

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
    <Card>
      <CardHeader className="border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Interne Notities
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Alleen zichtbaar voor het FD team
            </p>
          </div>
          {!isEditing && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-3"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Bewerken
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Voeg interne notities toe over dit dossier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {notes.length} karakters
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                  className="h-8 px-3"
                >
                  Annuleren
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave} 
                  disabled={saving || !hasChanges}
                  className="h-8 px-3"
                >
                  {saving ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[100px]">
            {notes ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed m-0">
                  {notes}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 border-2 border-dashed rounded-sm">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Geen notities
                  </p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-auto p-0 text-xs"
                  >
                    Notitie toevoegen
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
