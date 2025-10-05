import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  dossier_id: string;
  task_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_to_user_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  metadata: any;
  created_at: string;
  dossiers: {
    display_id: string;
    deceased_name: string;
  };
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tasks-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('tasks' as any)
        .select(`
          *,
          dossiers (
            display_id,
            deceased_name
          )
        `)
        .order('priority', { ascending: false })
        .order('due_at', { ascending: true });

      // Filter by status
      if (filter === 'pending') {
        query = query.in('status', ['PENDING', 'IN_PROGRESS']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'COMPLETED');
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data as any || []);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: "Taken konden niet worden geladen",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks' as any)
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Taak bijgewerkt",
        description: `Status gewijzigd naar ${getStatusLabel(newStatus)}`
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'MEDIUM':
        return <MinusCircle className="h-4 w-4 text-orange-500" />;
      case 'LOW':
        return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Te doen',
      IN_PROGRESS: 'Bezig',
      COMPLETED: 'Voltooid',
      CANCELLED: 'Geannuleerd'
    };
    return labels[status] || status;
  };

  const getTaskTypeLabel = (taskType: string) => {
    const labels: Record<string, string> = {
      DOC_REVIEW: 'Document beoordelen',
      DOC_REUPLOAD_REQUEST: 'Document opnieuw uploaden',
      INTAKE_COMPLETE: 'Intake afronden',
      MOSQUE_CONFIRM: 'Moskee bevestigen',
      WASH_START: 'Wassplaats starten',
      FLIGHT_REGISTER: 'Vlucht registreren',
      LEGAL_HOLD_FOLLOW_UP: 'Legal hold opvolgen'
    };
    return labels[taskType] || taskType.replace(/_/g, ' ');
  };

  const isOverdue = (task: Task) => {
    if (!task.due_at || task.status === 'COMPLETED') return false;
    return new Date(task.due_at) < new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Taken</h2>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Alle
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Lopend
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Voltooid
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Geen taken gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card 
              key={task.id}
              className={`hover:shadow-md transition-shadow ${
                isOverdue(task) ? 'border-red-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.status === 'COMPLETED'}
                    onCheckedChange={(checked) => {
                      handleStatusChange(
                        task.id,
                        checked ? 'COMPLETED' : 'PENDING'
                      );
                    }}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getPriorityIcon(task.priority)}
                          <h3 className="font-medium">
                            {getTaskTypeLabel(task.task_type)}
                          </h3>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          {isOverdue(task) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Te laat
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/dossiers/${task.dossier_id}`)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {task.dossiers?.display_id} - {task.dossiers?.deceased_name}
                        </button>
                      </div>

                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>

                    {task.due_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Deadline: {formatDistanceToNow(new Date(task.due_at), {
                            addSuffix: true,
                            locale: nl
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
