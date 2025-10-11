import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Settings,
  Calendar,
  MessageSquare,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: 'DOSSIER_EVENT' | 'TASK_EVENT' | 'DOCUMENT_EVENT';
  timestamp: string;
  actor: string;
  title: string;
  description?: string;
  icon: any;
  metadata?: any;
}

interface DossierTimelineProps {
  dossierId: string;
}

export function DossierTimeline({ dossierId }: DossierTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineEvents();
  }, [dossierId]);

  const fetchTimelineEvents = async () => {
    try {
      // 1. Fetch dossier events (no created_by in dossier_events table)
      const { data: dossierEvents } = await supabase
        .from('dossier_events')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      // 2. Fetch document events
      const { data: docEvents } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('uploaded_at', { ascending: false });

      // Transform to unified format
      const transformedEvents: TimelineEvent[] = [];

      // Add dossier events
      dossierEvents?.forEach(event => {
        transformedEvents.push({
          id: event.id,
          type: 'DOSSIER_EVENT',
          timestamp: event.created_at,
          actor: 'Systeem',
          title: getEventTitle(event.event_type),
          description: event.event_description,
          icon: getEventIcon(event.event_type),
          metadata: event.metadata,
        });
      });

      // Add document events
      docEvents?.forEach(doc => {
        transformedEvents.push({
          id: doc.id,
          type: 'DOCUMENT_EVENT',
          timestamp: doc.uploaded_at,
          actor: 'Gebruiker',
          title: doc.status === 'APPROVED' ? 'Document goedgekeurd' : 'Document geüpload',
          description: `${doc.doc_type} (${doc.file_name})`,
          icon: FileText,
          metadata: { doc_type: doc.doc_type, status: doc.status },
        });
      });

      // Sort by timestamp descending
      transformedEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventTitle = (eventType: string) => {
    const titles: Record<string, string> = {
      'STATUS_CHANGED': 'Status gewijzigd',
      'STATUS_AUTO_CHANGED': 'Status automatisch gewijzigd',
      'TASK_CREATED': 'Taak aangemaakt',
      'TASK_COMPLETED': 'Taak afgerond',
      'DOCUMENT_UPLOADED': 'Document toegevoegd',
      'DOCUMENT_APPROVED': 'Document goedgekeurd',
      'DOCUMENT_REJECTED': 'Document afgekeurd',
      'MOSQUE_STATUS_CHANGED': 'Janazah status gewijzigd',
      'LEGAL_HOLD_SET': 'Juridische blokkade geplaatst',
      'LEGAL_HOLD_REMOVED': 'Juridische blokkade opgeheven',
    };
    return titles[eventType] || eventType.replace(/_/g, ' ');
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, any> = {
      'STATUS_CHANGED': CheckCircle,
      'STATUS_AUTO_CHANGED': Settings,
      'TASK_CREATED': Calendar,
      'TASK_COMPLETED': CheckCircle,
      'DOCUMENT_UPLOADED': FileText,
      'DOCUMENT_APPROVED': CheckCircle,
      'DOCUMENT_REJECTED': AlertCircle,
      'MOSQUE_STATUS_CHANGED': Calendar,
      'LEGAL_HOLD_SET': AlertCircle,
      'LEGAL_HOLD_REMOVED': CheckCircle,
    };
    return icons[eventType] || MessageSquare;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nog geen gebeurtenissen</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tijdlijn</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative flex gap-4 pb-4">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
                )}

                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.actor}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(event.timestamp), { 
                            addSuffix: true, 
                            locale: nl 
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type === 'DOSSIER_EVENT' && 'Event'}
                      {event.type === 'TASK_EVENT' && 'Taak'}
                      {event.type === 'DOCUMENT_EVENT' && 'Document'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
