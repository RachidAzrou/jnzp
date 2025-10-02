import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, AlertCircle, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

interface Task {
  id: string;
  dossier_ref: string;
  deceased_name: string;
  status: string;
  legal_hold: boolean;
  created_at: string;
}

const Taken = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("dossiers")
      .select("id, ref_number, deceased_name, status, legal_hold, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      const mappedTasks = data.map(d => ({
        id: d.id,
        dossier_ref: d.ref_number,
        deceased_name: d.deceased_name,
        status: d.status,
        legal_hold: d.legal_hold,
        created_at: d.created_at
      }));
      setTasks(mappedTasks);
    }
    setLoading(false);
  };

  const getTaskStatus = (dossierStatus: string, legalHold: boolean) => {
    if (legalHold) return "open";
    if (["ARCHIVED", "IN_TRANSIT"].includes(dossierStatus)) return "completed";
    if (["PLANNING", "READY_FOR_TRANSPORT"].includes(dossierStatus)) return "inprogress";
    return "open";
  };

  const getTaskDescription = (dossierStatus: string, legalHold: boolean) => {
    if (legalHold) return "Parketvrijgave afwachten / uploaden";
    
    const descriptions: Record<string, string> = {
      CREATED: "Intake starten",
      INTAKE_IN_PROGRESS: "Intake voltooien",
      DOCS_PENDING: "Documenten uploaden",
      FD_ASSIGNED: "Dossier reviewen",
      DOCS_VERIFIED: "Documentatie verifiëren",
      APPROVED: "Planning voorbereiden",
      PLANNING: "Moskee/vlucht bevestigen",
      READY_FOR_TRANSPORT: "Transport voorbereiden",
      IN_TRANSIT: "Transport monitoren",
      ARCHIVED: "Dossier gearchiveerd"
    };
    
    return descriptions[dossierStatus] || "Taak uitvoeren";
  };

  const getPriority = (dossierStatus: string, legalHold: boolean) => {
    if (legalHold) return "high";
    if (["DOCS_PENDING", "FD_ASSIGNED"].includes(dossierStatus)) return "high";
    if (["PLANNING", "READY_FOR_TRANSPORT"].includes(dossierStatus)) return "medium";
    return "low";
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const taskStatus = getTaskStatus(task.status, task.legal_hold);
    const taskDesc = getTaskDescription(task.status, task.legal_hold);
    const priority = getPriority(task.status, task.legal_hold);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">{task.dossier_ref}</Badge>
                <Badge variant={priority === "high" ? "destructive" : priority === "medium" ? "default" : "secondary"}>
                  {priority === "high" ? "Hoog" : priority === "medium" ? "Normaal" : "Laag"}
                </Badge>
              </div>
              <h3 className="font-semibold text-base">{taskDesc}</h3>
              <p className="text-sm text-muted-foreground mt-1">{task.deceased_name}</p>
            </div>
            {taskStatus === "completed" && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            {taskStatus === "inprogress" && (
              <Clock className="h-5 w-5 text-warning" />
            )}
            {taskStatus === "open" && (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{task.status.replace(/_/g, " ")}</span>
            </div>
            {task.legal_hold && (
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertCircle className="h-4 w-4" />
                Legal Hold Actief
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1">Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const openTasks = tasks.filter(t => getTaskStatus(t.status, t.legal_hold) === "open");
  const inProgressTasks = tasks.filter(t => getTaskStatus(t.status, t.legal_hold) === "inprogress");
  const completedTasks = tasks.filter(t => getTaskStatus(t.status, t.legal_hold) === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Taken</h1>
        <p className="text-muted-foreground mt-1">Overzicht van alle openstaande en voltooide taken</p>
      </div>

      {/* Kanban Board Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Open Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold">Te doen</h3>
            </div>
            <Badge variant="secondary">{openTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {openTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                  Geen openstaande taken
                </CardContent>
              </Card>
            ) : (
              openTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">In behandeling</h3>
            </div>
            <Badge variant="secondary">{inProgressTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {inProgressTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                  Geen taken in behandeling
                </CardContent>
              </Card>
            ) : (
              inProgressTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="font-semibold">Voltooid</h3>
            </div>
            <Badge variant="secondary">{completedTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {completedTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                  Geen voltooide taken
                </CardContent>
              </Card>
            ) : (
              completedTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Taken;
