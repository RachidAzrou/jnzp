import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, FileCheck, AlertCircle } from "lucide-react";

const Rapporten = () => {
  const [stats, setStats] = useState({
    total: 0,
    byStatus: [] as any[],
    legalHold: 0,
    avgDuration: "N/A"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: dossiers } = await supabase
      .from("dossiers")
      .select("*");

    if (dossiers) {
      // Group by status
      const statusCounts: Record<string, number> = {};
      dossiers.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });

      const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count
      }));

      setStats({
        total: dossiers.length,
        byStatus,
        legalHold: dossiers.filter(d => d.legal_hold).length,
        avgDuration: "28u" // Mock for now
      });
    }

    setLoading(false);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  const monthlyData = [
    { month: "Jan", dossiers: 4 },
    { month: "Feb", dossiers: 6 },
    { month: "Mar", dossiers: 8 },
    { month: "Apr", dossiers: 5 },
    { month: "Mei", dossiers: 7 },
    { month: "Jun", dossiers: 9 },
  ];

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
        <h1 className="text-3xl font-bold">Rapporten</h1>
        <p className="text-muted-foreground mt-1">Statistieken en analyses van uw dossiers</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal dossiers</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Legal hold</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.legalHold}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gem. doorlooptijd</p>
                <p className="text-2xl font-bold mt-1">{stats.avgDuration}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Voltooid (maand)</p>
                <p className="text-2xl font-bold mt-1 text-success">
                  {stats.byStatus.find(s => s.name === "ARCHIVED")?.value || 0}
                </p>
              </div>
              <FileCheck className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dossiers per maand</CardTitle>
            <CardDescription>Aantal nieuwe dossiers afgelopen 6 maanden</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="dossiers" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdeling per status</CardTitle>
            <CardDescription>Huidige distributie van dossier statussen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rapporten;
