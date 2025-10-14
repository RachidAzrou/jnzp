import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Building2, FileCheck, AlertCircle, Refrigerator, 
  Activity, Receipt, Users, FileText, FolderOpen
} from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { NotificationLog } from "@/components/admin/NotificationLog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeDossiers: 0,
    pendingDocs: 0,
    mosqueDayBlocks: 0,
    coolerCellOccupancy: "0/0",
    integrationErrors: 0,
    pendingInvoices: 0,
    pendingOrgs: 0,
  });
  const [alerts, setAlerts] = useState<Array<{ time: string; message: string }>>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Active dossiers
        const { count: dossierCount } = await supabase
          .from("dossiers")
          .select("*", { count: "exact", head: true })
          .in("status", ["CREATED", "IN_PROGRESS"]);

        // Pending documents
        const { count: docCount } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("status", "IN_REVIEW");

        // Mosque day blocks
        const { count: blockCount } = await supabase
          .from("mosque_day_blocks")
          .select("*", { count: "exact", head: true })
          .gte("date", new Date().toISOString().split("T")[0]);

        // Cooler cell occupancy
        const { data: cells } = await supabase
          .from("cool_cells")
          .select("status");
        
        const occupied = cells?.filter(c => c.status === "OCCUPIED").length || 0;
        const total = cells?.length || 0;

        // Integration errors
        const { count: integrationErrors } = await supabase
          .from("integration_refs")
          .select("*", { count: "exact", head: true })
          .eq("status", "ERROR");

        // Pending invoices
        const { count: invoiceCount } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .in("status", ["DRAFT", "ISSUED", "NEEDS_INFO"]);

        // Pending organizations
        const { count: orgCount } = await supabase
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "PENDING_VERIFICATION");

        setStats({
          activeDossiers: dossierCount || 0,
          pendingDocs: docCount || 0,
          mosqueDayBlocks: blockCount || 0,
          coolerCellOccupancy: `${occupied}/${total}`,
          integrationErrors: integrationErrors || 0,
          pendingInvoices: invoiceCount || 0,
          pendingOrgs: orgCount || 0,
        });

        // Fetch recent alerts from audit log
        const { data: recentEvents } = await supabase
          .from("audit_events")
          .select("created_at, description, event_type")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentEvents) {
          setAlerts(
            recentEvents.map((event) => ({
              time: new Date(event.created_at).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              message: event.description || event.event_type,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("admin.dashboard.title")}</h1>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <KPICard title={t("admin.dashboard.activeDossiers")} value={stats.activeDossiers} icon={FileCheck} />
        <KPICard title={t("admin.dashboard.docsToReview")} value={stats.pendingDocs} icon={FileCheck} />
        <KPICard title={t("admin.dashboard.mosqueDayBlocks")} value={stats.mosqueDayBlocks} icon={AlertCircle} />
        <KPICard title={t("admin.dashboard.coolCellOccupancy")} value={stats.coolerCellOccupancy} icon={Refrigerator} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <KPICard title={t("admin.dashboard.integrationErrors")} value={stats.integrationErrors} icon={Activity} />
        <KPICard title={t("admin.dashboard.pendingInvoices")} value={stats.pendingInvoices} icon={Receipt} />
        <KPICard title={t("admin.dashboard.pendingOrgs")} value={stats.pendingOrgs} icon={Building2} />
        <KPICard title={t("admin.dashboard.pendingOrgs")} value={stats.pendingOrgs} icon={Building2} />
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.dashboard.latestEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors",
                      idx !== alerts.length - 1 && "border-b"
                    )}
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[50px]">
                      {alert.time}
                    </span>
                    <span className="text-sm flex-1">{alert.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("admin.dashboard.noRecentEvents")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/directory")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                {t("admin.directory.title")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/dossiers")}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {t("admin.dossiers.title")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/documents")}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t("admin.documentReview.title")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/integrations")}
              >
                <Activity className="mr-2 h-4 w-4" />
                {t("admin.integrations.title")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/invoices")}
              >
                <Receipt className="mr-2 h-4 w-4" />
                {t("admin.invoices.title")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start h-9"
                onClick={() => navigate("/admin/audit")}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t("admin.audit.title")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Log */}
        <div className="md:col-span-2">
          <NotificationLog />
        </div>
      </div>
    </div>
  );
}
