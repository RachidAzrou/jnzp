import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, AlertCircle, FolderOpen, Plane, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

const Dossiers = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [flowFilter, setFlowFilter] = useState<string>(searchParams.get("flow") || "all");
  const { toast } = useToast();

  useEffect(() => {
    fetchDossiers();
  }, []);

  useEffect(() => {
    filterDossiers();
  }, [dossiers, searchQuery, statusFilter, flowFilter]);

  const fetchDossiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dossiers")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setDossiers(data);
    }
    setLoading(false);
  };

  const filterDossiers = () => {
    let filtered = [...dossiers];

    // Search filter - check both display_id and ref_number
    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          (d.display_id && d.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
          d.ref_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.deceased_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Flow filter
    if (flowFilter !== "all") {
      filtered = filtered.filter((d) => d.flow === flowFilter);
    }

    setFilteredDossiers(filtered);
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      CREATED: "secondary",
      INTAKE_IN_PROGRESS: "default",
      DOCS_PENDING: "secondary",
      FD_ASSIGNED: "default",
      DOCS_VERIFIED: "default",
      APPROVED: "default",
      LEGAL_HOLD: "destructive",
      PLANNING: "default",
      READY_FOR_TRANSPORT: "default",
      IN_TRANSIT: "default",
      ARCHIVED: "secondary",
    };
    return variants[status] || "secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: "Aangemaakt",
      INTAKE_IN_PROGRESS: "Intake lopend",
      DOCS_PENDING: "Documenten vereist",
      FD_ASSIGNED: "FD toegewezen",
      DOCS_VERIFIED: "Docs geverifieerd",
      APPROVED: "Goedgekeurd",
      LEGAL_HOLD: "Legal Hold",
      PLANNING: "Planning",
      READY_FOR_TRANSPORT: "Klaar voor transport",
      IN_TRANSIT: "In transit",
      ARCHIVED: "Gearchiveerd",
    };
    return labels[status] || status.replace(/_/g, " ");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd-MM-yyyy");
    } catch {
      return "N/A";
    }
  };

  const handleViewDetails = (dossierId: string) => {
    navigate(`/dossiers/${dossierId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dossiers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {filteredDossiers.length} van {dossiers.length} dossiers
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nieuw dossier
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op ID (REP-/LOC-) of naam..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Flow Filter */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Flow:</span>
              <Button
                variant={flowFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFlowFilter("all")}
              >
                Alle
              </Button>
              <Button
                variant={flowFilter === "REP" ? "default" : "outline"}
                size="sm"
                onClick={() => setFlowFilter("REP")}
                className="flex-shrink-0"
              >
                <Plane className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Repatriëring</span>
              </Button>
              <Button
                variant={flowFilter === "LOC" ? "default" : "outline"}
                size="sm"
                onClick={() => setFlowFilter("LOC")}
                className="flex-shrink-0"
              >
                <MapPin className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Lokaal</span>
              </Button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Alle
              </Button>
              <Button
                variant={statusFilter === "DOCS_PENDING" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("DOCS_PENDING")}
                className="text-xs sm:text-sm"
              >
                Docs
              </Button>
              <Button
                variant={statusFilter === "LEGAL_HOLD" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("LEGAL_HOLD")}
                className="flex-shrink-0"
              >
                <AlertCircle className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Legal Hold</span>
              </Button>
              <Button
                variant={statusFilter === "PLANNING" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("PLANNING")}
              >
                Planning
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier</TableHead>
                <TableHead className="hidden md:table-cell">Flow</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Geboren</TableHead>
                <TableHead className="hidden lg:table-cell">Overleden</TableHead>
                <TableHead className="hidden xl:table-cell">Aangemaakt</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={FolderOpen}
                      title={dossiers.length === 0 ? "Nog geen dossiers" : "Geen resultaten"}
                      description={
                        dossiers.length === 0
                          ? "Start met het aanmaken van uw eerste repatriëringsdossier."
                          : "Geen dossiers gevonden met de huidige filters. Probeer andere zoektermen."
                      }
                      action={
                        dossiers.length === 0
                          ? {
                              label: "Nieuw dossier aanmaken",
                              onClick: () => toast({ title: "Functie komt binnenkort" })
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                 filteredDossiers.map((dossier) => (
                  <TableRow key={dossier.id} className="cursor-pointer hover:bg-muted/50">
                     <TableCell className="font-medium">
                      <span className="font-mono text-xs sm:text-sm">{dossier.display_id || dossier.ref_number}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {dossier.flow === "REP" && (
                        <Badge variant="outline" className="gap-1">
                          <Plane className="h-3 w-3" />
                          Repatriëring
                        </Badge>
                      )}
                      {dossier.flow === "LOC" && (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          Lokaal
                        </Badge>
                      )}
                      {dossier.flow === "UNSET" && (
                        <Badge variant="secondary">Niet gekozen</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{dossier.deceased_name}</TableCell>
                     <TableCell>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {dossier.status === "DOCS_PENDING" && !dossier.legal_hold && (
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
                        )}
                        <Badge 
                          variant={getStatusVariant(dossier.status)} 
                          className={`text-[10px] sm:text-xs min-w-[120px] justify-center ${
                            getStatusVariant(dossier.status) !== "destructive" 
                              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" 
                              : ""
                          }`}
                        >
                          {getStatusLabel(dossier.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                      {formatDate(dossier.deceased_dob)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                      {formatDate(dossier.date_of_death)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground hidden xl:table-cell">
                      {formatDate(dossier.created_at)}
                    </TableCell>
                     <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewDetails(dossier.id)}
                        className="text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Open Dossier</span>
                        <span className="sm:hidden">Open</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};

export default Dossiers;
