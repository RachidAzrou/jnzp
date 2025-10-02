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
import { useSearchParams } from "react-router-dom";
import { DossierDetailSheet } from "@/components/DossierDetailSheet";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

const Dossiers = () => {
  const [searchParams] = useSearchParams();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [flowFilter, setFlowFilter] = useState<string>(searchParams.get("flow") || "all");
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd-MM-yyyy");
    } catch {
      return "N/A";
    }
  };

  const handleViewDetails = (dossier: any) => {
    setSelectedDossier(dossier);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground mt-1">
            {filteredDossiers.length} van {dossiers.length} dossiers
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nieuw dossier
        </Button>
      </div>

      <Card>
        <CardHeader>
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
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">Flow:</span>
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
              >
                <Plane className="h-4 w-4 mr-1" />
                Repatriëring
              </Button>
              <Button
                variant={flowFilter === "LOC" ? "default" : "outline"}
                size="sm"
                onClick={() => setFlowFilter("LOC")}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Lokaal
              </Button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
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
              >
                Docs Pending
              </Button>
              <Button
                variant={statusFilter === "LEGAL_HOLD" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("LEGAL_HOLD")}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Legal Hold
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
                <TableHead>Flow</TableHead>
                <TableHead>Naam overledene</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Geboortedatum</TableHead>
                <TableHead>Overlijdensdatum</TableHead>
                <TableHead>Aangemaakt</TableHead>
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{dossier.display_id || dossier.ref_number}</span>
                        {dossier.legal_hold && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Legal Hold
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>{dossier.deceased_name}</TableCell>
                     <TableCell>
                      <div className="flex items-center gap-2">
                        {dossier.status === "DOCS_PENDING" && !dossier.legal_hold && (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        <Badge variant={getStatusVariant(dossier.status)}>
                          {dossier.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dossier.deceased_dob)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dossier.date_of_death)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(dossier.created_at)}
                    </TableCell>
                     <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewDetails(dossier)}
                      >
                        Open Dossier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DossierDetailSheet
        dossier={selectedDossier}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};

export default Dossiers;
