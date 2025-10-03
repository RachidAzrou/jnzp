import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle2, RotateCcw, Search } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState("");
  const [searchInProgress, setSearchInProgress] = useState("");
  const [searchCompleted, setSearchCompleted] = useState("");
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
      <div className="mb-2 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">JA ID: {task.dossier?.ref_number}</p>
              <p className="font-medium text-sm mt-1">{task.dossier?.deceased_name}</p>
            </div>
            {task.dossier?.legal_hold && (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 ml-2" />
            )}
          </div>

          <div>
            <p className="text-sm">{getTaskTypeLabel(task.type)}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(task.updated_at), "dd/MM/yy", { locale: nl })}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {t("common.view")}
            </Button>
          </div>
        </div>
      </div>
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

  const filterTasks = (taskList: Task[], searchTerm: string) => {
    if (!searchTerm) return taskList;
    const lowerSearch = searchTerm.toLowerCase();
    return taskList.filter(
      (task) =>
        task.dossier?.ref_number?.toLowerCase().includes(lowerSearch) ||
        task.dossier?.deceased_name?.toLowerCase().includes(lowerSearch) ||
        getTaskTypeLabel(task.type).toLowerCase().includes(lowerSearch)
    );
  };

  const allOpenTasks = tasks.filter((task) => task.status === "OPEN").sort(sortByPriority);
  const allInProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").sort(sortByPriority);
  const allCompletedTasks = tasks.filter((task) => task.status === "DONE").sort(sortByPriority);

  const openTasks = filterTasks(allOpenTasks, searchOpen);
  const inProgressTasks = filterTasks(allInProgressTasks, searchInProgress);
  const completedTasks = filterTasks(allCompletedTasks, searchCompleted);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("tasks.title")}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Open Column */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium mb-4">{t("tasks.assignedFiles")}</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("tasks.searchPlaceholder")}
                  value={searchOpen}
                  onChange={(e) => setSearchOpen(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-card min-h-[500px]">
              {openTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("tasks.noAssignedTasks")}
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
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium mb-4">{t("tasks.inProgressFiles")}</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("tasks.searchPlaceholder")}
                  value={searchInProgress}
                  onChange={(e) => setSearchInProgress(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-card min-h-[500px]">
              {inProgressTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("tasks.noInProgressTasks")}
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
            </div>
          </div>

          {/* Completed Column */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium mb-4">{t("tasks.completedFiles")}</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("tasks.searchPlaceholder")}
                  value={searchCompleted}
                  onChange={(e) => setSearchCompleted(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-card min-h-[500px]">
              {completedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("tasks.noCompletedTasks")}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Taken;
