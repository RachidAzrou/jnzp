import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, AlertCircle, CheckCircle, XCircle, Lock, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getCurrentDate = () => {
  return new Date().toLocaleDateString("nl-NL", { 
    weekday: "long", 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
};

export default function InsurerClaims() {
  const navigate = useNavigate();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["insurer-claims"],
    queryFn: async () => {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("role", "insurer")
        .single();

      if (!userRoles?.organization_id) return [];

      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          dossier:dossiers!inner(
            id,
            ref_number,
            display_id,
            deceased_name,
            status,
            flow,
            assigned_fd_org_id,
            fd_org:organizations!assigned_fd_org_id(name)
          )
        `)
        .eq("insurer_org_id", userRoles.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; icon: any; label: string }> = {
      API_APPROVED: { variant: "default", icon: CheckCircle, label: "Goedgekeurd (API)" },
      MANUAL_APPROVED: { variant: "default", icon: CheckCircle, label: "Goedgekeurd (Manueel)" },
      API_REJECTED: { variant: "destructive", icon: XCircle, label: "Afgewezen (API)" },
      MANUAL_REJECTED: { variant: "destructive", icon: XCircle, label: "Afgewezen (Manueel)" },
      API_PENDING: { variant: "secondary", icon: AlertCircle, label: "In behandeling (API)" },
      BLOCKED: { variant: "outline", icon: Lock, label: "Geblokkeerd" },
    };

    const config = variants[status] || { variant: "secondary", icon: AlertCircle, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingClaims = claims?.filter(c => c.status === 'API_PENDING') || [];
  const blockedClaims = claims?.filter(c => c.status === 'BLOCKED') || [];
  const approvedClaims = claims?.filter(c => c.status === 'API_APPROVED' || c.status === 'MANUAL_APPROVED') || [];
  const rejectedClaims = claims?.filter(c => c.status === 'API_REJECTED' || c.status === 'MANUAL_REJECTED') || [];

  const renderClaimRow = (claim: any) => (
    <TableRow key={claim.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/insurer/dossier/${claim.dossier.id}`)}>
      <TableCell className="font-medium">{claim.dossier.display_id || claim.dossier.ref_number}</TableCell>
      <TableCell>{claim.dossier.deceased_name}</TableCell>
      <TableCell>
        <Badge variant="outline">{claim.dossier.flow === 'REP' ? 'Repatriëring' : claim.dossier.flow === 'LOC' ? 'Lokaal' : 'Onbekend'}</Badge>
      </TableCell>
      <TableCell className="font-mono text-sm">{claim.policy_number}</TableCell>
      <TableCell>{getStatusBadge(claim.status)}</TableCell>
      <TableCell>{claim.dossier.fd_org?.name || '-'}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/insurer/dossier/${claim.dossier.id}`); }}>
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Verzekeraar</p>
                <h1 className="text-2xl font-bold tracking-tight">Claims Beheer</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground capitalize">{getCurrentDate()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In behandeling</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingClaims.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Geblokkeerd</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{blockedClaims.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Goedgekeurd</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedClaims.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Afgewezen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedClaims.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">In behandeling ({pendingClaims.length})</TabsTrigger>
            <TabsTrigger value="blocked">Geblokkeerd ({blockedClaims.length})</TabsTrigger>
            <TabsTrigger value="approved">Goedgekeurd ({approvedClaims.length})</TabsTrigger>
            <TabsTrigger value="rejected">Afgewezen ({rejectedClaims.length})</TabsTrigger>
            <TabsTrigger value="all">Alle ({claims?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier ID</TableHead>
                      <TableHead>Overledene</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Polisnummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FD</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingClaims.length > 0 ? (
                      pendingClaims.map(renderClaimRow)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen claims in behandeling
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocked">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier ID</TableHead>
                      <TableHead>Overledene</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Polisnummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FD</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedClaims.length > 0 ? (
                      blockedClaims.map(renderClaimRow)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen geblokkeerde claims
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier ID</TableHead>
                      <TableHead>Overledene</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Polisnummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FD</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedClaims.length > 0 ? (
                      approvedClaims.map(renderClaimRow)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen goedgekeurde claims
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier ID</TableHead>
                      <TableHead>Overledene</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Polisnummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FD</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedClaims.length > 0 ? (
                      rejectedClaims.map(renderClaimRow)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen afgewezen claims
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier ID</TableHead>
                      <TableHead>Overledene</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Polisnummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FD</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims && claims.length > 0 ? (
                      claims.map(renderClaimRow)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen claims gevonden
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
