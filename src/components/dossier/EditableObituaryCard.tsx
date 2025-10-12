import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";

interface EditableObituaryCardProps {
  dossierId: string;
  initialObituary: string | null;
  onUpdate: () => void;
}

export function EditableObituaryCard({ dossierId, initialObituary, onUpdate }: EditableObituaryCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [obituary, setObituary] = useState(initialObituary || "");

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("dossiers")
        .update({ obituary: obituary || null })
        .eq("id", dossierId);
      
      if (error) throw error;
      
      toast({ title: "Overlijdensbericht opgeslagen" });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setObituary(initialObituary || "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Overlijdensbericht</CardTitle>
            <CardDescription>Bewerk het overlijdensbericht</CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={obituary}
            onChange={(e) => setObituary(e.target.value)}
            placeholder="Voer het overlijdensbericht in..."
            className="min-h-[200px]"
          />
        ) : (
          <div className="prose max-w-none">
            {obituary ? (
              <p className="whitespace-pre-wrap">{obituary}</p>
            ) : (
              <p className="text-muted-foreground italic">Nog geen overlijdensbericht toegevoegd</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
