import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Lock,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

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
  is_deferred?: boolean;
  deferred_reason?: string | null;
  metadata?: { auto?: boolean; source?: string };
  comments_count?: number;
  attachments_count?: number;
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

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { 
          variant: 'default' as const, 
          label: 'Kritisch',
          className: 'bg-blue-500 text-white hover:bg-blue-600'
        };
      case 'HIGH':
        return { 
          variant: 'destructive' as const, 
          label: 'Hoog',
          className: 'bg-red-500 text-white hover:bg-red-600'
        };
      case 'MEDIUM':
        return { 
          variant: 'default' as const, 
          label: 'Medium',
          className: 'bg-orange-500 text-white hover:bg-orange-600'
        };
      case 'LOW':
        return { 
          variant: 'secondary' as const, 
          label: 'Laag',
          className: 'bg-green-500 text-white hover:bg-green-600'
        };
      default:
        return { 
          variant: 'secondary' as const, 
          label: priority,
          className: ''
        };
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const priorityConfig = getPriorityConfig(task.priority);
  const isAutomatic = task.metadata?.auto === true;

  return (
    <TooltipProvider>
      <Card
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={!task.is_blocked ? onClick : undefined}
        className={`
          cursor-grab active:cursor-grabbing 
          hover:shadow-lg transition-all duration-200
          ${isDragging ? 'opacity-50' : ''}
          ${task.is_blocked ? 'opacity-60 cursor-not-allowed border-destructive ring-2 ring-destructive/20' : ''}
          ${isOverdue && !task.is_blocked ? 'border-destructive/50' : ''}
        `}
      >
        <CardContent className="p-3 space-y-2.5">
          {/* Header: Title + Blocked/Auto/Deferred indicator */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm leading-tight ${isOverdue ? 'text-destructive' : ''}`}>
                {task.title}
              </h4>
              {task.is_deferred && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-500">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">Uitgesteld</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {task.is_blocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      {task.blocked_reason || 'Geblokkeerd door parket (Legal Hold)'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {isAutomatic && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Automatisch aangemaakt</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Priority + Due date row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <Badge 
              variant={priorityConfig.variant} 
              className={`text-xs ${priorityConfig.className}`}
            >
              {priorityConfig.label}
            </Badge>
            
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(task.due_date).toLocaleDateString("nl-BE", {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                {isOverdue && <AlertCircle className="h-3 w-3" />}
              </div>
            )}
          </div>

          {/* Footer: Assignee + Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {task.assignee_id && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">FD</AvatarFallback>
                </Avatar>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(task.comments_count ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{task.comments_count}</span>
                </div>
              )}
              {(task.attachments_count ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{task.attachments_count}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
