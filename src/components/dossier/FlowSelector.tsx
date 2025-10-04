import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plane, MapPin } from "lucide-react";

interface FlowSelectorProps {
  dossierId: string;
  currentFlow: string;
  onFlowChanged: () => void;
}

export function FlowSelector({ dossierId, currentFlow, onFlowChanged }: FlowSelectorProps) {
  const { toast } = useToast();

  const handleFlowChange = async (newFlow: string) => {
    const { error } = await supabase
      .from("dossiers")
      .update({ flow: newFlow as "LOC" | "REP" | "UNSET" })
      .eq("id", dossierId);

    if (error) {
      toast({
        title: "Fout",
        description: "Flowtype kon niet worden gewijzigd",
        variant: "destructive",
      });
      return;
    }

    // Log event
    await supabase.from("dossier_events").insert({
      dossier_id: dossierId,
      event_type: "FLOW_CHANGED",
      event_description: `Flowtype gewijzigd naar ${newFlow === 'REP' ? 'Repatriëring' : 'Lokaal'}`,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    toast({
      title: "Flowtype gewijzigd",
      description: `Dossier is nu ingesteld als ${newFlow === 'REP' ? 'Repatriëring' : 'Lokaal'}`,
    });

    onFlowChanged();
  };

  return (
    <Select value={currentFlow} onValueChange={handleFlowChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecteer flow" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UNSET">
          <span className="text-muted-foreground">Niet ingesteld</span>
        </SelectItem>
        <SelectItem value="LOC">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Lokaal</span>
          </div>
        </SelectItem>
        <SelectItem value="REP">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            <span>Repatriëring</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
