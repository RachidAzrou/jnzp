import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, CheckCircle, XCircle, Clock, FileText, Eye, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { DocumentReviewDialog } from "@/components/DocumentReviewDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

const Documenten = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") === "missing" ? "missing" : "all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedDocForReview, setSelectedDocForReview] = useState<any | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, statusFilter, typeFilter]);

  const fetchData = async () => {
    const { data: docsData } = await supabase
      .from("documents")
      .select("*, dossiers(ref_number, deceased_name)")
      .order("uploaded_at", { ascending: false });

    setDocuments(docsData || []);
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

  const handleReviewComplete = async () => {
    await fetchData();
    setSelectedDocForReview(null);
    setReviewDialogOpen(false);
  };

  const toggleDocSelection = (docId: string) => {
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocs(newSelection);
  };

  const bulkMarkAsReview = async () => {
    if (selectedDocs.size === 0) {
      toast({
        title: "Geen documenten geselecteerd",
        description: "Selecteer eerst documenten om te markeren.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("documents")
      .update({ status: "IN_REVIEW" })
      .in("id", Array.from(selectedDocs));

    if (error) {
      toast({
        title: "Fout bij bulk actie",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ 
        title: `${selectedDocs.size} document(en) gemarkeerd als 'In review'`
      });
      setSelectedDocs(new Set());
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      {/* Header */}
      <Card className="mb-6 animate-fade-in border-none shadow-sm bg-gradient-to-r from-card to-muted/30">
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{t("common.management")}</p>
                <h1 className="text-2xl font-bold tracking-tight">{t("documents.title")}</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground pl-15">
              {t("documents.subtitle")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-end">
            <DocumentUploadDialog onUploadComplete={fetchData} />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6 animate-fade-in"
        style={{ animationDelay: '0.1s' }}>
        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal</p>
                <p className="text-2xl font-semibold mt-1">{documents.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goedgekeurd</p>
                <p className="text-2xl font-semibold mt-1">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In behandeling</p>
                <p className="text-2xl font-semibold mt-1">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Afgewezen</p>
                <p className="text-2xl font-semibold mt-1">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            {/* Search Bar with Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek op dossier/naam/bestand..."
                  className="pl-10 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <DocumentUploadDialog onUploadComplete={fetchData} />
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="pt-4 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm font-medium">Status:</span>
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                  >
                    Alle
                  </Button>
                  <Button
                    variant={statusFilter === "missing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("missing")}
                  >
                    Ontbrekend
                  </Button>
                  <Button
                    variant={statusFilter === "IN_REVIEW" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("IN_REVIEW")}
                  >
                    In review
                  </Button>
                  <Button
                    variant={statusFilter === "REJECTED" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("REJECTED")}
                  >
                    Afgewezen
                  </Button>
                  <Button
                    variant={statusFilter === "APPROVED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("APPROVED")}
                  >
                    Goedgekeurd
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Bulk Actions */}
            {selectedDocs.size > 0 && (
              <div className="mb-4 flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                <p className="text-sm">
                  {selectedDocs.size} geselecteerd
                </p>
                <Button size="sm" variant="outline" onClick={bulkMarkAsReview}>
                  Markeer als 'In review'
                </Button>
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedDocs.size === filteredDocs.length && filteredDocs.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
                          } else {
                            setSelectedDocs(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bestandsnaam</TableHead>
                    <TableHead>Upload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          {documents.length === 0 ? "Nog geen documenten" : "Geen resultaten"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc) => (
                      <TableRow 
                        key={doc.id}
                        className="hover:bg-muted/30"
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedDocs.has(doc.id)}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.dossiers?.ref_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.doc_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {doc.file_name}
                          {doc.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">
                              {doc.rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(doc.uploaded_at), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              doc.status === "APPROVED" 
                                ? "default" 
                                : doc.status === "REJECTED" 
                                ? "destructive" 
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {doc.status === "APPROVED" ? "Goedgekeurd" : doc.status === "REJECTED" ? "Afgewezen" : "In behandeling"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDocForReview(doc);
                              setReviewDialogOpen(true);
                            }}
                          >
                            {t("common.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Document Review Dialog */}
        <DocumentReviewDialog
          document={selectedDocForReview}
          open={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setSelectedDocForReview(null);
          }}
          onReviewComplete={handleReviewComplete}
        />
      </div>
    </div>
  );
};

export default Documenten;