import { Plane, MapPin, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl, fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateLocale = () => {
    switch(i18n.language) {
      case 'fr': return fr;
      case 'en': return enUS;
      default: return nl;
    }
  };

  const getCurrentDate = () => {
    return format(new Date(), "EEEE, MMM yyyy", { locale: getDateLocale() });
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: dossiersData } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false });
      
      const { data: auditData } = await supabase
        .from("audit_events")
        .select("*, dossiers(display_id, ref_number)")
        .order("created_at", { ascending: false })
        .limit(5);

      setDossiers(dossiersData || []);
      setAuditEvents(auditData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const activeDossiers = dossiers.filter(d => 
    !['ARCHIVED', 'IN_TRANSIT'].includes(d.status)
  ).length;
  
  const repatriationDossiers = dossiers.filter(d => d.flow === 'REP').length;
  const localDossiers = dossiers.filter(d => d.flow === 'LOC').length;

  // Prepare pie chart data
  const pieData = [
    { name: 'Total', value: activeDossiers, color: 'hsl(var(--muted))' },
    { name: 'Assigned', value: Math.floor(activeDossiers * 0.35), color: 'hsl(var(--primary))' }
  ];

  // Prepare bar chart data (mock data for weekly completed files)
  const barData = [
    { name: '01 Nov', value: 5 },
    { name: '02 Nov', value: 9 },
    { name: '03 Nov', value: 8 },
    { name: '04 Nov', value: 6 },
    { name: '05 Nov', value: 10 },
    { name: '06 Nov', value: 8 },
    { name: '07 Nov', value: 11 },
    { name: '08 Nov', value: 9 },
  ];

  const formatEventDate = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yy", { locale: getDateLocale() });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Welcome Header */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{getCurrentDate()}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            {t("dashboard.title")}
          </h1>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Files Overview - Pie Chart */}
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">
                Files Overview
              </CardTitle>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                01 Nov - 30 Nov
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8">
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="cursor-pointer" onClick={() => navigate('/dossiers')}>
                    <p className="text-3xl font-bold">{activeDossiers}</p>
                    <p className="text-sm text-muted-foreground">Total files</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary"></div>
                    <div>
                      <p className="text-xl font-semibold">{pieData[1].value}</p>
                      <p className="text-sm text-muted-foreground">Assigned files</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Files - Bar Chart */}
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">
                Completed Files
              </CardTitle>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                01 Nov - 30 Nov
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 flex gap-4 text-xs border-b">
                <button className="pb-2 border-b-2 border-foreground font-medium">This week</button>
                <button className="pb-2 text-muted-foreground hover:text-foreground">This month</button>
                <button className="pb-2 text-muted-foreground hover:text-foreground">Today</button>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* My Recent Completed Files */}
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              My Recent Completed Files
            </CardTitle>
            <Button 
              onClick={() => navigate('/dossiers')}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              Manage All Tasks
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {dossiers.slice(0, 5).map((dossier, index) => (
                <div
                  key={dossier.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-mono text-sm font-medium whitespace-nowrap">
                        {dossier.display_id || dossier.ref_number}
                      </span>
                      <span className="text-sm truncate">
                        {dossier.deceased_name}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                        date: {formatEventDate(dossier.updated_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dossiers/${dossier.id}`)}
                    className="ml-4"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
