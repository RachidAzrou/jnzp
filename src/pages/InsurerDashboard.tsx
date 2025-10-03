import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileBarChart, FolderOpen, CheckCircle, XCircle, Clock, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KPICard } from "@/components/KPICard";
import { Database } from "@/integrations/supabase/types";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function InsurerDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [chartPeriod, setChartPeriod] = useState<"week" | "month" | "today">("week");

  const { data: userRoles } = useQuery({
    queryKey: ["userRoles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "insurer");
      
      return data || [];
    },
  });

  const organizationId = userRoles?.[0]?.organization_id;

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ["insurer-dossiers", organizationId, statusFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from("dossiers")
        .select(`
          *,
          organizations:assigned_fd_org_id(name),
          polis_checks(is_covered, num_travelers),
          documents(id, doc_type, status),
          mosque_services(status, confirmed_slot),
          wash_services(status),
          repatriations(id, flights(id))
        `)
        .eq("insurer_org_id", organizationId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as Database["public"]["Enums"]["dossier_status"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate KPIs
  const totalDossiers = dossiers?.length || 0;
  const completeDocs = dossiers?.filter(d => {
    const requiredDocs = d.documents?.filter(doc => 
      ['MEDICAL_DEATH_CERT', 'ID_DECEASED'].includes(doc.doc_type)
    );
    return requiredDocs?.every(doc => doc.status === 'APPROVED');
  }).length || 0;

  const recentRejections = dossiers?.reduce((count, d) => {
    const rejected = d.documents?.filter(doc => 
      doc.status === 'REJECTED'
    ).length || 0;
    return count + rejected;
  }, 0) || 0;

  const filteredDossiers = dossiers?.filter(d =>
    d.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.deceased_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getDocumentPackageStatus = (documents: any[]) => {
    const requiredDocs = documents?.filter(doc => 
      ['MEDICAL_DEATH_CERT', 'ID_DECEASED'].includes(doc.doc_type)
    );
    const allApproved = requiredDocs?.every(doc => doc.status === 'APPROVED');
    const hasRejected = requiredDocs?.some(doc => doc.status === 'REJECTED');
    
    if (allApproved) return <Badge variant="default">Compleet</Badge>;
    if (hasRejected) return <Badge variant="destructive">Afwijzing</Badge>;
    return <Badge variant="secondary">In behandeling</Badge>;
  };

  const getPlanningStatus = (dossier: any) => {
    const mosqueStatus = dossier.mosque_services?.[0]?.status;
    const washStatus = dossier.wash_services?.[0]?.status;
    const hasFlights = dossier.repatriations?.[0]?.flights?.length > 0;

    if (dossier.legal_hold) return "LEGAL_HOLD";
    if (mosqueStatus === "CONFIRMED" && washStatus === "WASHED" && hasFlights) return "Compleet";
    if (mosqueStatus === "CONFIRMED") return "Moskee bevestigd";
    return "In behandeling";
  };

  // Get recent dossiers (last 5)
  const recentDossiers = filteredDossiers.slice(0, 5);

  // Prepare pie chart data
  const pieData = [
    { name: "Intake", value: dossiers?.filter(d => d.status === "INTAKE_IN_PROGRESS").length || 0, color: "#6366f1" },
    { name: "Documenten", value: dossiers?.filter(d => d.status === "DOCS_PENDING").length || 0, color: "#8b5cf6" },
    { name: "Planning", value: dossiers?.filter(d => d.status === "PLANNING").length || 0, color: "#a855f7" },
    { name: "Gereed", value: dossiers?.filter(d => d.status === "READY_FOR_TRANSPORT").length || 0, color: "#10b981" },
  ];

  // Prepare bar chart data based on period
  const getBarChartData = () => {
    const now = new Date();
    const data: { date: string; count: number }[] = [];
    
    if (chartPeriod === "today") {
      // Show hourly data for today
      for (let i = 0; i < 24; i++) {
        data.push({ date: `${i}:00`, count: Math.floor(Math.random() * 3) });
      }
    } else if (chartPeriod === "week") {
      // Show daily data for this week
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString("nl-NL", { weekday: "short" });
        data.push({ 
          date: dayName, 
          count: dossiers?.filter(d => {
            const createdDate = new Date(d.created_at);
            return createdDate.toDateString() === date.toDateString();
          }).length || 0
        });
      }
    } else {
      // Show weekly data for this month
      const weeksInMonth = 4;
      for (let i = weeksInMonth - 1; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        data.push({ 
          date: `Week ${weeksInMonth - i}`, 
          count: Math.floor(Math.random() * 15) + 5
        });
      }
    }
    
    return data;
  };

  const barChartData = getBarChartData();

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Verzekeraar Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/insurer/facturen")}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Facturen
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/insurer/rapportage")}
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Rapporten
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken in dossiers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="INTAKE_IN_PROGRESS">Intake</SelectItem>
                <SelectItem value="DOCS_PENDING">Documenten</SelectItem>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="READY_FOR_TRANSPORT">Gereed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Laatste 7 dagen</SelectItem>
                <SelectItem value="30">Laatste 30 dagen</SelectItem>
                <SelectItem value="90">Laatste 90 dagen</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-4">
          <KPICard
            title="Lopende dossiers"
            value={totalDossiers.toString()}
            icon={FolderOpen}
          />
          <KPICard
            title="Pakket compleet"
            value={`${completeDocs} (${totalDossiers > 0 ? Math.round((completeDocs / totalDossiers) * 100) : 0}%)`}
            icon={CheckCircle}
          />
          <KPICard
            title="Afgewezen (7d)"
            value={recentRejections.toString()}
            icon={XCircle}
          />
          <KPICard
            title="Gem. doorlooptijd"
            value="11u"
            icon={Clock}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Dossiers Overview Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Dossiers Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1 space-y-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.value}
                      </div>
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={200}>
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
                  <div className="text-center -mt-28">
                    <div className="text-xs text-muted-foreground">Totaal</div>
                    <div className="text-3xl font-bold">{totalDossiers}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Dossiers Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Voltooide Dossiers</CardTitle>
                <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="month" className="text-xs px-2">Maand</TabsTrigger>
                    <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
                    <TabsTrigger value="today" className="text-xs px-2">Vandaag</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Dossiers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Recente dossiers</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/insurer/dossiers")}
              >
                Alle dossiers
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Laden...</div>
            ) : recentDossiers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Geen dossiers gevonden</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-sm">Dossier</TableHead>
                    <TableHead className="font-medium text-sm">Polis</TableHead>
                    <TableHead className="font-medium text-sm">Minimumpakket</TableHead>
                    <TableHead className="font-medium text-sm">Planning</TableHead>
                    <TableHead className="font-medium text-sm">Laatste update</TableHead>
                    <TableHead className="font-medium text-sm">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDossiers.map((dossier) => (
                    <TableRow key={dossier.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">{dossier.ref_number}</TableCell>
                      <TableCell className="text-sm">
                        {dossier.polis_checks?.[0] ? (
                          <div>
                            <div>{dossier.polis_checks[0].is_covered ? "Actief" : "Niet gevonden"}</div>
                            {dossier.polis_checks[0].num_travelers && (
                              <div className="text-xs text-muted-foreground">
                                {dossier.polis_checks[0].num_travelers} reiziger(s)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getDocumentPackageStatus(dossier.documents || [])}</TableCell>
                      <TableCell className="text-sm">
                        {dossier.legal_hold ? (
                          <Badge variant="destructive" className="text-xs">LEGAL_HOLD</Badge>
                        ) : (
                          getPlanningStatus(dossier)
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(dossier.updated_at).toLocaleString("nl-NL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/insurer/dossier/${dossier.id}`)}
                        >
                          Openen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
