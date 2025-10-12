import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { TaskDetailDialog } from "@/components/kanban/TaskDetailDialog";
import { Input } from "@/components/ui/input";
import { getOrCreateBoardForOrg } from "@/utils/taskboard";
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
  const { organizationId } = useUserRole();

  useEffect(() => {
    if (organizationId) {
      fetchBoard();
    }
  }, [organizationId]);

  const fetchBoard = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const boardData = await getOrCreateBoardForOrg(organizationId);
      setBoard({
        id: boardData.id,
        org_id: organizationId,
        name: 'Takenbord'
      });
    } catch (error: any) {
      console.error("Error fetching board:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Projectbeheer</p>
                    <h1 className="text-2xl font-bold tracking-tight">Taken</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
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
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
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
                <SelectTrigger className="w-full sm:w-40">
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
                <SelectTrigger className="w-full sm:w-40">
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
    </div>
  );
};

export default Taken;
