import { useState } from "react";
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({
        title: "Titel vereist",
        description: "Voer een titel in voor het event",
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
        title: "Fout",
        description: "Event kon niet worden toegevoegd",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    toast({
      title: "Event toegevoegd",
      description: "Het handmatige event is toegevoegd aan de tijdlijn",
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
          Event toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Handmatig event toevoegen</DialogTitle>
          <DialogDescription>
            Voeg een eigen notitie of gebeurtenis toe aan de tijdlijn
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titel *</Label>
            <Input
              placeholder="Bijv. 'Contact gehad met familie'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Beschrijving</Label>
            <Textarea
              placeholder="Optionele details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Toevoegen..." : "Event toevoegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
