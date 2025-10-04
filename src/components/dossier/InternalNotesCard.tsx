import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Edit2, Check, X } from "lucide-react";

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
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Interne Notities
          </CardTitle>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="mr-2 h-3 w-3" />
              Bewerken
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Alleen zichtbaar voor het FD team
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Voeg interne notities toe over dit dossier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {notes.length} karakters
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="mr-2 h-3 w-3" />
                  Annuleren
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave} 
                  disabled={saving || !hasChanges}
                >
                  <Check className="mr-2 h-3 w-3" />
                  {saving ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[120px]">
            {notes ? (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {notes}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nog geen interne notities toegevoegd
                </p>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="mt-2"
                >
                  Klik hier om notities toe te voegen
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
