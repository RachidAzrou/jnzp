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
import { Search, Plus, Filter, AlertCircle, FolderOpen } from "lucide-react";
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
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDossiers();
  }, []);

  useEffect(() => {
    filterDossiers();
  }, [dossiers, searchQuery, statusFilter]);

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

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          d.ref_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.deceased_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam of dossiernummer..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
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
                  <TableCell colSpan={7}>
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
                        <span className="font-mono">{dossier.ref_number}</span>
                        {dossier.legal_hold && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Legal Hold
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{dossier.deceased_name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(dossier.status)}>
                        {dossier.status.replace(/_/g, " ")}
                      </Badge>
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
