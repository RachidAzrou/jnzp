import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  dossier_id: string;
  dossier: {
    ref_number: string;
    deceased_name: string;
    status: string;
    legal_hold: boolean;
  };
  type: string;
  status: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  priority_source: "AUTO" | "MANUAL";
  priority_set_by_user_id?: string;
  priority_set_at?: string;
  created_at: string;
  updated_at: string;
}

const Taken = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          dossier:dossiers(ref_number, deceased_name, status, legal_hold)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout bij laden taken",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskPriority = async (taskId: string, newPriority: "HIGH" | "MEDIUM" | "LOW", currentTask: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      // Update task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          priority: newPriority,
          priority_source: "MANUAL",
          priority_set_by_user_id: user.id,
          priority_set_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Log audit
      await supabase.from("task_priority_audit").insert({
        task_id: taskId,
        actor_user_id: user.id,
        from_priority: currentTask.priority,
        to_priority: newPriority,
        source_before: currentTask.priority_source,
        source_after: "MANUAL",
      });

      toast({
        title: "Prioriteit aangepast",
        description: `Taak prioriteit is nu ${getPriorityLabel(newPriority)}`,
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout bij aanpassen prioriteit",
        description: error.message,
      });
    }
  };

  const resetToAutoPriority = async (taskId: string, currentTask: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      // Calculate auto priority
      const { data: autoPriority, error: calcError } = await supabase
        .rpc("calculate_task_priority", {
          _task_type: currentTask.type as any,
          _dossier_id: currentTask.dossier_id,
        });

      if (calcError) throw calcError;

      // Update task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          priority: autoPriority,
          priority_source: "AUTO",
          priority_set_by_user_id: null,
          priority_set_at: null,
        })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Log audit
      await supabase.from("task_priority_audit").insert({
        task_id: taskId,
        actor_user_id: user.id,
        from_priority: currentTask.priority,
        to_priority: autoPriority,
        source_before: currentTask.priority_source,
        source_after: "AUTO",
      });

      toast({
        title: "Automatische prioriteit hersteld",
        description: `Taak prioriteit is nu ${getPriorityLabel(autoPriority)}`,
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout bij herstellen prioriteit",
        description: error.message,
      });
    }
  };

  const getTaskTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      DOC_REUPLOAD_REQUEST: "Document opnieuw opvragen",
      MOSQUE_CONFIRM: "Moskee bevestigen",
      WASH_START: "Wassing starten",
      FLIGHT_REGISTER: "Vlucht registreren",
      INTAKE_COMPLETE: "Intake voltooien",
      LEGAL_HOLD_FOLLOW_UP: "Parketvrijgave afwachten / uploaden",
      TRANSPORT_PREPARE: "Transport voorbereiden",
      DOC_REVIEW: "Document beoordelen",
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      HIGH: "Hoog",
      MEDIUM: "Normaal",
      LOW: "Laag",
    };
    return labels[priority] || priority;
  };

  const TaskCard = ({ 
    task, 
    onPriorityChange,
    onResetPriority 
  }: { 
    task: Task;
    onPriorityChange: (taskId: string, priority: "HIGH" | "MEDIUM" | "LOW", task: Task) => void;
    onResetPriority: (taskId: string, task: Task) => void;
  }) => {
    return (
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">{task.dossier?.ref_number}</p>
                <p className="text-sm text-muted-foreground">{task.dossier?.deceased_name}</p>
              </div>
              {task.dossier?.legal_hold && (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 ml-2" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-1">{getTaskTypeLabel(task.type)}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(task.updated_at), "dd MMM yyyy HH:mm", { locale: nl })}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">Prioriteit:</span>
                <Select
                  value={task.priority}
                  onValueChange={(value) => onPriorityChange(task.id, value as "HIGH" | "MEDIUM" | "LOW", task)}
                  disabled={task.status === "DONE"}
                >
                  <SelectTrigger className="h-7 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">Hoog</SelectItem>
                    <SelectItem value="MEDIUM">Normaal</SelectItem>
                    <SelectItem value="LOW">Laag</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={task.priority_source === "MANUAL" ? "outline" : "secondary"} className="text-xs">
                  {task.priority_source === "MANUAL" ? "Manueel" : "Auto"}
                </Badge>
                {task.priority_source === "MANUAL" && task.status !== "DONE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResetPriority(task.id, task)}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Automatisch
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Categorize tasks by status and sort by priority
  const sortByPriority = (a: Task, b: Task) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  };

  const openTasks = tasks.filter((task) => task.status === "OPEN").sort(sortByPriority);
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").sort(sortByPriority);
  const completedTasks = tasks.filter((task) => task.status === "DONE").sort(sortByPriority);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Taken</h1>
        <p className="text-muted-foreground">
          Sortering: Hoog → Normaal → Laag, daarna meest recent bijgewerkt
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Open Column */}
          <div>
            <Card>
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Open
                  <Badge variant="secondary" className="ml-auto">
                    {openTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {openTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Geen openstaande taken
                  </p>
                ) : (
                  openTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      onPriorityChange={updateTaskPriority}
                      onResetPriority={resetToAutoPriority}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* In Progress Column */}
          <div>
            <Card>
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  In behandeling
                  <Badge variant="secondary" className="ml-auto">
                    {inProgressTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {inProgressTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Geen taken in behandeling
                  </p>
                ) : (
                  inProgressTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      onPriorityChange={updateTaskPriority}
                      onResetPriority={resetToAutoPriority}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completed Column */}
          <div>
            <Card>
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Voltooid
                  <Badge variant="secondary" className="ml-auto">
                    {completedTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {completedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Geen voltooide taken
                  </p>
                ) : (
                  completedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      onPriorityChange={updateTaskPriority}
                      onResetPriority={resetToAutoPriority}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Taken;
