import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskProgressWidgetProps {
  dossierId: string;
}

export function TaskProgressWidget({ dossierId }: TaskProgressWidgetProps) {
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
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">Takenvoortgang</CardTitle>
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
        <CardDescription>
          Voltooid voor deze fase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="relative h-3 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">
                {completedTasks} van {totalTasks} taken
              </span>
            </div>
            <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
              {progressPercentage}%
            </Badge>
          </div>

          {/* Completion message */}
          {progressPercentage === 100 && (
            <div className="text-xs text-center text-green-700 dark:text-green-400 font-medium py-1 px-3 bg-green-100 dark:bg-green-900/30 rounded-md">
              ✅ Alle taken afgerond voor deze fase!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
