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
import { Search, Download, Eye, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";

const Documenten = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery]);

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

  const handleReject = async (docId: string) => {
    const { error } = await supabase
      .from("documents")
      .update({ 
        status: "REJECTED", 
        reviewed_at: new Date().toISOString(),
        rejection_reason: "Document niet conform"
      })
      .eq("id", docId);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Document afgewezen" });
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

      <Card>
        <CardHeader>
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
                              onClick={() => handleReject(doc.id)}
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
    </div>
  );
};

export default Documenten;
