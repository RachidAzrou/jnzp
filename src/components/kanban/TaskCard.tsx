import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Lock,
  Settings,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useCanDrag } from "@/hooks/useCanDrag";

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
  inModal?: boolean;
  inList?: boolean;
  dragEnabled?: boolean;
  onMarkAsDone?: () => void;
}

export function TaskCard({ 
  task, 
  onClick, 
  inModal = false, 
  inList = false, 
  dragEnabled = true,
  onMarkAsDone 
}: TaskCardProps) {
  const canDrag = useCanDrag();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: !dragEnabled || task.is_blocked,
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
          className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
        };
      case 'HIGH':
        return { 
          variant: 'default' as const, 
          label: 'Hoog',
          className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
        };
      case 'MEDIUM':
        return { 
          variant: 'default' as const, 
          label: 'Medium',
          className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
        };
      case 'LOW':
        return { 
          variant: 'secondary' as const, 
          label: 'Laag',
          className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        };
      default:
        return { 
          variant: 'secondary' as const, 
          label: priority,
          className: 'bg-muted text-muted-foreground'
        };
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const priorityConfig = getPriorityConfig(task.priority);
  const isAutomatic = task.metadata?.auto === true;
  
  // Show complete button: in modal/list, on mobile/tablet, or when drag is disabled/blocked
  const showCompleteBtn = inModal || inList || !canDrag || !dragEnabled || task.is_blocked;
  
  // Debug logging
  if (task.title.includes("Intake") && !inModal && !inList) {
    console.log("TaskCard Debug:", {
      title: task.title,
      canDrag,
      dragEnabled,
      inModal,
      inList,
      isBlocked: task.is_blocked,
      showCompleteBtn
    });
  }

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
          hover:border-primary/50 transition-colors duration-150
          bg-card
          ${isDragging ? 'opacity-50' : ''}
          ${task.is_blocked ? 'opacity-60 cursor-not-allowed border-destructive bg-destructive/5' : ''}
          ${isOverdue && !task.is_blocked ? 'border-destructive/50 bg-destructive/5' : ''}
        `}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Title + Blocked/Auto/Deferred indicator */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm leading-snug ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                {task.title}
              </h4>
              {task.is_deferred && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Uitgesteld</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {task.is_blocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded bg-destructive/10">
                      <Lock className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    </div>
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
                    <div className="p-1 rounded bg-muted">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </div>
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
              className={`text-xs font-normal border ${priorityConfig.className}`}
            >
              {priorityConfig.label}
            </Badge>
            
            {task.due_date && (
              <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {new Date(task.due_date).toLocaleDateString("nl-BE", {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
              </div>
            )}
          </div>

          {/* Footer: Assignee + Badges */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              {task.assignee_id && (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">FD</AvatarFallback>
                </Avatar>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {(task.comments_count ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{task.comments_count}</span>
                </div>
              )}
              {(task.attachments_count ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{task.attachments_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Complete button verborgen - gebruik drag-and-drop */}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
