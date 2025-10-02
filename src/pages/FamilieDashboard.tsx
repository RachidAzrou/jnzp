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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DossierData {
  id: string;
  ref_number: string;
  deceased_name: string;
  status: string;
  legal_hold: boolean;
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

      const tasksList: Task[] = [
        {
          id: '1',
          title: 'Identificatie',
          description: 'Uw gegevens invullen',
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
          description: 'IIIC/IIID en ID uploaden',
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
          completed: false
        },
        {
          id: '6',
          title: 'Lokaal of Repatriëring',
          description: 'Maak uw keuze',
          action: 'Kiezen',
          route: '/familie/keuze',
          completed: false
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {dossier ? `Dossier ${dossier.ref_number}` : 'Welkom'}
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Overledene</p>
                <p className="font-medium">{dossier.deceased_name || 'n.n.b.'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dossier-ID</p>
                <p className="font-medium">{dossier.ref_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge>{dossier.status.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Voortgang</CardTitle>
          <CardDescription>
            {completedTasks} van {totalTasks} stappen voltooid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-6" />
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {index + 1}. {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <Button
                  variant={task.completed ? "outline" : "default"}
                  size="sm"
                  onClick={() => navigate(task.route)}
                >
                  {task.action}
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
