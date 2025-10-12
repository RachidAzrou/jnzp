import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
// FDReviewsCard removed - only for insurers/admins
import OnboardingWizard from "@/components/OnboardingWizard";
interface DossierData {
  id: string;
  display_id: string;
  deceased_name: string;
  flow: string;
  status: string;
}
const Dashboard = () => {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState({
    totalActive: 0,
    repatriation: 0,
    local: 0
  });
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch user info
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        
        let userOrgId: string | null = null;
        
        if (user) {
          const {
            data: profile
          } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
          if (profile) {
            setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || '');
          }

          // Fetch user's organization and onboarding status
          const {
            data: roleData
          } = await supabase.from("user_roles").select("organization_id, role").eq("user_id", user.id).single();
          if (roleData?.organization_id) {
            userOrgId = roleData.organization_id;
            setOrganizationId(roleData.organization_id);

            // Check onboarding status for professional roles
            const professionalRoles = ["funeral_director", "mosque", "mortuarium", "insurer", "org_admin", "admin"];
            if (professionalRoles.includes(roleData.role)) {
              // Check onboarding status
              try {
                const onboardingResponse: any = await supabase.from("organization_onboarding" as any).select("completed").eq("organization_id", roleData.organization_id).maybeSingle();
                if (onboardingResponse?.data?.completed !== undefined) {
                  setShowOnboarding(!onboardingResponse.data.completed);
                } else {
                  // No onboarding record exists yet, show onboarding for first time
                  setShowOnboarding(true);
                }
              } catch (e) {
                // If no onboarding record exists, show it
                setShowOnboarding(true);
              }
            }
          }
        }

        // Fetch active dossiers for this organization only (exclude deleted and archived)
        if (userOrgId) {
          const {
            data: dossiersData,
            error: dossiersError
          } = await supabase.from("dossiers").select(`
              id,
              display_id,
              deceased_name,
              flow,
              status
            `).eq("assigned_fd_org_id", userOrgId).is("deleted_at", null).neq("status", "ARCHIVED" as any).order("updated_at", {
            ascending: false
          }).limit(50);
          if (dossiersError) {
            console.error("Error fetching dossiers:", dossiersError);
          } else if (dossiersData) {
            setDossiers(dossiersData);

            // Calculate stats
            setStats({
              totalActive: dossiersData.length,
              repatriation: dossiersData.filter(d => d.flow === 'REP').length,
              local: dossiersData.filter(d => d.flow === 'LOC').length
            });
          }
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
    return <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>;
  }
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  return <div className="space-y-6 pb-8">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {t("dashboard.welcomeBack")}, {userName}
                </h1>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Wizard */}
      {showOnboarding && organizationId && <OnboardingWizard organizationId={organizationId} onComplete={() => setShowOnboarding(false)} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
        <Card className="border-border/40 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.totalActive")}
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.activeDossiers")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.repatriation")}
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repatriation}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.ongoingRepatriations")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.local")}
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.local}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.localFunerals")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Dossiers */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">{t("dashboard.activeFiles")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.filesProgress")}
          </p>
        </CardHeader>

        <CardContent>
          {dossiers.length === 0 ? <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("dashboard.noActiveDossiers")}</p>
            </div> : <div className="space-y-2">
              {dossiers.map(dossier => <div key={dossier.id} className="group rounded-lg border bg-card p-4 cursor-pointer hover:shadow-sm hover:border-primary/50 transition-all duration-200" onClick={() => navigate(`/dossiers/${dossier.id}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                          {dossier.deceased_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          Ref: {dossier.display_id} • {dossier.flow === 'REP' ? 'Repatriëring' : 'Lokaal'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs bg-primary/10 text-primary border-primary/20">
                      {dossier.status}
                    </Badge>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default Dashboard;