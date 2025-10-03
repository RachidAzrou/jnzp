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
import { Search, Download, Eye, CheckCircle, XCircle, Clock, FileText, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Documenten = () => {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") === "missing" ? "missing" : "all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedDocForReview, setSelectedDocForReview] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [noteToFamily, setNoteToFamily] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
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
    return <Badge variant="secondary">In review</Badge>;
  };

  const handleRejectSubmit = async (saveAndNext: boolean = false) => {
    if (!selectedDocForReview) return;
    
    if (reviewDecision === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Afwijsreden verplicht",
        description: "Geef een reden op voor het afwijzen van dit document (minimaal 8 tekens).",
        variant: "destructive",
      });
      return;
    }

    if (reviewDecision === "reject" && rejectionReason.trim().length < 8) {
      toast({
        title: "Afwijsreden te kort",
        description: "De afwijsreden moet minimaal 8 tekens bevatten.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      reviewed_at: new Date().toISOString(),
    };

    if (reviewDecision === "approve") {
      updateData.status = "APPROVED";
    } else if (reviewDecision === "reject") {
      updateData.status = "REJECTED";
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", selectedDocForReview.id);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ 
        title: reviewDecision === "approve" ? "Document goedgekeurd" : "Document afgewezen"
      });
      
      await fetchData();
      
      if (saveAndNext) {
        loadNextToReview();
      } else {
        resetReviewPanel();
      }
    }
  };

  const resetReviewPanel = () => {
    setSelectedDocForReview(null);
    setReviewDecision(null);
    setRejectionReason("");
    setNoteToFamily("");
  };

  const loadNextToReview = () => {
    const reviewable = filteredDocs.filter(doc => 
      ["IN_REVIEW", "REJECTED"].includes(doc.status)
    );
    
    if (reviewable.length > 0) {
      const currentIndex = selectedDocForReview 
        ? reviewable.findIndex(d => d.id === selectedDocForReview.id)
        : -1;
      
      const nextDoc = reviewable[currentIndex + 1] || reviewable[0];
      setSelectedDocForReview(nextDoc);
      setReviewDecision(null);
      setRejectionReason("");
      setNoteToFamily("");
    } else {
      toast({
        title: "Geen documenten te beoordelen",
        description: "Er zijn geen documenten die beoordeling vereisen.",
      });
      resetReviewPanel();
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documenten</h1>
          <p className="text-muted-foreground mt-1">Snelle documenttriage en beoordeling</p>
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

      {/* Two-column layout: List + Review Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Document List */}
        <div className="lg:col-span-2 space-y-4">
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
                      placeholder="Zoek op dossier/naam/bestand..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                  </div>
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
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedDocs.size > 0 && `${selectedDocs.size} geselecteerd`}
                </p>
                {selectedDocs.size > 0 && (
                  <Button size="sm" variant="outline" onClick={bulkMarkAsReview}>
                    Markeer als 'In review'
                  </Button>
                )}
              </div>
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
                      <TableCell colSpan={7}>
                        <EmptyState
                          icon={FileText}
                          title={documents.length === 0 ? "Nog geen documenten" : "Geen resultaten"}
                          description={
                            documents.length === 0
                              ? "Upload documenten voor uw dossiers om te starten met de verificatie workflow."
                              : "Geen documenten gevonden met de huidige filters."
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc) => (
                      <TableRow 
                        key={doc.id}
                        className={selectedDocForReview?.id === doc.id ? "bg-muted/50" : ""}
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
                        <TableCell className="max-w-[200px] truncate">
                          {doc.file_name}
                          {doc.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">
                              {doc.rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(doc.uploaded_at), "dd-MM HH:mm")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(doc.status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={selectedDocForReview?.id === doc.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedDocForReview(doc);
                              setReviewDecision(null);
                              setRejectionReason("");
                              setNoteToFamily("");
                            }}
                          >
                            Beoordelen
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

        {/* Right: Review Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <h3 className="font-semibold">Review-paneel</h3>
              <p className="text-sm text-muted-foreground">
                Selecteer een document om te beoordelen
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDocForReview ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Geen document geselecteerd
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={loadNextToReview}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Start beoordeling
                  </Button>
                </div>
              ) : (
                <>
                  {/* Document Info */}
                  <div className="space-y-2 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dossier:</span>
                      <span className="font-mono text-sm">{selectedDocForReview.dossiers?.ref_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Type:</span>
                      <span className="text-sm">{selectedDocForReview.doc_type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bestand:</span>
                      <span className="text-sm truncate max-w-[150px]">{selectedDocForReview.file_name}</span>
                    </div>
                  </div>

                  {/* Preview Placeholder */}
                  <div className="bg-muted/30 border-2 border-dashed rounded-lg p-8 text-center">
                    <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Documentvoorbeeld (komt binnenkort)
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Review Decision */}
                  <div className="space-y-3 border-b pb-4">
                    <Label>Beoordeling *</Label>
                    <RadioGroup value={reviewDecision || ""} onValueChange={(val) => setReviewDecision(val as "approve" | "reject")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="approve" id="approve" />
                        <Label htmlFor="approve" className="font-normal cursor-pointer">
                          Goedkeuren
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reject" id="reject" />
                        <Label htmlFor="reject" className="font-normal cursor-pointer">
                          Afwijzen
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Rejection Reason (only if rejecting) */}
                  {reviewDecision === "reject" && (
                    <div className="space-y-2">
                      <Label htmlFor="reason">Afwijsreden * (min. 8 tekens)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Bijv. Document onleesbaar, verkeerd type..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                      {rejectionReason && rejectionReason.length < 8 && (
                        <p className="text-xs text-destructive">
                          Minimaal 8 tekens vereist
                        </p>
                      )}
                    </div>
                  )}

                  {/* Optional Note to Family */}
                  <div className="space-y-2">
                    <Label htmlFor="note">Notitie aan familie (optioneel)</Label>
                    <Textarea
                      id="note"
                      placeholder="Extra boodschap voor de familie..."
                      value={noteToFamily}
                      onChange={(e) => setNoteToFamily(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <Button 
                      className="w-full"
                      disabled={!reviewDecision || (reviewDecision === "reject" && rejectionReason.length < 8)}
                      onClick={() => handleRejectSubmit(false)}
                    >
                      {reviewDecision === "approve" ? "Goedkeuren" : "Afwijzen"}
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      disabled={!reviewDecision || (reviewDecision === "reject" && rejectionReason.length < 8)}
                      onClick={() => handleRejectSubmit(true)}
                    >
                      Opslaan & Volgende
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full"
                      onClick={resetReviewPanel}
                    >
                      Annuleren
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Bij afwijzen is een reden verplicht. Familie ontvangt de reden.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Documenten;