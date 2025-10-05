import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";

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

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isWipLimitExceeded = column.wip_limit && tasks.length > column.wip_limit;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <Card className={isOver ? 'bg-accent/50' : ''}>
        <CardHeader className="pb-3">
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
        <CardContent className="space-y-2 min-h-[200px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
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
