import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
          .in("status", ["CREATED", "DOCS_PENDING", "PLANNING"]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            Platform Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Centraal overzicht van JanazApp</p>
        </div>
      </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Actieve Dossiers"
          value={stats.activeDossiers}
          icon={FileCheck}
        />
        <KPICard
          title="Docs te reviewen"
          value={stats.pendingDocs}
          icon={FileCheck}
        />
        <KPICard
          title="Moskee blokkades"
          value={stats.mosqueDayBlocks}
          icon={AlertCircle}
        />
        <KPICard
          title="Koelcellen bezet"
          value={stats.coolerCellOccupancy}
          icon={Refrigerator}
        />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Integratie fouten"
          value={stats.integrationErrors}
          icon={Activity}
        />
        <KPICard
          title="Openstaande facturen"
          value={stats.pendingInvoices}
          icon={Receipt}
        />
        <KPICard
          title="Organisaties ter controle"
          value={stats.pendingOrgs}
          icon={Building2}
        />
        <KPICard
          title="Organisaties ter controle"
          value={stats.pendingOrgs}
          icon={Building2}
        />
        </div>

      {/* Alerts & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("admin.dashboard.latestEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Tijd</th>
                      <th className="px-4 py-2 text-left font-medium">Event</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alerts.map((alert, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {alert.time}
                        </td>
                        <td className="px-4 py-2">{alert.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Geen recente events</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("admin.dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/directory")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Directory
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/dossiers")}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Dossiers
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/documents")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Docs Review
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/integrations")}
              >
                <Activity className="mr-2 h-4 w-4" />
                Integraties
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/invoices")}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Facturatie
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="justify-start"
                onClick={() => navigate("/admin/audit")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Auditlog
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Log */}
        <NotificationLog />
      </div>
    </div>
  );
}
