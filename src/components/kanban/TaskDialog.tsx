import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface TaskDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
}

export function TaskDialog({ boardId, open, onOpenChange, task }: TaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TE_DOEN',
    dossier_id: '',
    assignee_id: '',
    due_date: undefined as Date | undefined,
    labels: [] as string[]
  });
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      fetchDossiers();
      fetchTeamMembers();
      fetchCurrentUser();
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'MEDIUM',
          status: task.status || 'TE_DOEN',
          dossier_id: task.dossier_id || '',
          assignee_id: task.assignee_id || '',
          due_date: task.due_date ? new Date(task.due_date) : undefined,
          labels: task.labels || []
        });
      } else {
        resetForm();
      }
    }
  }, [open, task]);

  // Columns are fixed, no need to fetch
  const fixedColumns = [
    { id: 'TE_DOEN', label: t("tasks.toDo") },
    { id: 'BEZIG', label: t("tasks.inProgress") },
    { id: 'AFGEROND', label: t("tasks.done") },
  ];

  const fetchDossiers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole) return;

    const { data } = await supabase
      .from('dossiers')
      .select('id, ref_number, deceased_name, display_id, status, deleted_at, assigned_fd_org_id')
      .eq('assigned_fd_org_id', userRole.organization_id)
      .is('deleted_at', null)
      .in('status', ['CREATED', 'UNDER_REVIEW', 'IN_PROGRESS', 'COMPLETED'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setDossiers(data);
    }
  };

  const fetchTeamMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole) return;

    const { data } = await supabase
      .from('user_roles')
      .select('user_id, profiles(id, first_name, last_name, email)')
      .eq('organization_id', userRole.organization_id);

    if (data) {
      const members = data.map((r: any) => {
        const profile = r.profiles;
        const name = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || t("tasks.unknown");
        
        return {
          id: r.user_id,
          name: name,
          isCurrentUser: r.user_id === user.id
        };
      });

      // Sorteer: huidige gebruiker eerst, daarna de rest alfabetisch
      members.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return a.name.localeCompare(b.name);
      });

      setTeamMembers(members);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'TE_DOEN',
      dossier_id: '',
      assignee_id: currentUserId || '',
      due_date: undefined,
      labels: []
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: t("tasks.titleRequired"),
        description: t("tasks.titleRequiredDesc"),
        variant: "destructive"
      });
      return;
    }


    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole) throw new Error('No organization found');

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('kanban_tasks')
          .update({
            title: formData.title,
            description: formData.description,
            priority: formData.priority as 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT',
            status: formData.status,
            dossier_id: formData.dossier_id || null,
            assignee_id: formData.assignee_id || null,
            due_date: formData.due_date?.toISOString().split('T')[0],
            labels: formData.labels
          })
          .eq('id', task.id);

        if (error) throw error;

        // Log activity
        await supabase.from('task_activities').insert({
          task_id: task.id,
          user_id: user.id,
          action: 'UPDATED',
          metadata: { changes: 'Updated task details' }
        });

        toast({
          title: t("tasks.taskUpdated"),
          description: t("tasks.taskUpdatedDesc")
        });
      } else {
        // Get or create board for the organization
        const { data: board, error: boardError } = await supabase
          .from('task_boards')
          .select('id')
          .eq('org_id', userRole.organization_id)
          .maybeSingle();

        let boardId = board?.id;

        if (!boardId) {
          const { data: newBoard, error: createError } = await supabase
            .from('task_boards')
            .insert({ org_id: userRole.organization_id, name: 'Taken' })
            .select('id')
            .single();

          if (createError) throw createError;
          boardId = newBoard.id;
        }

        // Get the column_id for the selected status (or default to first todo column)
        const { data: column, error: columnError } = await supabase
          .from('task_board_columns')
          .select('id')
          .eq('board_id', boardId)
          .eq('key', formData.status === 'TE_DOEN' ? 'todo' : 
                     formData.status === 'BEZIG' ? 'doing' : 'done')
          .maybeSingle();

        if (columnError) throw columnError;
        if (!column) throw new Error('Column not found for status');

        // Get next position for this column
        const { data: columnTasks } = await supabase
          .from('kanban_tasks')
          .select('position')
          .eq('column_id', column.id)
          .order('position', { ascending: false })
          .limit(1);

        const nextPosition = columnTasks && columnTasks.length > 0 
          ? (columnTasks[0].position ?? 0) + 1 
          : 0;

        // Create new manual task with assignee default to current user
        const { data: newTask, error } = await supabase
          .from('kanban_tasks')
          .insert({
            org_id: userRole.organization_id,
            board_id: boardId,
            column_id: column.id,
            dossier_id: formData.dossier_id || null,
            title: formData.title,
            description: formData.description,
            priority: formData.priority as 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT',
            status: formData.status,
            reporter_id: user.id,
            assignee_id: formData.assignee_id || user.id,
            created_by: user.id,
            due_date: formData.due_date?.toISOString().split('T')[0],
            labels: formData.labels,
            position: nextPosition
          } as any)
          .select()
          .single();

        if (error) throw error;

        // Log activity
        if (newTask) {
          await supabase.from('task_activities').insert({
            task_id: newTask.id,
            user_id: user.id,
            action: 'CREATED',
            metadata: { title: formData.title }
          });
        }

        toast({
          title: t("tasks.taskCreated"),
          description: t("tasks.taskCreatedDesc")
        });
      }

      // Close dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? t("tasks.editTask") : t("tasks.newTask")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("tasks.title")} *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t("forms.placeholders.taskTitle")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("tasks.description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("forms.placeholders.taskDescription")}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("tasks.dossier")}</Label>
            <Select
              value={formData.dossier_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, dossier_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tasks.selectDossier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("tasks.noDossier")}</SelectItem>
                {dossiers.map((dossier) => (
                  <SelectItem key={dossier.id} value={dossier.id}>
                    {dossier.display_id || dossier.ref_number} - {dossier.deceased_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tasks.assignedTo")}</Label>
            <Select
              value={formData.assignee_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, assignee_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tasks.selectTeamMember")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("tasks.notAssigned")}</SelectItem>
                {teamMembers.map((member: any) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.isCurrentUser ? `${member.name} (${t("tasks.you")})` : member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("tasks.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fixedColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("tasks.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t("tasks.low")}</SelectItem>
                  <SelectItem value="MEDIUM">{t("tasks.medium")}</SelectItem>
                  <SelectItem value="HIGH">{t("tasks.high")}</SelectItem>
                  <SelectItem value="URGENT">{t("tasks.critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("tasks.deadline")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? (
                    format(formData.due_date, "PPP", { locale: nl })
                  ) : (
                    <span>{t("tasks.selectDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("tasks.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("tasks.updating") : task ? t("tasks.update") : t("tasks.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
