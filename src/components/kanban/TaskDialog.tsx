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
    { id: 'TE_DOEN', label: 'Te doen' },
    { id: 'BEZIG', label: 'Bezig' },
    { id: 'AFGEROND', label: 'Afgerond' },
  ];

  const fetchDossiers = async () => {
    const { data } = await supabase
      .from('dossiers')
      .select('id, ref_number, deceased_name, display_id')
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
      .select('user_id, profiles(id, display_name, email)')
      .eq('organization_id', userRole.organization_id);

    if (data) {
      setTeamMembers(data.map((r: any) => ({
        id: r.user_id,
        name: r.profiles?.display_name || r.profiles?.email || 'Onbekend',
      })));
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
        title: "Titel vereist",
        description: "Voer een titel in voor de taak",
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
          title: "Taak bijgewerkt",
          description: "De taak is succesvol bijgewerkt"
        });
      } else {
        // Create new manual task with assignee default to current user
        const { data: newTask, error } = await supabase
          .from('kanban_tasks')
          .insert({
            org_id: userRole.organization_id,
            dossier_id: formData.dossier_id || null,
            title: formData.title,
            description: formData.description,
            priority: formData.priority as 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT',
            status: formData.status,
            reporter_id: user.id,
            assignee_id: formData.assignee_id || user.id,
            created_by: user.id,
            due_date: formData.due_date?.toISOString().split('T')[0],
            labels: formData.labels
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
          title: "Taak aangemaakt",
          description: "De taak is succesvol aangemaakt"
        });
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Fout",
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
          <DialogTitle>{task ? 'Taak bewerken' : 'Nieuwe taak'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Wat moet er gebeuren?"
            />
          </div>

          <div className="space-y-2">
            <Label>Beschrijving</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Voeg details toe..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Dossier (optioneel)</Label>
            <Select
              value={formData.dossier_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, dossier_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een dossier (optioneel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen dossier</SelectItem>
                {dossiers.map((dossier) => (
                  <SelectItem key={dossier.id} value={dossier.id}>
                    {dossier.display_id || dossier.ref_number} - {dossier.deceased_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Toegewezen aan</Label>
            <Select
              value={formData.assignee_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, assignee_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer teamlid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Niet toegewezen</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
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
              <Label>Prioriteit</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Laag</SelectItem>
                  <SelectItem value="MEDIUM">Normaal</SelectItem>
                  <SelectItem value="HIGH">Hoog</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? (
                    format(formData.due_date, "PPP", { locale: nl })
                  ) : (
                    <span>Selecteer een datum</span>
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
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Bezig...' : task ? 'Bijwerken' : 'Aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
