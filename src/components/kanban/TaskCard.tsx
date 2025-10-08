import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface Task {
  id: string;
  dossier_id: string | null;
  task_type: string | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  column_id: string | null;
  board_id: string;
  auto_complete_trigger: string | null;
  assignee_id: string | null;
  labels: string[];
  due_date: string | null;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      URGENT: 'Urgent',
      HIGH: 'Hoog',
      MEDIUM: 'Normaal',
      LOW: 'Laag'
    };
    return labels[priority] || priority;
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <div className="space-y-1">
          {task.task_type && (
            <Badge variant="outline" className="text-xs mb-1">
              {task.task_type}
            </Badge>
          )}
          <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Auto-complete indicator */}
        {task.auto_complete_trigger && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="truncate">Auto: {task.auto_complete_trigger}</span>
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
              {getPriorityLabel(task.priority)}
            </Badge>
            
            {isOverdue && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">Te laat</span>
              </div>
            )}
          </div>

          {task.assignee_id && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">JD</AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Due date */}
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(task.due_date), {
                addSuffix: true,
                locale: nl
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
