import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save } from "lucide-react";

interface InternalNotesCardProps {
  dossierId: string;
  initialNotes: string | null;
  onNotesSaved: () => void;
}

export function InternalNotesCard({ dossierId, initialNotes, onNotesSaved }: InternalNotesCardProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);

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
    onNotesSaved();
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          Interne Notities
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Voeg interne notities toe (alleen zichtbaar voor FD team)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="mb-3"
        />
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Opslaan..." : "Notities opslaan"}
        </Button>
      </CardContent>
    </Card>
  );
}
