import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileBarChart, FolderOpen, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KPICard } from "@/components/KPICard";
import { Database } from "@/integrations/supabase/types";

export default function InsurerDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30");

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Verzekeraar Dashboard</h1>
            <p className="text-muted-foreground">Overzicht van verzekerde dossiers</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/rapporten")}
          >
            <FileBarChart className="mr-2 h-4 w-4" />
            Rapporten
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
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
        <div className="grid gap-4 md:grid-cols-4">
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

        {/* Dossiers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dossiers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : filteredDossiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Geen dossiers gevonden</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Polis</TableHead>
                    <TableHead>Minimumpakket</TableHead>
                    <TableHead>Planning</TableHead>
                    <TableHead>Laatste update</TableHead>
                    <TableHead>Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDossiers.map((dossier) => (
                    <TableRow key={dossier.id}>
                      <TableCell className="font-medium">{dossier.ref_number}</TableCell>
                      <TableCell>
                        {dossier.polis_checks?.[0] ? (
                          <div>
                            <div>{dossier.polis_checks[0].is_covered ? "Actief" : "Niet gevonden"}</div>
                            {dossier.polis_checks[0].num_travelers && (
                              <div className="text-sm text-muted-foreground">
                                {dossier.polis_checks[0].num_travelers} reiziger(s)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getDocumentPackageStatus(dossier.documents || [])}</TableCell>
                      <TableCell>
                        {dossier.legal_hold ? (
                          <Badge variant="destructive">LEGAL_HOLD</Badge>
                        ) : (
                          getPlanningStatus(dossier)
                        )}
                      </TableCell>
                      <TableCell>
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
    );
  }
