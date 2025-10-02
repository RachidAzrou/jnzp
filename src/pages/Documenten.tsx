import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Eye, CheckCircle, XCircle, Clock, FileText, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";

const Documenten = () => {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") === "missing" ? "missing" : "all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDocForReject, setSelectedDocForReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, statusFilter, typeFilter]);

  const fetchData = async () => {
    const [{ data: docsData }, { data: dossiersData }] = await Promise.all([
      supabase
        .from("documents")
        .select("*, dossiers(ref_number, deceased_name)")
        .order("uploaded_at", { ascending: false }),
      supabase.from("dossiers").select("*").order("ref_number")
    ]);

    setDocuments(docsData || []);
    setDossiers(dossiersData || []);
    setLoading(false);
  };

  const filterDocuments = () => {
    let filtered = [...documents];
    
    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.dossiers?.ref_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === "missing") {
      filtered = filtered.filter(doc => ["IN_REVIEW", "REJECTED"].includes(doc.status));
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(doc => doc.doc_type === typeFilter);
    }
    
    setFilteredDocs(filtered);
  };

  const getStatusIcon = (status: string) => {
    if (status === "APPROVED") return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === "REJECTED") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") return <Badge variant="default">Goedgekeurd</Badge>;
    if (status === "REJECTED") return <Badge variant="destructive">Afgewezen</Badge>;
    return <Badge variant="secondary">In behandeling</Badge>;
  };

  const handleApprove = async (docId: string) => {
    const { error } = await supabase
      .from("documents")
      .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
      .eq("id", docId);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Document goedgekeurd" });
      fetchData();
    }
  };

  const openRejectDialog = (docId: string) => {
    setSelectedDocForReject(docId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedDocForReject) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Afwijsreden verplicht",
        description: "Geef een reden op voor het afwijzen van dit document.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("documents")
      .update({ 
        status: "REJECTED", 
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq("id", selectedDocForReject);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Document afgewezen" });
      setRejectDialogOpen(false);
      setSelectedDocForReject(null);
      setRejectionReason("");
      fetchData();
    }
  };

  const approvedCount = documents.filter(d => d.status === "APPROVED").length;
  const pendingCount = documents.filter(d => d.status === "IN_REVIEW").length;
  const rejectedCount = documents.filter(d => d.status === "REJECTED").length;

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
          <h1 className="text-3xl font-bold">Documenten</h1>
          <p className="text-muted-foreground mt-1">Beheer en controleer alle dossier documenten</p>
        </div>
        <DocumentUploadDialog dossiers={dossiers} onUploadComplete={fetchData} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal</p>
                <p className="text-2xl font-bold mt-1">{documents.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goedgekeurd</p>
                <p className="text-2xl font-bold mt-1 text-success">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In behandeling</p>
                <p className="text-2xl font-bold mt-1 text-warning">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Afgewezen</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {statusFilter === "missing" && (
        <Card className="bg-warning/10 border-warning">
          <CardContent className="pt-4">
            <p className="text-sm">
              <strong>Filter actief:</strong> Ontbrekende documenten ({filteredDocs.length})
              <Button variant="link" size="sm" onClick={() => setStatusFilter("all")} className="ml-2">
                Filter wissen
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of dossier..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status:</span>
              </div>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Alle
              </Button>
              <Button
                variant={statusFilter === "IN_REVIEW" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("IN_REVIEW")}
              >
                In behandeling
              </Button>
              <Button
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("APPROVED")}
              >
                Goedgekeurd
              </Button>
              <Button
                variant={statusFilter === "REJECTED" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("REJECTED")}
              >
                Afgewezen
              </Button>
              <div className="border-l mx-2" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
              </div>
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                Alle types
              </Button>
              <Button
                variant={typeFilter === "DEATH_CERT" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("DEATH_CERT")}
              >
                Overlijdensakte
              </Button>
              <Button
                variant={typeFilter === "PASSPORT" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("PASSPORT")}
              >
                Paspoort
              </Button>
              <Button
                variant={typeFilter === "MEDICAL_CERT" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("MEDICAL_CERT")}
              >
                Medisch attest
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Dossier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bestandsnaam</TableHead>
                <TableHead>Upload datum</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={FileText}
                      title={documents.length === 0 ? "Nog geen documenten" : "Geen resultaten"}
                      description={
                        documents.length === 0
                          ? "Upload documenten voor uw dossiers om te starten met de verificatie workflow."
                          : "Geen documenten gevonden met de huidige zoekopdracht. Probeer andere zoektermen."
                      }
                      action={
                        documents.length === 0
                          ? {
                              label: "Eerste document uploaden",
                              onClick: () => {} // Dialog wordt geopend via de button bovenaan
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        {getStatusBadge(doc.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {doc.dossiers?.ref_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.doc_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      {doc.file_name}
                      {doc.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">
                          Reden: {doc.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.uploaded_at), "dd-MM-yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {doc.status === "IN_REVIEW" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(doc.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Goedkeuren
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRejectDialog(doc.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Afwijzen
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document afwijzen</DialogTitle>
            <DialogDescription>
              Geef een reden op waarom dit document wordt afgewezen. Dit is verplicht.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Afwijsreden *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Bijv. Document is onleesbaar, verkeerde type document, etc..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Document afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documenten;
