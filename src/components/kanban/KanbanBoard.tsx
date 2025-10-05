import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { AlertCircle } from "lucide-react";

interface Column {
  id: string;
  key: string;
  label: string;
  order_idx: number;
  is_done: boolean;
  wip_limit: number | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee_id: string | null;
  column_id: string;
  position: number;
  labels: string[];
  dossier_id: string | null;
  due_date: string | null;
}

interface KanbanBoardProps {
  boardId: string;
  searchQuery: string;
  priorityFilter: string;
  assigneeFilter: string;
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({
  boardId,
  searchQuery,
  priorityFilter,
  assigneeFilter,
  onTaskClick
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    // Realtime subscriptions
    const tasksChannel = supabase
      .channel(`kanban-tasks-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          handleTaskChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [boardId]);

  const handleTaskChange = (payload: any) => {
    const { eventType, new: newTask, old: oldTask } = payload;

    setTasks((current) => {
      if (eventType === 'INSERT') {
        return [...current, newTask as Task];
      }
      if (eventType === 'UPDATE') {
        return current.map((t) => (t.id === newTask.id ? newTask as Task : t));
      }
      if (eventType === 'DELETE') {
        return current.filter((t) => t.id !== oldTask.id);
      }
      return current;
    });
  };

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('task_board_columns' as any)
        .select('*')
        .eq('board_id', boardId)
        .order('order_idx');

      if (columnsError) throw columnsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('kanban_tasks' as any)
        .select('*')
        .eq('board_id', boardId)
        .eq('is_archived', false)
        .order('position');

      if (tasksError) throw tasksError;

      setColumns((columnsData as any) || []);
      setTasks((tasksData as any) || []);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: "Kon bord niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldColumnId = task.column_id;
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const oldColumn = columns.find((c) => c.id === oldColumnId);

    // Check if we're moving to a different column
    if (oldColumnId === targetColumnId) return;

    // Optimistic update
    setTasks((current) =>
      current.map((t) =>
        t.id === taskId ? { ...t, column_id: targetColumnId } : t
      )
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update task column
      const { error } = await supabase
        .from("kanban_tasks" as any)
        .update({
          column_id: targetColumnId,
          position: 0,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Determine activity type based on column transitions
      let activityType = "MOVED";
      if (targetColumn?.is_done && !oldColumn?.is_done) {
        activityType = "CLOSED";
      } else if (!targetColumn?.is_done && oldColumn?.is_done) {
        activityType = "REOPENED";
      }

      // Log activity
      await supabase.from("task_activities" as any).insert({
        task_id: taskId,
        user_id: user.id,
        type: activityType,
        meta: {
          from_column: oldColumn?.label || "Onbekend",
          to_column: targetColumn?.label || "Onbekend",
        },
      });

      toast({
        title: activityType === "CLOSED" ? "Taak afgesloten" : activityType === "REOPENED" ? "Taak heropend" : "Taak verplaatst",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: "Kon taak niet verplaatsen",
        variant: "destructive",
      });
      // Rollback on error
      fetchBoardData();
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    // Assignee filter
    if (assigneeFilter === 'me') {
      // TODO: Check if current user is assignee
      return task.assignee_id !== null;
    }
    if (assigneeFilter === 'unassigned' && task.assignee_id !== null) {
      return false;
    }

    return true;
  });

  // Group tasks by column
  const tasksByColumn = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter((task) => task.column_id === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Geen kolommen geconfigureerd voor dit bord
          </p>
        </div>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns
          .sort((a, b) => a.order_idx - b.order_idx)
          .map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn[column.id] || []}
              onTaskClick={onTaskClick}
            />
          ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-50">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
