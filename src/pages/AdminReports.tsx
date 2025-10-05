import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle2 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminReports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    totalDossiers: 0,
    activeDossiers: 0,
    completedDossiers: 0,
    avgProcessingHours: 0,
    slaBreaches: 0,
  });
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Fetch overall metrics
      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('id, status, created_at, updated_at, display_id, ref_number');

      if (dossiers) {
        const total = dossiers.length;
        const active = dossiers.filter(d => !['ARCHIVED', 'CANCELLED'].includes(d.status)).length;
        const completed = dossiers.filter(d => d.status === 'ARCHIVED').length;

        const processingTimes = dossiers
          .filter(d => d.status === 'ARCHIVED')
          .map(d => {
            const created = new Date(d.created_at).getTime();
            const updated = new Date(d.updated_at).getTime();
            return (updated - created) / (1000 * 60 * 60); // hours
          });

        const avgProcessing = processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0;

        setMetrics({
          totalDossiers: total,
          activeDossiers: active,
          completedDossiers: completed,
          avgProcessingHours: avgProcessing,
        });

        // Status distribution
        const statusCounts = dossiers.reduce((acc: any, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {});

        setStatusDistribution(
          Object.entries(statusCounts).map(([status, count]) => ({
            name: status,
            value: count as number,
          }))
        );

        // Trend data (last 30 days)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return date.toISOString().split('T')[0];
        });

        const trendCounts = last30Days.map(date => {
          const count = dossiers.filter(d => 
            d.created_at.startsWith(date)
          ).length;
          return { date: date.slice(5), count };
        });

        setTrendData(trendCounts);
      }

      // Calculate SLA metrics manually
      if (dossiers) {
        const slaMetrics = dossiers.map(d => {
          const processingHours = (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
          const docsSlaBreath = ['CREATED', 'AWAITING_DOCS'].includes(d.status) && processingHours > 24;
          const completionSlaBreach = !['ARCHIVED', 'CANCELLED'].includes(d.status) && processingHours > 48;
          
          return {
            dossier_id: d.id,
            display_id: d.display_id || d.ref_number,
            status: d.status,
            processing_hours: processingHours,
            docs_sla_breach: docsSlaBreath,
            completion_sla_breach: completionSlaBreach,
          };
        });

        const breaches = slaMetrics.filter(
          m => m.docs_sla_breach || m.completion_sla_breach
        ).length;

        setMetrics((prev: any) => ({ ...prev, slaBreaches: breaches }));
        setSlaData(slaMetrics.slice(0, 10));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading reports...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Advanced Reporting</h1>
        <p className="text-muted-foreground">Analytics and SLA metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dossiers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDossiers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDossiers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedDossiers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.slaBreaches}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="sla">SLA Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dossiers Created (Last 30 Days)</CardTitle>
              <CardDescription>Daily trend of new dossiers</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Avg Processing Time</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.avgProcessingHours.toFixed(1)} hours
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${Math.min((metrics.avgProcessingHours / 48) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Current dossier status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Breach Report</CardTitle>
              <CardDescription>Dossiers exceeding SLA thresholds</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processing Hours</TableHead>
                    <TableHead>Breach Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaData
                    .filter((item: any) => item.docs_sla_breach || item.completion_sla_breach)
                    .map((item: any) => (
                      <TableRow key={item.dossier_id}>
                        <TableCell className="font-medium">{item.display_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.status}</Badge>
                        </TableCell>
                        <TableCell>{item.processing_hours?.toFixed(1) || 'N/A'}</TableCell>
                        <TableCell>
                          {item.docs_sla_breach && (
                            <Badge variant="destructive" className="mr-1">
                              Docs
                            </Badge>
                          )}
                          {item.completion_sla_breach && (
                            <Badge variant="destructive">Completion</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {slaData.filter((item: any) => item.docs_sla_breach || item.completion_sla_breach).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No SLA breaches - excellent performance! 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
