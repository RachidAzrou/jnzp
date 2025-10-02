import { FolderOpen, AlertTriangle, FileX, Clock } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const Dashboard = () => {
  const openTasks = [
    { dossier: "A12", task: "Controle IIIC/ID", deadline: "vandaag", priority: "high" },
    { dossier: "A13", task: "Parketvrijgave uploaden", deadline: "+2u", priority: "high" },
    { dossier: "A09", task: "Laissez-passer nalopen", deadline: "morgen", priority: "medium" },
    { dossier: "A15", task: "Moskee bevestiging", deadline: "+4u", priority: "medium" },
    { dossier: "A08", task: "Vliegticket boeken", deadline: "morgen", priority: "low" },
  ];

  const recentUpdates = [
    { time: "10:42", dossier: "A12", event: "Document afgewezen (onleesbaar)", user: "J. Serrai" },
    { time: "09:15", dossier: "A07", event: "Moskee bevestigd (El Noor 14:00)", user: "Systeem" },
    { time: "08:50", dossier: "A10", event: "Vlucht geregistreerd SN1234", user: "M. Haddad" },
    { time: "08:20", dossier: "A12", event: "Parketvrijgave ontvangen", user: "Systeem" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overzicht van uw actieve dossiers en taken</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Lopende dossiers"
          value={12}
          icon={FolderOpen}
          trend={{ value: "+2 deze week", positive: true }}
        />
        <KPICard
          title="Legal hold"
          value={1}
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
            <CardTitle>Open taken</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Taak</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTasks.map((task, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{task.dossier}</TableCell>
                    <TableCell>{task.task}</TableCell>
                    <TableCell>
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                        {task.deadline}
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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Tijd</TableHead>
                  <TableHead className="w-20">Dossier</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Door</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUpdates.map((update, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-muted-foreground">{update.time}</TableCell>
                    <TableCell className="font-medium">{update.dossier}</TableCell>
                    <TableCell className="text-sm">{update.event}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{update.user}</TableCell>
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
