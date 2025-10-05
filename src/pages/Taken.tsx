import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { TaskDetailDialog } from "@/components/kanban/TaskDetailDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Board {
  id: string;
  org_id: string;
  name: string;
}

const Taken = () => {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole) {
        toast({
          title: "Geen organisatie",
          description: "U bent niet gekoppeld aan een organisatie",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Get or create board for this org
      let { data: boardData, error } = await supabase
        .from('task_boards' as any)
        .select('*')
        .eq('org_id', userRole.organization_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Create board if it doesn't exist
      if (!boardData) {
        const { data: newBoard, error: createError } = await supabase
          .from('task_boards' as any)
          .insert({
            org_id: userRole.organization_id,
            name: 'Standaard Takenbord'
          })
          .select()
          .single();

        if (createError) throw createError;
        boardData = newBoard;
      }

      setBoard(boardData as any);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: "Kon takenbord niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Geen takenbord beschikbaar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{board.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sleep taken tussen kolommen om de status te wijzigen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBoard}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe taak
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek taken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioriteit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle prioriteiten</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">Hoog</SelectItem>
                <SelectItem value="MEDIUM">Normaal</SelectItem>
                <SelectItem value="LOW">Laag</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Toegewezen aan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Iedereen</SelectItem>
                <SelectItem value="me">Aan mij</SelectItem>
                <SelectItem value="unassigned">Niet toegewezen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <KanbanBoard
        boardId={board.id}
        searchQuery={searchQuery}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        onTaskClick={(task) => setSelectedTask(task)}
      />

      {/* Task Dialog */}
      <TaskDialog
        boardId={board.id}
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
      />

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={() => {
            setSelectedTask(null);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
};

export default Taken;
