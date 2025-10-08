import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, MapPin, Check, X, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JanazahServiceCardProps {
  dossierId: string;
  service?: {
    id: string;
    scheduled_at: string | null;
    status: string;
    location_text: string | null;
    notes: string | null;
  };
  onUpdate?: () => void;
}

export function JanazahServiceCard({ dossierId, service, onUpdate }: JanazahServiceCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!service);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    service?.scheduled_at ? new Date(service.scheduled_at) : undefined
  );
  const [time, setTime] = useState(
    service?.scheduled_at ? format(new Date(service.scheduled_at), "HH:mm") : ""
  );
  const [location, setLocation] = useState(service?.location_text || "");
  const [notes, setNotes] = useState(service?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedDate || !time || !location.trim()) {
      toast({
        title: "Vul alle velden in",
        description: "Datum, tijd en locatie zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = time.split(":");
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      if (service) {
        // Update existing
        const { error } = await supabase
          .from("case_events")
          .update({
            scheduled_at: scheduledAt.toISOString(),
            location_text: location.trim(),
            notes: notes.trim() || null,
            status: "PLANNED",
          })
          .eq("id", service.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("case_events").insert({
          dossier_id: dossierId,
          event_type: "MOSQUE_SERVICE",
          scheduled_at: scheduledAt.toISOString(),
          location_text: location.trim(),
          notes: notes.trim() || null,
          status: "PLANNED",
        });

        if (error) throw error;
      }

      toast({
        title: "Opgeslagen",
        description: "Janazah service is bijgewerkt",
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!service) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("case_events")
        .update({ status: newStatus })
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: "Status bijgewerkt",
        description: `Janazah is nu ${
          newStatus === "STARTED" ? "gestart" : newStatus === "DONE" ? "voltooid" : newStatus
        }`,
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNED":
        return <Badge className="bg-blue-500">Gepland</Badge>;
      case "STARTED":
        return <Badge className="bg-amber-500">Bezig</Badge>;
      case "DONE":
        return <Badge className="bg-green-500">Voltooid</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Geannuleerd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isEditing && service) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Janazah Gebed</CardTitle>
            {getStatusBadge(service.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {service.scheduled_at
                  ? format(new Date(service.scheduled_at), "EEEE dd MMMM yyyy 'om' HH:mm", {
                      locale: nl,
                    })
                  : "Nog niet gepland"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{service.location_text || "Locatie niet opgegeven"}</span>
            </div>
          </div>

          {service.notes && (
            <div className="text-sm bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Notities:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{service.notes}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {service.status === "PLANNED" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("STARTED")}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start gebed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  Aanpassen
                </Button>
              </>
            )}
            {service.status === "STARTED" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("DONE")}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Markeer voltooid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {service ? "Janazah aanpassen" : "Janazah plannen"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Datum</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={nl}
            className="rounded-md border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Tijd</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Locatie</Label>
          <Input
            id="location"
            placeholder="Naam moskee, mortuarium of begraafplaats"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Bijvoorbeeld: "Moskee An-Nour" of "Mortuarium Centrum" of "Begraafplaats Zuid"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notities (optioneel)</Label>
          <Textarea
            id="notes"
            placeholder="Extra informatie..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Bezig..." : "Opslaan"}
          </Button>
          {service && (
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
              Annuleren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
