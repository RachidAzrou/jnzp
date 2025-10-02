import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const Taken = () => {
  const allTasks = [
    { id: 1, dossier: "A12", task: "Controle IIIC/ID", assignee: "J. Serrai", deadline: "2025-10-02 12:00", priority: "high", status: "open" },
    { id: 2, dossier: "A13", task: "Parketvrijgave uploaden", assignee: "M. Haddad", deadline: "2025-10-01 16:00", priority: "high", status: "open" },
    { id: 3, dossier: "A09", task: "Laissez-passer nalopen", assignee: "J. Serrai", deadline: "2025-10-03 10:00", priority: "medium", status: "open" },
    { id: 4, dossier: "A15", task: "Moskee bevestiging", assignee: "Systeem", deadline: "2025-10-02 14:00", priority: "medium", status: "inprogress" },
    { id: 5, dossier: "A08", task: "Vliegticket boeken", assignee: "M. Haddad", deadline: "2025-10-04 09:00", priority: "low", status: "open" },
    { id: 6, dossier: "A07", task: "Moskee bevestiging El Noor", assignee: "Systeem", deadline: "2025-09-30 14:00", priority: "high", status: "completed" },
  ];

  const TaskCard = ({ task }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">{task.dossier}</Badge>
              <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
                {task.priority === "high" ? "Hoog" : task.priority === "medium" ? "Normaal" : "Laag"}
              </Badge>
            </div>
            <h3 className="font-semibold text-base">{task.task}</h3>
          </div>
          {task.status === "completed" && (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
          {task.status === "inprogress" && (
            <Clock className="h-5 w-5 text-warning" />
          )}
          {task.status === "open" && (
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toegewezen aan:</span>
            <span className="font-medium">{task.assignee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deadline:</span>
            <span className="font-medium">{task.deadline}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="flex-1">Details</Button>
          {task.status !== "completed" && (
            <Button size="sm" variant="outline">Markeer voltooid</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Taken</h1>
        <p className="text-muted-foreground mt-1">Overzicht van alle openstaande en voltooide taken</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Alle taken ({allTasks.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({allTasks.filter(t => t.status === "open").length})</TabsTrigger>
          <TabsTrigger value="inprogress">In behandeling ({allTasks.filter(t => t.status === "inprogress").length})</TabsTrigger>
          <TabsTrigger value="completed">Voltooid ({allTasks.filter(t => t.status === "completed").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTasks.filter(t => t.status === "open").map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inprogress" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTasks.filter(t => t.status === "inprogress").map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allTasks.filter(t => t.status === "completed").map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Taken;
