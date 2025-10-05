import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface DossierData {
  id: string;
  display_id: string;
  deceased_name: string;
  flow: string;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierData[]>([]);
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
          setDossiers(dossiersData);
          
          // Calculate stats
          setStats({
            totalActive: dossiersData.length,
            repatriation: dossiersData.filter(d => d.flow === 'REP').length,
            local: dossiersData.filter(d => d.flow === 'LOC').length,
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
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-8 max-w-[1600px] mx-auto pb-safe">
        {/* Welcome Header */}
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Welkom terug, {userName}
          </h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Actieve dossiers</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overzicht van lopende dossiers en hun voortgang
            </p>
          </div>

          {dossiers.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="flex items-center justify-center py-8 sm:py-12">
                <div className="text-center space-y-2">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm sm:text-base text-muted-foreground">Geen actieve dossiers</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {dossiers.map((dossier) => (
                <Card 
                  key={dossier.id} 
                  className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all touch-manipulation"
                  onClick={() => navigate(`/dossiers/${dossier.id}`)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{dossier.deceased_name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          Ref: {dossier.display_id} • {dossier.flow === 'REP' ? 'Repatriëring' : 'Lokaal'}
                        </p>
                      </div>
                      <Badge variant={dossier.flow === 'REP' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                        {dossier.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
