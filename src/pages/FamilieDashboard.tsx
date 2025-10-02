import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Upload, 
  MapPin, 
  Building2, 
  Home, 
  Plane, 
  Bell 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DossierData {
  id: string;
  ref_number: string;
  display_id: string | null;
  deceased_name: string;
  status: string;
  legal_hold: boolean;
  flow: string;
  assigned_fd_org_id: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  action: string;
  route: string;
  completed: boolean;
}

export default function FamilieDashboard() {
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    const fetchDossierData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // For now, get the first dossier for this user
      // In production, this would be based on the user's assigned dossier
      const { data: dossierData } = await supabase
        .from('dossiers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dossierData) {
        setDossier(dossierData);
        await checkTasksStatus(dossierData.id);
      }

      // Fetch recent updates (notifications/audit events)
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setUpdates(notificationsData || []);
      setLoading(false);
    };

    const checkTasksStatus = async (dossierId: string) => {
      // Fetch dossier to check flow and FD assignment
      const { data: dossierDetails } = await supabase
        .from('dossiers')
        .select('flow, assigned_fd_org_id, status')
        .eq('id', dossierId)
        .single();

      // Check which tasks are completed
      const { data: familyContacts } = await supabase
        .from('family_contacts')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      const { data: polisChecks } = await supabase
        .from('polis_checks')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId);

      const { data: medicalDocs } = await supabase
        .from('medical_docs')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      // Check planning preferences based on flow
      const { data: mosqueServices } = await supabase
        .from('mosque_services')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      const { data: repatriations } = await supabase
        .from('repatriations')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      const flow = dossierDetails?.flow || 'UNSET';
      const hasFD = !!dossierDetails?.assigned_fd_org_id;
      const flowChosen = flow !== 'UNSET';
      const hasPreferences = flow === 'LOC' 
        ? (mosqueServices && mosqueServices.length > 0)
        : flow === 'REP'
        ? (repatriations && repatriations.length > 0)
        : false;
      const isCompleted = ['READY_FOR_TRANSPORT', 'COMPLETED'].includes(dossierDetails?.status || '');

      const tasksList: Task[] = [
        {
          id: '1',
          title: 'Identificatie',
          description: 'Uw contactgegevens invullen',
          action: 'Invullen',
          route: '/familie/identificatie',
          completed: (familyContacts && familyContacts.length > 0) || false
        },
        {
          id: '2',
          title: 'Polischeck',
          description: 'Polisgegevens controleren',
          action: 'Invullen',
          route: '/familie/polis',
          completed: (polisChecks && polisChecks.length > 0) || false
        },
        {
          id: '3',
          title: 'Documenten',
          description: 'Overlijdensverklaring en ID uploaden',
          action: 'Uploaden',
          route: '/mijn-documenten',
          completed: (documents && documents.length >= 2) || false
        },
        {
          id: '4',
          title: 'Locatie',
          description: 'Waar bevindt de overledene zich?',
          action: 'Invullen',
          route: '/familie/locatie',
          completed: (medicalDocs && medicalDocs.length > 0) || false
        },
        {
          id: '5',
          title: 'Uitvaartondernemer',
          description: 'Kies een uitvaartondernemer',
          action: 'Kiezen',
          route: '/familie/uitvaartondernemer',
          completed: hasFD
        },
        {
          id: '6',
          title: 'Lokaal of Repatriëring',
          description: 'Maak uw keuze',
          action: 'Kiezen',
          route: '/familie/keuze',
          completed: flowChosen
        },
        {
          id: '7',
          title: 'Planning voorkeuren',
          description: flow === 'LOC' 
            ? 'Moskee en wasplaats voorkeuren'
            : flow === 'REP'
            ? 'Bestemming en reizigers'
            : 'Kies eerst lokaal of repatriëring',
          action: 'Invullen',
          route: flow === 'LOC' ? '/planning' : flow === 'REP' ? '/familie/repatriering' : '/familie/keuze',
          completed: hasPreferences
        },
        {
          id: '8',
          title: 'Afronding',
          description: 'Wachten op voltooiing door uitvaartondernemer',
          action: 'Status',
          route: '#',
          completed: isCompleted
        }
      ];

      setTasks(tasksList);
    };

    fetchDossierData();
  }, []);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welkom bij JanazApp</h1>
        <p className="text-muted-foreground mt-1">
          {dossier ? `Dossier ${dossier.display_id || dossier.ref_number}` : 'Uw persoonlijke dashboard'}
        </p>
      </div>

      {dossier?.legal_hold && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Legal Hold</AlertTitle>
          <AlertDescription>
            Dit dossier is onderhevig aan een juridische blokkering. Bepaalde acties zijn beperkt tot 
            vrijgave door het parket.
          </AlertDescription>
        </Alert>
      )}

      {dossier && (
        <Card>
          <CardHeader>
            <CardTitle>Dossier Informatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Overledene</p>
                <p className="font-medium">{dossier.deceased_name || 'Nog in te vullen'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dossier-ID</p>
                <p className="font-medium font-mono">{dossier.display_id || dossier.ref_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge>{dossier.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <div className="flex items-center gap-1">
                  {dossier.flow === 'REP' && (
                    <>
                      <Plane className="h-3 w-3" />
                      <span className="font-medium">Repatriëring</span>
                    </>
                  )}
                  {dossier.flow === 'LOC' && (
                    <>
                      <Home className="h-3 w-3" />
                      <span className="font-medium">Lokaal</span>
                    </>
                  )}
                  {dossier.flow === 'UNSET' && (
                    <span className="text-muted-foreground">Nog te bepalen</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Aangemaakt</p>
                <p className="font-medium">{new Date(dossier.created_at).toLocaleDateString('nl-NL')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Voortgang (8 stappen)</CardTitle>
          <CardDescription>
            {completedTasks} van {totalTasks} stappen voltooid • {Math.round(progress)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Bij elke afgeronde stap gaat het percentage omhoog
            </p>
          </div>
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg transition-all",
                  task.completed 
                    ? "bg-success/5 border-success/20" 
                    : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      task.completed && "text-success"
                    )}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <Button
                  variant={task.completed ? "outline" : "default"}
                  size="sm"
                  onClick={() => task.route !== '#' && navigate(task.route)}
                  disabled={task.route === '#'}
                  className="flex-shrink-0"
                >
                  {task.completed ? "✓" : task.action}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          <CardDescription>Laatste berichten en meldingen</CardDescription>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen updates beschikbaar
            </p>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Bell className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{update.subject || 'Melding'}</p>
                    <p className="text-sm text-muted-foreground">{update.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(update.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
