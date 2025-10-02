import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, TrendingUp, Clock, Euro } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InsurerRapportage() {
  const [periodFilter, setPeriodFilter] = useState("30");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["insurer-reports", periodFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "insurer")
        .single();

      if (!userRole?.organization_id) throw new Error("No organization found");

      const daysAgo = parseInt(periodFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Claims data
      const { data: claims } = await supabase
        .from("claims")
        .select(`
          id,
          status,
          created_at,
          updated_at,
          dossiers(id, created_at, status)
        `)
        .eq("insurer_org_id", userRole.organization_id)
        .gte("created_at", startDate.toISOString());

      const totalClaims = claims?.length || 0;
      const approvedClaims = claims?.filter(c => 
        c.status === 'API_APPROVED' || c.status === 'MANUAL_APPROVED'
      ).length || 0;
      const rejectedClaims = claims?.filter(c => 
        c.status === 'API_REJECTED' || c.status === 'MANUAL_REJECTED'
      ).length || 0;

      // Calculate avg turnaround time
      const completedClaims = claims?.filter(c => 
        c.status === 'API_APPROVED' || c.status === 'MANUAL_APPROVED' ||
        c.status === 'API_REJECTED' || c.status === 'MANUAL_REJECTED'
      ) || [];
      
      const avgTurnaround = completedClaims.length > 0
        ? completedClaims.reduce((acc, claim) => {
            const start = new Date(claim.created_at);
            const end = new Date(claim.updated_at);
            const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            return acc + days;
          }, 0) / completedClaims.length
        : 0;

      // Invoices data
      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id,
          status,
          total,
          created_at,
          paid_at,
          dossiers!inner(insurer_org_id)
        `)
        .eq("dossiers.insurer_org_id", userRole.organization_id)
        .gte("created_at", startDate.toISOString());

      const totalInvoices = invoices?.length || 0;
      const approvedInvoices = invoices?.filter(i => i.status === 'APPROVED').length || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'PAID').length || 0;
      const needsInfoInvoices = invoices?.filter(i => i.status === 'NEEDS_INFO').length || 0;

      const totalInvoiceAmount = invoices?.reduce((acc, inv) => acc + Number(inv.total), 0) || 0;
      const paidAmount = invoices?.filter(i => i.status === 'PAID')
        .reduce((acc, inv) => acc + Number(inv.total), 0) || 0;
      const outstandingAmount = totalInvoiceAmount - paidAmount;

      // Overdue invoices (>30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueInvoices = invoices?.filter(i => 
        i.status !== 'PAID' && 
        i.status !== 'CANCELLED' &&
        new Date(i.created_at) < thirtyDaysAgo
      ).length || 0;

      // Invoice avg turnaround
      const paidInvoicesList = invoices?.filter(i => i.status === 'PAID' && i.paid_at) || [];
      const invoiceAvgTurnaround = paidInvoicesList.length > 0
        ? paidInvoicesList.reduce((acc, inv) => {
            const start = new Date(inv.created_at);
            const end = new Date(inv.paid_at!);
            const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            return acc + days;
          }, 0) / paidInvoicesList.length
        : 0;

      return {
        claims: {
          total: totalClaims,
          approved: approvedClaims,
          rejected: rejectedClaims,
          avgTurnaround: avgTurnaround.toFixed(1),
        },
        invoices: {
          total: totalInvoices,
          approved: approvedInvoices,
          paid: paidInvoices,
          needsInfo: needsInfoInvoices,
          totalAmount: totalInvoiceAmount,
          paidAmount: paidAmount,
          outstandingAmount: outstandingAmount,
          overdue: overdueInvoices,
          avgTurnaround: invoiceAvgTurnaround.toFixed(1),
        },
      };
    },
  });

  const exportToCSV = () => {
    // Simple CSV export logic
    const csvContent = `Rapportage,Waarde
Periode,${periodFilter} dagen
Claims Totaal,${stats?.claims.total}
Claims Goedgekeurd,${stats?.claims.approved}
Claims Afgewezen,${stats?.claims.rejected}
Gem. Doorlooptijd Claims,${stats?.claims.avgTurnaround} dagen
Facturen Totaal,${stats?.invoices.total}
Facturen Goedgekeurd,${stats?.invoices.approved}
Facturen Betaald,${stats?.invoices.paid}
Facturen Info Nodig,${stats?.invoices.needsInfo}
Totaal Bedrag,€${stats?.invoices.totalAmount.toFixed(2)}
Betaald Bedrag,€${stats?.invoices.paidAmount.toFixed(2)}
Openstaand Bedrag,€${stats?.invoices.outstandingAmount.toFixed(2)}
Achterstallig (>30d),${stats?.invoices.overdue}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapportage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6">Laden...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rapportage</h1>
            <p className="text-muted-foreground mt-1">Overzicht van claims, facturen en doorlooptijden</p>
          </div>
          <div className="flex gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Laatste 7 dagen</SelectItem>
                <SelectItem value="30">Laatste 30 dagen</SelectItem>
                <SelectItem value="90">Laatste 90 dagen</SelectItem>
                <SelectItem value="365">Laatste jaar</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporteer CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claims Totaal</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.claims.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.claims.approved} goedgekeurd, {stats?.claims.rejected} afgewezen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Doorlooptijd Claims</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.claims.avgTurnaround} dagen</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Openstaand Bedrag</CardTitle>
              <Euro className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                €{stats?.invoices.outstandingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.invoices.overdue} achterstallig ({'>'}30d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Betalingstermijn</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.invoices.avgTurnaround} dagen</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Claims Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Waarde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Totaal Claims</TableCell>
                    <TableCell className="text-right font-medium">{stats?.claims.total}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Goedgekeurd</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{stats?.claims.approved}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Afgewezen</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{stats?.claims.rejected}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Goedkeuringspercentage</TableCell>
                    <TableCell className="text-right font-medium">
                      {stats?.claims.total && stats.claims.total > 0
                        ? ((stats.claims.approved / stats.claims.total) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturen Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aantal</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Totaal</TableCell>
                    <TableCell className="text-right font-medium">{stats?.invoices.total}</TableCell>
                    <TableCell className="text-right">€{stats?.invoices.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Goedgekeurd</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{stats?.invoices.approved}</Badge>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Betaald</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-success text-success-foreground">{stats?.invoices.paid}</Badge>
                    </TableCell>
                    <TableCell className="text-right">€{stats?.invoices.paidAmount.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Info Nodig</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-500 text-white">{stats?.invoices.needsInfo}</Badge>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Openstaand</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right text-warning">
                      €{stats?.invoices.outstandingAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
