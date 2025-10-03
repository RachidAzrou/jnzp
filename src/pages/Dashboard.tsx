import { FolderOpen, AlertTriangle, FileX, Clock, Plane, MapPin } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: dossiersData } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false });
      
      const { data: auditData } = await supabase
        .from("audit_events")
        .select("*, dossiers(display_id, ref_number)")
        .order("created_at", { ascending: false })
        .limit(5);

      setDossiers(dossiersData || []);
      setAuditEvents(auditData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const activeDossiers = dossiers.filter(d => 
    !['ARCHIVED', 'IN_TRANSIT'].includes(d.status)
  ).length;

  const legalHold = dossiers.filter(d => d.legal_hold).length;
  
  const repatriationDossiers = dossiers.filter(d => d.flow === 'REP').length;
  const localDossiers = dossiers.filter(d => d.flow === 'LOC').length;

  const getTaskDescription = (status: string, legalHold: boolean) => {
    if (legalHold) return "Parketvrijgave afwachten / uploaden";
    const descriptions: Record<string, string> = {
      CREATED: "Intake starten",
      INTAKE_IN_PROGRESS: "Intake voltooien",
      DOCS_PENDING: "Document opnieuw opvragen",
      FD_ASSIGNED: "Dossier reviewen",
      DOCS_VERIFIED: "Documentatie verifiëren",
      APPROVED: "Planning voorbereiden",
      PLANNING: "Moskee/vlucht bevestigen",
      READY_FOR_TRANSPORT: "Transport voorbereiden",
      IN_TRANSIT: "Transport monitoren",
    };
    return descriptions[status] || "Taak uitvoeren";
  };

  const getTaskUrgency = (status: string, legalHold: boolean) => {
    if (legalHold) return "Hoog";
    if (["DOCS_PENDING", "FD_ASSIGNED"].includes(status)) return "Hoog";
    if (["PLANNING", "READY_FOR_TRANSPORT"].includes(status)) return "Normaal";
    return "Laag";
  };


  const getTaskAction = (status: string, dossierId: string) => {
    if (["DOCS_PENDING"].includes(status)) {
      return () => navigate(`/documenten?filter=missing`);
    }
    if (["PLANNING"].includes(status)) {
      return () => navigate(`/planning`);
    }
    return () => navigate(`/dossiers`);
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: nl });
    } catch {
      return formatEventTime(timestamp);
    }
  };

  // Get urgent/today tasks (legal hold + docs pending + planning)
  const urgentTasks = dossiers.filter(d => 
    d.legal_hold || ["DOCS_PENDING", "FD_ASSIGNED", "PLANNING"].includes(d.status)
  ).slice(0, 4);

  if (loading) {
    return <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overzicht van uw actieve dossiers en taken</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div onClick={() => navigate('/dossiers')} className="cursor-pointer transition-all hover:shadow-lg">
          <KPICard
            title="Lopende dossiers"
            value={activeDossiers}
            icon={FolderOpen}
            trend={{ value: "Klik om lijst te openen", positive: true }}
          />
        </div>
        <div onClick={() => navigate('/dossiers?status=LEGAL_HOLD')} className="cursor-pointer transition-all hover:shadow-lg">
          <KPICard
            title="Legal hold"
            value={legalHold}
            icon={AlertTriangle}
            trend={{ value: "Toon dossiers", positive: false }}
          />
        </div>
        <div onClick={() => navigate('/documenten?filter=missing')} className="cursor-pointer transition-all hover:shadow-lg">
          <KPICard
            title="Ontbrekende documenten"
            value={5}
            icon={FileX}
            trend={{ value: "Naar documenten", positive: true }}
          />
        </div>
        <div onClick={() => navigate('/dossiers?flow=REP')} className="cursor-pointer transition-all hover:shadow-lg">
          <KPICard
            title="Repatriëring"
            value={repatriationDossiers}
            icon={Plane}
            trend={{ value: "Filter op REP", positive: true }}
          />
        </div>
        <div onClick={() => navigate('/dossiers?flow=LOC')} className="cursor-pointer transition-all hover:shadow-lg">
          <KPICard
            title="Lokaal"
            value={localDossiers}
            icon={MapPin}
            trend={{ value: "Filter op LOC", positive: true }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actieve dossiers */}
        <Card>
          <CardHeader>
            <CardTitle>Actieve dossiers</CardTitle>
            <CardDescription>Dossiers die aandacht vereisen</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Flow</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiers.slice(0, 5).map((dossier) => (
                  <TableRow key={dossier.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {dossier.display_id || dossier.ref_number}
                    </TableCell>
                    <TableCell>
                      {dossier.flow === "REP" && (
                        <Badge variant="outline" className="gap-1">
                          <Plane className="h-3 w-3" />
                          REP
                        </Badge>
                      )}
                      {dossier.flow === "LOC" && (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          LOC
                        </Badge>
                      )}
                      {dossier.flow === "UNSET" && (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>{dossier.deceased_name}</TableCell>
                    <TableCell>
                      <Badge variant={dossier.legal_hold ? "destructive" : "default"}>
                        {dossier.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(dossier.updated_at)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mijn openstaande taken */}
        <Card>
          <CardHeader>
            <CardTitle>Mijn openstaande taken</CardTitle>
            <CardDescription>Taken (vandaag + urgent)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Taak</TableHead>
                  <TableHead>Urgentie</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Geen urgente taken
                    </TableCell>
                  </TableRow>
                ) : (
                  urgentTasks.map((task) => {
                    const urgency = getTaskUrgency(task.status, task.legal_hold);
                    const taskDesc = getTaskDescription(task.status, task.legal_hold);
                    const action = getTaskAction(task.status, task.id);

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {task.display_id || task.ref_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {taskDesc}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              urgency === "Hoog" ? "destructive" : 
                              urgency === "Normaal" ? "default" : 
                              "secondary"
                            }
                          >
                            {urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={action}
                          >
                            {task.status === "DOCS_PENDING" ? "Naar Documenten" :
                             task.status === "PLANNING" ? "Naar Planning" :
                             "Open Dossier"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent bijgewerkt */}
      <Card>
        <CardHeader>
          <CardTitle>Recent bijgewerkt</CardTitle>
          <CardDescription>Laatste activiteiten in het systeem</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Tijd</TableHead>
                <TableHead className="w-24">Dossier</TableHead>
                <TableHead>Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Geen recente activiteiten
                  </TableCell>
                </TableRow>
              ) : (
                auditEvents.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground">
                      {formatEventTime(event.created_at)}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {event.dossiers?.display_id || event.dossiers?.ref_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">{event.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
