import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Send,
  Clock,
  User,
  FileText,
  MessageSquare,
  Activity,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface TaskDetailDialogProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

interface ActivityLog {
  id: string;
  user_id: string;
  type: string;
  meta: any;
  created_at: string;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
      });
      fetchComments();
      fetchActivities();
    }
  }, [open, task]);

  useEffect(() => {
    if (!task?.id || !open) return;

    // Realtime subscriptions
    const commentsChannel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel(`task-activities-${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_activities",
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [task?.id, open]);

  const fetchComments = async () => {
    if (!task?.id) return;

    const { data } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    if (data) {
      setComments(data as any);
    }
  };

  const fetchActivities = async () => {
    if (!task?.id) return;

    const { data } = await supabase
      .from("task_activities")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setActivities(data as any);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract @mentions
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1]);
      }

      const { error } = await supabase.from("task_comments").insert({
        task_id: task.id,
        author_id: user.id,
        body: newComment,
      } as any);

      if (error) throw error;

      // Log activity
      await supabase.from("task_activities").insert({
        task_id: task.id,
        user_id: user.id,
        action: "COMMENTED",
        metadata: { comment_preview: newComment.substring(0, 100) },
      });

      setNewComment("");
      toast({
        title: "Opmerking toegevoegd",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("kanban_tasks")
        .update({
          title: formData.title,
          description: formData.description,
          priority: formData.priority as 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT',
        })
        .eq("id", task.id);

      if (error) throw error;

      // Log activity
      await supabase.from("task_activities").insert({
        task_id: task.id,
        user_id: user.id,
        action: "UPDATED",
        metadata: {
          changes: {
            title: task.title !== formData.title,
            description: task.description !== formData.description,
            priority: task.priority !== formData.priority,
          },
        },
      });

      setEditMode(false);
      onUpdate();
      toast({
        title: "Taak bijgewerkt",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("kanban_tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      onOpenChange(false);
      onUpdate();
      toast({
        title: "Taak verwijderd",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityDescription = (activity: ActivityLog) => {
    const meta = activity.meta || {};

    switch (activity.type) {
      case "CREATED":
        return "maakte deze taak aan";
      case "UPDATED":
        return "wijzigde de taak";
      case "MOVED":
        return `verplaatste de taak`;
      case "ASSIGNED":
        return "wees de taak toe";
      case "UNASSIGNED":
        return "verwijderde de toewijzing";
      case "COMMENTED":
        return "plaatste een opmerking";
      case "LABELED":
        return "wijzigde labels";
      case "CLOSED":
        return "sloot de taak";
      case "REOPENED":
        return "heropende de taak";
      default:
        return activity.type;
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              {editMode ? (
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="text-lg font-semibold"
                />
              ) : (
                <span>{task.title}</span>
              )}
            </div>
            {editMode ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdateTask} disabled={loading}>
                  Opslaan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(false)}
                >
                  Annuleren
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  Bewerken
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleDeleteTask}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Verwijderen
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">
              Opmerkingen ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="activity">Activiteit</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <Label>Beschrijving</Label>
                  {editMode ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={6}
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      {task.description || "Geen beschrijving"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioriteit</Label>
                    {editMode ? (
                      <Select
                        value={formData.priority}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Laag</SelectItem>
                          <SelectItem value="MEDIUM">Normaal</SelectItem>
                          <SelectItem value="HIGH">Hoog</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-2">
                        <Badge>{task.priority}</Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Dossier</Label>
                    <p className="text-sm mt-2 font-mono text-muted-foreground">
                      {task.dossier_id ? (
                        <span className="text-foreground">{task.dossier_id.substring(0, 8)}...</span>
                      ) : (
                        "Niet gekoppeld"
                      )}
                    </p>
                  </div>
                </div>

                {task.labels && task.labels.length > 0 && (
                  <div>
                    <Label>Labels</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.labels.map((label: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Aangemaakt</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(task.created_at), {
                      addSuffix: true,
                      locale: nl,
                    })}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4 py-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 pr-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nog geen opmerkingen
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">U</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">Gebruiker</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                        {comment.is_edited && (
                          <Badge variant="outline" className="text-xs">
                            Bewerkt
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Voeg een opmerking toe... (@gebruiker voor mentions)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="py-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-3 pr-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Geen activiteit
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 text-sm border-l-2 pl-3 py-2"
                    >
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Gebruiker</span>
                          <span className="text-muted-foreground">
                            {getActivityDescription(activity)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
