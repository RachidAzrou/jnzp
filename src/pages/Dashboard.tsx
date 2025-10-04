import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { DossierProgressCard } from "@/components/DossierProgressCard";

interface DossierProgress {
  dossier_id: string;
  display_id: string;
  deceased_name: string;
  pipeline_type: string;
  progress_pct: number;
  next_step_label?: string;
  current_main_key?: string;
}

const Dashboard = () => {
  const [dossierProgress, setDossierProgress] = useState<DossierProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [stats, setStats] = useState({
    totalActive: 0,
    repatriation: 0,
    local: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch user info
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();
          
          if (profile) {
            setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || '');
          }
        }

        // Fetch active dossiers with their progress
        const { data: dossiersData, error: dossiersError } = await supabase
          .from("dossiers")
          .select(`
            id,
            display_id,
            deceased_name,
            flow,
            status
          `)
          .in("status", ["CREATED", "FD_ASSIGNED", "INTAKE_IN_PROGRESS", "DOCS_PENDING", "DOCS_VERIFIED", "PLANNING", "APPROVED"])
          .order("updated_at", { ascending: false });

        if (dossiersError) {
          console.error("Error fetching dossiers:", dossiersError);
        } else if (dossiersData) {
          // For now, set progress to 0 for all dossiers
          // In production, this would fetch from the view
          const progress: DossierProgress[] = dossiersData.map(d => ({
            dossier_id: d.id,
            display_id: d.display_id || '',
            deceased_name: d.deceased_name,
            pipeline_type: d.flow,
            progress_pct: 0,
            next_step_label: 'Intake',
            current_main_key: 'INTAKE',
          }));
          
          setDossierProgress(progress);
          
          // Calculate stats
          setStats({
            totalActive: progress.length,
            repatriation: progress.filter(d => d.pipeline_type === 'REP').length,
            local: progress.filter(d => d.pipeline_type === 'LOC').length,
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('nl-NL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Welcome Header */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{getCurrentDate()}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Welkom terug, {userName}
          </h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totaal actief
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground mt-1">Actieve dossiers</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Repatriëring
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.repatriation}</div>
              <p className="text-xs text-muted-foreground mt-1">Lopende repatriëringen</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lokaal
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.local}</div>
              <p className="text-xs text-muted-foreground mt-1">Lokale uitvaarten</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Dossiers with Progress */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Actieve dossiers</h2>
            <p className="text-muted-foreground">
              Overzicht van lopende dossiers en hun voortgang
            </p>
          </div>

          {dossierProgress.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Geen actieve dossiers</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dossierProgress.map((dossier) => (
                <DossierProgressCard
                  key={dossier.dossier_id}
                  dossierId={dossier.dossier_id}
                  displayId={dossier.display_id}
                  deceasedName={dossier.deceased_name}
                  pipelineType={dossier.pipeline_type}
                  progressPct={dossier.progress_pct}
                  nextStepLabel={dossier.next_step_label}
                  currentMainKey={dossier.current_main_key}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
