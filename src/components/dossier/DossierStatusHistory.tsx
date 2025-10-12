import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface StatusHistoryProps {
  dossierId: string;
  currentStatus: string;
}

interface StatusEvent {
  id: string;
  event_type: string;
  event_description: string;
  created_at: string;
  created_by: string;
  metadata: any;
  user_email?: string;
}

export function DossierStatusHistory({ dossierId, currentStatus }: StatusHistoryProps) {
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [dossierId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("dossier_events")
        .select(`
          id,
          event_type,
          event_description,
          created_at,
          created_by,
          metadata
        `)
        .eq("dossier_id", dossierId)
        .eq("event_type", "STATUS_CHANGED")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Historiek ({history.length} wijzigingen)
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-200">
        <div className="ml-3 border-l-2 border-muted space-y-3 pl-4 pb-2">
          {history.map((event) => (
            <div key={event.id} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 -ml-[1.3rem]" />
                <span className="font-medium text-foreground">
                  {event.event_description}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(event.created_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
              </div>
              {event.metadata?.reason && (
                <div className="text-xs text-muted-foreground italic bg-muted/30 px-2 py-1 rounded">
                  "{event.metadata.reason}"
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
