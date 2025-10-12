import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServiceEvent {
  id: string;
  event_type: string;
  scheduled_at: string | null;
  location_text: string | null;
  notes: string | null;
  status: string;
  metadata: any;
}

interface EditableServiceCardProps {
  event: ServiceEvent | null;
  title: string;
  description: string;
  onUpdate: () => void;
}

export function EditableServiceCard({ event, title, description, onUpdate }: EditableServiceCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    scheduled_at: event?.scheduled_at || "",
    location_text: event?.location_text || "",
    notes: event?.notes || "",
  });

  const handleSave = async () => {
    if (!event) return;

    try {
      const { error } = await supabase
        .from("case_events")
        .update({
          scheduled_at: editData.scheduled_at || null,
          location_text: editData.location_text || null,
          notes: editData.notes || null,
        })
        .eq("id", event.id);
      
      if (error) throw error;
      
      toast({ title: "Service bijgewerkt" });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setEditData({
      scheduled_at: event?.scheduled_at || "",
      location_text: event?.location_text || "",
      notes: event?.notes || "",
    });
    setIsEditing(false);
  };

  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nog niet ingepland</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
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
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Badge>{event.status}</Badge>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label>Geplande datum/tijd</Label>
              <Input
                type="datetime-local"
                value={editData.scheduled_at ? new Date(editData.scheduled_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditData({ ...editData, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Locatie</Label>
              <Input
                value={editData.location_text || ""}
                onChange={(e) => setEditData({ ...editData, location_text: e.target.value })}
              />
            </div>
            <div>
              <Label>Notities</Label>
              <Textarea
                value={editData.notes || ""}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {event.scheduled_at && (
              <div>
                <span className="text-sm font-medium">Datum/tijd: </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(event.scheduled_at).toLocaleString("nl-NL")}
                </span>
              </div>
            )}
            {event.location_text && (
              <div>
                <span className="text-sm font-medium">Locatie: </span>
                <span className="text-sm text-muted-foreground">{event.location_text}</span>
              </div>
            )}
            {event.notes && (
              <div>
                <span className="text-sm font-medium">Notities: </span>
                <span className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
