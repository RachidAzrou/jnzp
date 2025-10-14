import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface AuditEvent {
  id: string;
  event_type: string;
  description: string;
  actor_role: string | null;
  target_type: string | null;
  created_at: string;
  metadata: any;
  reason: string | null;
}

export default function AdminAudit() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery]);

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching audit events:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon audit events niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    if (!searchQuery) {
      setFilteredEvents(events);
      return;
    }

    const filtered = events.filter(
      (event) =>
        event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.target_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEvents(filtered);
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.includes("DELETE") || eventType.includes("REJECT")) {
      return <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs">{eventType}</Badge>;
    }
    if (eventType.includes("CREATE") || eventType.includes("APPROVE")) {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs">{eventType}</Badge>;
    }
    if (eventType.includes("UPDATE") || eventType.includes("CHANGE")) {
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs">{eventType}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{eventType}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <FileText className="h-6 w-6" />
          {t("admin.audit.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("admin.audit.description")}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.audit.searchLabel")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("placeholders.searchEventType")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.audit.eventsCount")} ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.time")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.event")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.description")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.role")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.target")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(event.created_at).toLocaleString("nl-NL")}
                  </TableCell>
                  <TableCell>{getEventBadge(event.event_type)}</TableCell>
                  <TableCell className="text-sm">{event.description || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="text-xs">{event.actor_role || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.target_type || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {event.reason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
