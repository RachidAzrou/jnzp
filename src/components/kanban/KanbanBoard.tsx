import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
  wip_limit: number | null;
  is_done?: boolean;
}

interface Task {
  id: string;
  org_id: string;
  dossier_id: string | null;
  task_type: string | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  column_id: string | null;
  board_id: string;
  auto_complete_trigger: string | null;
  assignee_id: string | null;
  position: number;
  labels: string[];
  due_date: string | null;
  created_at: string;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  metadata?: { auto?: boolean; source?: string };
  comments_count?: number;
  attachments_count?: number;
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
    fetchBoardData();
  }, []);

  useEffect(() => {
    // Realtime subscription for tasks
    const channel = supabase
      .channel('kanban-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
        },
        (payload) => handleTaskChange(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    try {
      setLoading(true);

      // Fetch columns from database
      const { data: columnsData, error: columnsError } = await supabase
        .from('task_board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('order_idx');

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch tasks
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole) return;

      // Fetch non-archived tasks only
      const { data: tasksData, error: tasksError } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('board_id', boardId)
        .is('archived_at', null)
        .order('position');

      if (tasksError) throw tasksError;
      setTasks((tasksData as any) || []);
    } catch (error: any) {
      console.error('Error fetching board data:', error);
      toast({
        title: 'Fout bij laden',
        description: error.message,
        variant: 'destructive',
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
    const newColumnId = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldColumnId = task.column_id;

    // Check if we're moving to a different column
    if (oldColumnId === newColumnId) return;

    // Save old state for rollback
    const previousTasks = [...tasks];

    // Calculate new position (at the end of target column)
    const targetColumnTasks = tasks.filter(t => t.column_id === newColumnId);
    const newPosition = targetColumnTasks.length;

    // Optimistic update
    setTasks((current) =>
      current.map((t) =>
        t.id === taskId ? { ...t, column_id: newColumnId, position: newPosition } : t
      )
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update task column_id and position
      const { error } = await supabase
        .from('kanban_tasks')
        .update({ column_id: newColumnId, position: newPosition })
        .eq('id', taskId);

      if (error) {
        // Rollback on error
        setTasks(previousTasks);
        throw error;
      }

      // Log activity
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        action: 'MOVED',
        from_value: oldColumnId || 'unassigned',
        to_value: newColumnId,
        metadata: {
          from_column: columns.find((c) => c.id === oldColumnId)?.label || 'Geen kolom',
          to_column: columns.find((c) => c.id === newColumnId)?.label || 'Onbekend',
        },
      });

      toast({
        title: "Taak verplaatst",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon taak niet verplaatsen",
        variant: "destructive",
      });
      // Rollback on error
      setTasks(previousTasks);
    }
  };

  const handleMarkTaskAsDone = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.is_blocked) {
      toast({
        title: "Kan niet afronden",
        description: task?.blocked_reason || "Deze taak kan niet afgerond worden",
        variant: "destructive",
      });
      return;
    }

    // Find the "done" column (is_done = true)
    const { data: doneColumns } = await supabase
      .from('task_board_columns')
      .select('id')
      .eq('board_id', boardId)
      .eq('is_done', true)
      .limit(1);

    if (!doneColumns || doneColumns.length === 0) {
      toast({
        title: "Fout",
        description: "Kan 'Afgerond' kolom niet vinden",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("kanban_tasks")
      .update({ column_id: doneColumns[0].id })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Fout",
        description: "Kon taak niet afronden",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Taak afgerond",
      });
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

  // Organize tasks by column_id
  const tasksByColumn: Record<string, Task[]> = {};
  for (const task of filteredTasks) {
    const colId = task.column_id || '__unassigned__';
    if (!tasksByColumn[colId]) {
      tasksByColumn[colId] = [];
    }
    tasksByColumn[colId].push(task);
  }
  
  // Sort tasks within each column by position
  Object.keys(tasksByColumn).forEach(colId => {
    tasksByColumn[colId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {columns
          .sort((a, b) => a.order_idx - b.order_idx)
          .map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn[column.id] || []}
              onTaskClick={onTaskClick}
              onMarkTaskAsDone={handleMarkTaskAsDone}
              dragEnabled={true}
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
