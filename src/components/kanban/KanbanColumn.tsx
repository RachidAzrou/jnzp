import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";

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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  column_id: string | null;
  board_id: string;
  auto_complete_trigger: string | null;
  assignee_id: string | null;
  labels: string[];
  due_date: string | null;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  metadata?: { auto?: boolean; source?: string };
  comments_count?: number;
  attachments_count?: number;
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onMarkTaskAsDone?: (taskId: string) => void;
  dragEnabled?: boolean;
}

export function KanbanColumn({ column, tasks, onTaskClick, onMarkTaskAsDone, dragEnabled = true }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isWipLimitExceeded = column.wip_limit && tasks.length > column.wip_limit;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <Card className={`flex flex-col h-full ${isOver ? 'bg-accent/50' : ''}`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{column.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
                {column.wip_limit && ` / ${column.wip_limit}`}
              </Badge>
            </div>
            {isWipLimitExceeded && (
              <Badge variant="destructive" className="text-xs">
                WIP!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 min-h-[400px] overflow-y-auto">
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick?.(task)}
              dragEnabled={dragEnabled && !task.is_blocked}
              onMarkAsDone={() => onMarkTaskAsDone?.(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Sleep taken hierheen
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
