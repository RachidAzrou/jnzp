import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      
      toast({ title: t("errors.serviceUpdated") });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: t("errors.errorSaving"), variant: "destructive" });
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
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("service.notScheduled")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="ghost" 
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("service.edit")}</span>
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button onClick={handleSave} size="sm" className="h-8 text-xs">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">{t("service.save")}</span>
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="h-8 text-xs">
                <X className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">{t("service.cancel")}</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{t("service.status")}:</span>
          <Badge variant="secondary" className="text-xs">{event.status}</Badge>
        </div>

        {isEditing ? (
          <div className="space-y-3 animate-scale-in">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("service.scheduledDateTime")}</Label>
              <Input
                type="datetime-local"
                value={editData.scheduled_at ? new Date(editData.scheduled_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditData({ ...editData, scheduled_at: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("service.location")}</Label>
              <Input
                value={editData.location_text || ""}
                onChange={(e) => setEditData({ ...editData, location_text: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("service.notes")}</Label>
              <Textarea
                value={editData.notes || ""}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm animate-fade-in">
            {event.scheduled_at && (
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-[80px]">{t("service.dateTime")}:</span>
                <span className="font-medium">
                  {new Date(event.scheduled_at).toLocaleString("nl-NL")}
                </span>
              </div>
            )}
            {event.location_text && (
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-[80px]">{t("service.location")}:</span>
                <span className="font-medium">{event.location_text}</span>
              </div>
            )}
            {event.notes && (
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-[80px]">{t("service.notes")}:</span>
                <span className="whitespace-pre-wrap">{event.notes}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

