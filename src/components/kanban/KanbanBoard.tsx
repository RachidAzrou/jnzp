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
}

interface Task {
  id: string;
  dossier_id: string | null;
  task_type: string | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  column_id: string; // Changed from status to column_id
  auto_complete_trigger: string | null;
  assignee_id: string | null;
  position: number;
  labels: string[];
  due_date: string | null;
  created_at: string;
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

      // Use fixed columns based on status
      const fixedColumns = [
        { id: 'TE_DOEN', key: 'TE_DOEN', label: 'Te doen', order_idx: 0, wip_limit: null },
        { id: 'BEZIG', key: 'BEZIG', label: 'Bezig', order_idx: 1, wip_limit: null },
        { id: 'AFGEROND', key: 'AFGEROND', label: 'Afgerond', order_idx: 2, wip_limit: null },
      ];
      setColumns(fixedColumns);

      // Fetch tasks
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole) return;

      const { data: tasksData, error: tasksError } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('org_id', userRole.organization_id)
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

    // Optimistic update
    setTasks((current) =>
      current.map((t) =>
        t.id === taskId ? { ...t, column_id: newColumnId } : t
      )
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate new position (at the end)
      const targetColumnTasks = tasks.filter(t => t.column_id === newColumnId);
      const newPosition = targetColumnTasks.length;

      // Update task column_id
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
        from_value: oldColumnId,
        to_value: newColumnId,
        metadata: {
          from_column: columns.find((c) => c.id === oldColumnId)?.label,
          to_column: columns.find((c) => c.id === newColumnId)?.label,
        },
      });

      toast({
        title: "Taak verplaatst",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: "Kon taak niet verplaatsen",
        variant: "destructive",
      });
      // Rollback on error
      setTasks(previousTasks);
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
  const tasksByColumn = filteredTasks.reduce((acc, task) => {
    const columnId = task.column_id;
    if (!acc[columnId]) {
      acc[columnId] = [];
    }
    acc[columnId].push(task);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
