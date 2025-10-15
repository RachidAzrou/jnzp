import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Send,
  Upload,
  FileText,
  Download,
  X,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  org_id?: string;
  board_id?: string;
  column_id?: string | null;
  dossier_id?: string | null;
  title: string;
  description?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignee_id?: string | null;
  due_date?: string | null;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  is_deferred?: boolean;
  deferred_reason?: string | null;
  metadata?: { auto?: boolean; source?: string };
  created_at?: string;
  updated_at?: string;
  task_type?: string | null;
  labels?: string[];
  auto_complete_trigger?: string | null;
  position?: number;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: any;
}

interface Activity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  from_value: any;
  to_value: any;
  metadata: any;
  created_at: string;
  profiles?: any;
}

interface Attachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}


export function TaskDetailDialog({ task, open, onOpenChange, onUpdate }: TaskDetailDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assignedUser, setAssignedUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Task['priority'],
    assignee_id: "",
    due_date: "",
    is_deferred: false,
    deferred_reason: "",
  });

  useEffect(() => {
    if (task && open) {
      console.log('TaskDetailDialog loaded with:', {
        title: task.title,
        priority: task.priority,
        assignee_id: task.assignee_id,
        org_id: task.org_id,
        description: task.description,
        due_date: task.due_date,
      });
      
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        assignee_id: task.assignee_id || "",
        due_date: task.due_date || "",
        is_deferred: task.is_deferred || false,
        deferred_reason: task.deferred_reason || "",
      });
      fetchComments();
      fetchActivities();
      fetchAttachments();
      fetchTeamMembers();
      if (task.assignee_id) {
        fetchAssignedUser(task.assignee_id);
      } else {
        setAssignedUser(null);
      }
    }
  }, [task, open]);

  // Realtime subscriptions
  useEffect(() => {
    if (!task || !open) return;

    const commentsChannel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments' as any,
          filter: `task_id=eq.${task.id}`,
        },
        () => fetchComments()
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel(`task-activities-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_activities' as any,
          filter: `task_id=eq.${task.id}`,
        },
        () => fetchActivities()
      )
      .subscribe();

    const attachmentsChannel = supabase
      .channel(`task-attachments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments' as any,
          filter: `task_id=eq.${task.id}`,
        },
        () => fetchAttachments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(attachmentsChannel);
    };
  }, [task, open]);

  const fetchComments = async () => {
    if (!task) return;
    try {
      const { data, error } = await (supabase as any)
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchActivities = async () => {
    if (!task) return;
    try {
      const { data, error } = await (supabase as any)
        .from('task_activities')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchAttachments = async () => {
    // Task attachments table doesn't exist yet
    setAttachments([]);
  };

  const fetchTeamMembers = async () => {
    if (!task) return;
    
    let orgId = task.org_id;
    
    // Fallback: get org_id from current user if not on task
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!userRole) return;
      orgId = userRole.organization_id;
    }
    
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, profiles(id, full_name, email)')
      .eq('organization_id', orgId);

    if (data) {
      setTeamMembers(data.map((r: any) => ({
        id: r.user_id,
        name: r.profiles?.full_name || r.profiles?.email || t("tasks.unknown"),
      })));
    }
  };

  const fetchAssignedUser = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setAssignedUser(data);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: user.id,
          message: newComment.trim(),
        });

      if (error) {
        toast({
          title: t("tasks.error"),
          description: t("tasks.cannotAddComment"),
          variant: "destructive",
        });
      } else {
        setNewComment("");
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleUpdateTask = async () => {
    if (!task) return;
    
    if (formData.is_deferred && !formData.deferred_reason.trim()) {
      toast({
        title: t("tasks.reasonRequired"),
        description: t("tasks.reasonRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { error } = await (supabase as any)
      .from('kanban_tasks')
      .update({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assignee_id: formData.assignee_id || null,
        due_date: formData.due_date || null,
        is_deferred: formData.is_deferred,
        deferred_reason: formData.is_deferred ? formData.deferred_reason : null,
      })
      .eq('id', task.id);

    setLoading(false);

    if (error) {
      toast({
        title: t("tasks.error"),
        description: t("tasks.cannotUpdate"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("tasks.taskUpdated"),
      });
      setEditMode(false);
      onUpdate?.();
    }
  };

  const handleMarkAsDone = async () => {
    if (!task) return;

    const { data: doneColumn } = await supabase
      .from('task_board_columns')
      .select('id')
      .eq('board_id', task.board_id)
      .eq('is_done', true)
      .single();

    if (!doneColumn) {
      toast({
        title: t("tasks.error"),
        description: t("tasks.cannotFindDoneColumn"),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('kanban_tasks')
      .update({ column_id: doneColumn.id })
      .eq('id', task.id);

    if (error) {
      toast({
        title: t("tasks.error"),
        description: t("tasks.cannotComplete"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("tasks.taskCompleted"),
      });
      onUpdate?.();
      onOpenChange(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    if (!confirm(t("tasks.confirmDelete"))) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', task.id);

    setLoading(false);

    if (error) {
      toast({
        title: t("tasks.error"),
        description: t("tasks.cannotDelete"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("tasks.taskDeleted"),
      });
      onUpdate?.();
      onOpenChange(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${task.id}-${Date.now()}.${fileExt}`;
    const filePath = `task-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: t("tasks.uploadError"),
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Store file path only - signed URLs will be generated on-demand for security

    try {
      const { error: dbError } = await (supabase as any)
        .from('task_attachments')
        .insert({
          task_id: task.id,
          file_url: filePath, // Store path, not public URL
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        });

      setUploading(false);

      if (dbError) {
        toast({
          title: t("tasks.error"),
          description: t("tasks.cannotSaveAttachment"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error uploading attachment:', err);
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {
        toast({
          title: t("tasks.error"),
          description: t("tasks.cannotDelete"),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const getActivityDescription = (activity: Activity) => {
    const userName = activity.profiles?.display_name || 'Gebruiker';
    
    switch (activity.action) {
      case 'CREATED':
        return `${userName} heeft deze taak aangemaakt`;
      case 'MOVED':
        // Use metadata for column names if available, fallback to values
        const fromCol = activity.metadata?.from_column || activity.from_value || 'Onbekend';
        const toCol = activity.metadata?.to_column || activity.to_value || 'Onbekend';
        return `${userName} verplaatst van "${fromCol}" naar "${toCol}"`;
      case 'ASSIGNED':
        return `${userName} heeft deze taak toegewezen`;
      case 'UNASSIGNED':
        return `${userName} heeft de toewijzing verwijderd`;
      case 'BLOCKED':
        return `${userName} heeft deze taak geblokkeerd`;
      case 'UNBLOCKED':
        return `${userName} heeft de blokkering opgeheven`;
      case 'COMPLETED':
        return `${userName} heeft deze taak afgerond`;
      case 'REOPENED':
        return `${userName} heeft deze taak heropend`;
      case 'UPDATED':
        const changes = activity.metadata?.changes || 'details bijgewerkt';
        return `${userName} heeft ${changes}`;
      case 'COMMENTED':
        return `${userName} heeft gereageerd`;
      default:
        return `${userName} - ${activity.action}`;
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col gap-0 p-0" aria-describedby="task-detail-description">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-background to-muted/20">
          <DialogTitle className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <span className="flex-1 text-2xl font-bold">{editMode ? t("tasks.editTask") : task.title}</span>
              <div className="flex items-center gap-2">
                {task.priority && (
                  <Badge 
                    className="text-sm px-3 py-1" 
                    variant={
                      task.priority === 'CRITICAL' ? 'destructive' : 
                      task.priority === 'HIGH' ? 'default' : 
                      'secondary'
                    }
                  >
                    {t(`tasks.${task.priority.toLowerCase()}`)}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Key Info Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {task.dossier_id && (
                <div className="flex items-center gap-1.5 text-primary">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Dossier: {task.dossier_id.substring(0, 8)}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  <span>Deadline: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: nl })}</span>
                </div>
              )}
              {assignedUser && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {assignedUser.name?.substring(0, 2).toUpperCase() || 'FD'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{assignedUser.name}</span>
                </div>
              )}
            </div>
          </DialogTitle>
          <p id="task-detail-description" className="sr-only">
            Taakdetails voor {task.title}. {task.description || "Geen beschrijving beschikbaar."}
          </p>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mt-4 mx-6">
            <TabsTrigger value="details">{t("tasks.details")}</TabsTrigger>
            <TabsTrigger value="activity">
              {t("tasks.activity")} ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="comments">
              {t("tasks.comments")} ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="attachments">
              {t("tasks.attachments")} ({attachments.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <div className="space-y-6">
              {/* Beschrijving - meest prominent */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
                <Label className="text-sm font-medium text-muted-foreground">{t("tasks.descriptionLabel")}</Label>
                {editMode ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="mt-1 text-base"
                    placeholder={t("tasks.addDescription")}
                  />
                ) : (
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {task.description || t("tasks.noDescription")}
                  </p>
                )}
              </div>

              {/* Grid met belangrijke details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-lg border bg-card">
                  <Label className="text-sm font-medium text-muted-foreground">{t("tasks.titleLabel")}</Label>
                  {editMode ? (
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-base font-semibold">{task.title}</p>
                  )}
                </div>

                <div className="space-y-2 p-4 rounded-lg border bg-card">
                  <Label className="text-sm font-medium text-muted-foreground">{t("tasks.statusLabel")}</Label>
                  <Badge className="text-sm w-fit" variant={task.is_blocked ? "destructive" : "outline"}>
                    {task.is_blocked ? t("tasks.blocked") : t("tasks.active")}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("tasks.assignedTo")}</Label>
                {editMode ? (
                  <Select
                    value={formData.assignee_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, assignee_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("tasks.selectTeamMemberPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("tasks.notAssigned")}</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">
                    {assignedUser ? (assignedUser.full_name || assignedUser.email) : t("tasks.notAssigned")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("tasks.priorityLabel")}</Label>
                {editMode ? (
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as Task['priority'] })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t("tasks.low")}</SelectItem>
                      <SelectItem value="MEDIUM">{t("tasks.medium")}</SelectItem>
                      <SelectItem value="HIGH">{t("tasks.high")}</SelectItem>
                      <SelectItem value="CRITICAL">{t("tasks.critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge variant={
                      task.priority === 'CRITICAL' ? 'destructive' : 
                      task.priority === 'HIGH' ? 'default' : 
                      'secondary'
                    }>
                      {t(`tasks.${(task.priority || 'MEDIUM').toLowerCase()}`)}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">{t("tasks.dueDate")}</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {task.due_date
                      ? format(new Date(task.due_date), "PPP", { locale: nl })
                      : t("tasks.noDeadline")}
                  </p>
                )}
              </div>

              {editMode && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="deferred"
                      checked={formData.is_deferred}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_deferred: checked })}
                    />
                    <Label htmlFor="deferred" className="cursor-pointer">
                      {t("tasks.deferTask")}
                    </Label>
                  </div>
                  {formData.is_deferred && (
                    <Textarea
                      placeholder={t("tasks.reasonForDefer")}
                      value={formData.deferred_reason}
                      onChange={(e) => setFormData({ ...formData, deferred_reason: e.target.value })}
                      className="min-h-[80px]"
                    />
                  )}
                </div>
              )}

              {!editMode && task.is_deferred && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("tasks.taskDeferred")}</AlertTitle>
                  <AlertDescription>{task.deferred_reason}</AlertDescription>
                </Alert>
              )}

              {task.metadata?.auto && (
                <div className="text-sm bg-muted p-3 rounded-lg flex items-center gap-2">
                  <span>⚙️</span>
                  <span className="font-medium">Automatisch aangemaakt</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {editMode ? (
                <>
                  <Button onClick={handleUpdateTask} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {t("tasks.save")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    {t("tasks.cancel")}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditMode(true)}>
                    {t("tasks.edit")}
                  </Button>
                  <Button 
                    onClick={handleMarkAsDone} 
                    variant="default"
                    disabled={task.is_blocked}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("tasks.markAsDone")}
                  </Button>
                  {!task.metadata?.auto && (
                    <Button 
                      onClick={handleDeleteTask} 
                      variant="destructive"
                      disabled={loading}
                      className="ml-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </Button>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-hidden mt-4 px-6 pb-6">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {activity.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p>{getActivityDescription(activity)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: nl
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="flex flex-col justify-between mt-4 px-6 pb-6 h-[calc(85vh-200px)]">
            <ScrollArea className="flex-1 pr-4 pb-3">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted rounded-lg p-3">
                      <p className="font-medium text-xs mb-1">
                        {comment.profiles?.display_name || 'Gebruiker'}
                      </p>
                      <p>{comment.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: nl
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-3 border-t mt-auto">
              <Input
                placeholder="Voeg een reactie toe..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="flex-1 overflow-hidden flex flex-col gap-3 mt-4 px-6 pb-6 h-[calc(85vh-200px)]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ''}
                          {' · '}
                          {formatDistanceToNow(new Date(attachment.created_at), {
                            addSuffix: true,
                            locale: nl
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(attachment.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-2 border-t">
              <label htmlFor="file-upload">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploaden..." : "Bestand uploaden"}
                  </span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}