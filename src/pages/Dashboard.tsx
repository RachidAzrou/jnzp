import { FolderOpen, AlertTriangle, FileX, Clock } from "lucide-react";
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

const Dashboard = () => {
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
        .select("*, dossiers(ref_number)")
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

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  };

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Lopende dossiers"
          value={activeDossiers}
          icon={FolderOpen}
          trend={{ value: "+2 deze week", positive: true }}
        />
        <KPICard
          title="Legal hold"
          value={legalHold}
          icon={AlertTriangle}
        />
        <KPICard
          title="Ontbrekende documenten"
          value={5}
          icon={FileX}
          trend={{ value: "-3 sinds gisteren", positive: true }}
        />
        <KPICard
          title="Gem. doorlooptijd"
          value="28u"
          icon={Clock}
          trend={{ value: "-4u vs vorige week", positive: true }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                  <TableHead>Naam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiers.slice(0, 5).map((dossier) => (
                  <TableRow key={dossier.id}>
                    <TableCell className="font-medium">{dossier.ref_number}</TableCell>
                    <TableCell>{dossier.deceased_name}</TableCell>
                    <TableCell>
                      <Badge variant={dossier.legal_hold ? "destructive" : "default"}>
                        {dossier.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Openen</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bijgewerkt</CardTitle>
            <CardDescription>Laatste activiteiten in het systeem</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Tijd</TableHead>
                  <TableHead className="w-20">Dossier</TableHead>
                  <TableHead>Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatEventTime(event.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.dossiers?.ref_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">{event.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
