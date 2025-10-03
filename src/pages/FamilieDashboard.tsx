import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CircularProgress } from "@/components/CircularProgress";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  MapPin, 
  Building2, 
  Home, 
  Plane, 
  Bell,
  Calendar,
  CheckCheck,
  UserCheck,
  Shield
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
  icon: any;
}

export default function FamilieDashboard() {
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [mosqueService, setMosqueService] = useState<any>(null);

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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Store mosque service for display
      if (mosqueServices) {
        setMosqueService(mosqueServices);
      }

      const { data: repatriations } = await supabase
        .from('repatriations')
        .select('*')
        .eq('dossier_id', dossierId)
        .limit(1);

      const flow = dossierDetails?.flow || 'UNSET';
      const hasFD = !!dossierDetails?.assigned_fd_org_id;
      const flowChosen = flow !== 'UNSET';
      const hasPreferences = flow === 'LOC' 
        ? !!mosqueServices
        : flow === 'REP'
        ? !!repatriations
        : false;
      const isCompleted = ['READY_FOR_TRANSPORT', 'COMPLETED'].includes(dossierDetails?.status || '');

      const tasksList: Task[] = [
        {
          id: '1',
          title: 'Identificatie',
          description: 'Uw contactgegevens invullen',
          action: 'Invullen',
          route: '/familie/identificatie',
          completed: (familyContacts && familyContacts.length > 0) || false,
          icon: UserCheck
        },
        {
          id: '2',
          title: 'Polischeck',
          description: 'Polisgegevens controleren',
          action: 'Invullen',
          route: '/familie/polis',
          completed: (polisChecks && polisChecks.length > 0) || false,
          icon: Shield
        },
        {
          id: '3',
          title: 'Documenten',
          description: 'Overlijdensverklaring en ID uploaden',
          action: 'Uploaden',
          route: '/mijn-documenten',
          completed: (documents && documents.length >= 2) || false,
          icon: FileText
        },
        {
          id: '4',
          title: 'Locatie',
          description: 'Waar bevindt de overledene zich?',
          action: 'Invullen',
          route: '/familie/locatie',
          completed: (medicalDocs && medicalDocs.length > 0) || false,
          icon: MapPin
        },
        {
          id: '5',
          title: 'Uitvaartondernemer',
          description: 'Kies een uitvaartondernemer',
          action: 'Kiezen',
          route: '/familie/uitvaartondernemer',
          completed: hasFD,
          icon: Building2
        },
        {
          id: '6',
          title: 'Lokaal of Repatriëring',
          description: 'Maak uw keuze',
          action: 'Kiezen',
          route: '/familie/keuze',
          completed: flowChosen,
          icon: flow === 'REP' ? Plane : Home
        },
        {
          id: '7',
          title: 'Planning voorkeuren',
          description: flow === 'LOC' 
            ? 'Moskee en mortuarium voorkeuren'
            : flow === 'REP'
            ? 'Bestemming en reizigers'
            : 'Kies eerst lokaal of repatriëring',
          action: 'Invullen',
          route: flow === 'LOC' ? '/planning' : flow === 'REP' ? '/familie/repatriering' : '/familie/keuze',
          completed: hasPreferences,
          icon: Calendar
        },
        {
          id: '8',
          title: 'Afronding',
          description: 'Wachten op voltooiing door uitvaartondernemer',
          action: 'Status',
          route: '#',
          completed: isCompleted,
          icon: CheckCheck
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welkom bij JanazApp
          </h1>
          <p className="text-lg text-muted-foreground">
            {dossier ? `Dossier ${dossier.display_id || dossier.ref_number}` : 'Uw persoonlijke dashboard'}
          </p>
        </div>

        {/* Communication Channels */}
        {dossier && (
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Communicatie</CardTitle>
            <CardDescription>Kies hoe u met ons wilt communiceren</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate('/familie/chat')}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xl">💬</span>
                  </div>
                  <span className="font-semibold text-lg">Portal Chat</span>
                </div>
                <span className="text-sm text-muted-foreground">Chat direct in het portal</span>
              </Button>
              
              <Button
                onClick={() => {
                  const phoneNumber = "32470123456"; // Replace with actual WhatsApp Business number
                  const message = encodeURIComponent(`Hallo, ik heb een vraag over dossier ${dossier.display_id || dossier.ref_number}`);
                  window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                }}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xl">🟢</span>
                  </div>
                  <span className="font-semibold text-lg">WhatsApp JanAssist</span>
                </div>
                <span className="text-sm text-muted-foreground">Chat via WhatsApp</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              💡 U ontvangt altijd een melding bij nieuwe reacties, ongeacht het kanaal
            </p>
          </CardContent>
          </Card>
        )}

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
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
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

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-5">
          <CardTitle>Voortgang</CardTitle>
          <CardDescription>
            {completedTasks} van {totalTasks} stappen voltooid
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid lg:grid-cols-[1fr,auto] gap-12 items-start">
              {/* Left: Timeline steps */}
              <div className="space-y-0">
                {tasks.map((task, index) => {
                  const Icon = task.icon;
                  const isLast = index === tasks.length - 1;
                  
                  return (
                    <div key={task.id} className="relative flex gap-6 pb-10">
                      {/* Timeline line */}
                      {!isLast && (
                        <div 
                          className={cn(
                            "absolute left-7 top-16 w-0.5 h-full -translate-x-1/2",
                            task.completed ? "bg-primary" : "bg-muted"
                          )}
                        />
                      )}
                    
                      {/* Step circle with icon */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all",
                            task.completed
                              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                              : "bg-background border-muted text-muted-foreground"
                          )}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-7 w-7" />
                          ) : (
                            <Icon className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                    
                      {/* Step content */}
                      <div className="flex-1 pt-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={cn(
                              "font-semibold text-lg mb-2",
                              task.completed && "text-foreground"
                            )}>
                              Step {index + 1}: {task.title}
                            </p>
                            <p className="text-base text-muted-foreground">
                              {task.description}
                            </p>
                          </div>
                          <Button
                            variant={task.completed ? "outline" : "default"}
                            size="default"
                            onClick={() => task.route !== '#' && navigate(task.route)}
                            disabled={task.route === '#'}
                            className="flex-shrink-0"
                          >
                            {task.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Right: Circular progress */}
              <div className="flex justify-center lg:justify-end">
                <CircularProgress value={progress} size={260} strokeWidth={18} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mosque Service Status - Read Only */}
        {mosqueService && dossier?.flow === 'LOC' && (
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-5">
            <CardTitle>Janāza-gebed status</CardTitle>
            <CardDescription>Status van uw moskee aanvraag (alleen-lezen)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Gevraagd gebed</p>
                <p className="font-medium">
                  {mosqueService.prayer 
                    ? {
                        FAJR: 'Fajr',
                        DHUHR: 'Dhuhr',
                        ASR: 'Asr',
                        MAGHRIB: 'Maghrib',
                        ISHA: 'Isha',
                        JUMUAH: "Jumu'ah"
                      }[mosqueService.prayer]
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Datum</p>
                <p className="font-medium">
                  {mosqueService.requested_date 
                    ? new Date(mosqueService.requested_date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge className={
                  mosqueService.status === 'CONFIRMED'
                    ? 'bg-green-500'
                    : mosqueService.status === 'DECLINED'
                    ? 'bg-red-500'
                    : mosqueService.status === 'PROPOSED'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }>
                  {mosqueService.status === 'CONFIRMED'
                    ? '✅ Bevestigd'
                    : mosqueService.status === 'DECLINED'
                    ? '❌ Niet mogelijk'
                    : mosqueService.status === 'PROPOSED'
                    ? '🔄 Alternatief voorgesteld'
                    : '⏳ Open'}
                </Badge>
              </div>
            </div>

            {mosqueService.decline_reason && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Reden niet mogelijk
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {mosqueService.decline_reason}
                </p>
              </div>
            )}

            {mosqueService.status === 'PROPOSED' && mosqueService.proposed_prayer && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Alternatief voorgesteld
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  {mosqueService.proposed_prayer 
                    ? {
                        FAJR: 'Fajr',
                        DHUHR: 'Dhuhr',
                        ASR: 'Asr',
                        MAGHRIB: 'Maghrib',
                        ISHA: 'Isha',
                        JUMUAH: "Jumu'ah"
                      }[mosqueService.proposed_prayer]
                    : '—'}
                  {mosqueService.proposed_date && ` op ${new Date(mosqueService.proposed_date).toLocaleDateString('nl-NL')}`}
                </p>
              </div>
            )}

            {mosqueService.note && (
              <div>
                <p className="text-sm text-muted-foreground">Notitie</p>
                <p className="text-sm">{mosqueService.note}</p>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                💡 Voor vragen kunt u contact opnemen met uw uitvaartondernemer
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-5">
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
    </div>
  );
}
