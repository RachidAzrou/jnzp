import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface TaskProgressWidgetProps {
  dossierId: string;
}

export function TaskProgressWidget({ dossierId }: TaskProgressWidgetProps) {
  const { t } = useTranslation();
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTaskProgress();

    // Realtime subscription
    const channel = supabase
      .channel(`task-progress-${dossierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => {
          fetchTaskProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossierId]);

  const fetchTaskProgress = async () => {
    try {
      const { count: total } = await supabase
        .from("kanban_tasks")
        .select("*", { count: "exact", head: true })
        .eq("dossier_id", dossierId);

      const { count: completed } = await supabase
        .from("kanban_tasks")
        .select("*", { count: "exact", head: true })
        .eq("dossier_id", dossierId)
        .eq("status", "DONE");

      setTotalTasks(total || 0);
      setCompletedTasks(completed || 0);
    } catch (error) {
      console.error("Error fetching task progress:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTaskProgress();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (totalTasks === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Takenvoortgang</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Voltooid voor deze fase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary/60 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {completedTasks} van {totalTasks} taken
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {progressPercentage}%
            </Badge>
          </div>

          {/* Completion message */}
          {progressPercentage === 100 && (
            <div className="text-xs text-center text-muted-foreground py-1 px-3 bg-muted/50 rounded-md">
              ✅ {t("tasks.allTasksComplete")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
