import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  dossier_id: string;
  file_name: string;
  file_url: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

export default function AdminDocumentReview() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "IN_REVIEW")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon documenten niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: pending } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "IN_REVIEW");

      const { count: approved } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "APPROVED");

      const { count: rejected } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "REJECTED");

      setStats({
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleAction = (doc: Document, action: "approve" | "reject") => {
    setSelectedDoc(doc);
    setActionType(action);
    setRejectionReason("");
  };

  const confirmAction = async () => {
    if (!selectedDoc || !actionType) return;

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor afkeuring",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: actionType === "approve" ? "APPROVED" : "REJECTED",
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: actionType === "reject" ? rejectionReason : null,
        })
        .eq("id", selectedDoc.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: actionType === "approve" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
        p_target_type: "Document",
        p_target_id: selectedDoc.id,
        p_reason: actionType === "reject" ? rejectionReason : null,
      });

      toast({
        title: actionType === "approve" ? "Goedgekeurd" : "Afgekeurd",
        description: `Document ${actionType === "approve" ? "goedgekeurd" : "afgekeurd"}`,
      });

      setSelectedDoc(null);
      setActionType(null);
      setRejectionReason("");
      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error("Error updating document:", error);
      toast({
        title: "Fout",
        description: "Kon document niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      AKTE: "Overlijdensakte",
      IIIC: "Model III-C",
      IIID: "Model III-D",
      VERZEKERING: "Verzekeringsbewijs",
      IDENTITEIT: "Identiteitsbewijs",
      OTHER: "Overig",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Document Review
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beoordeel ingediende documenten
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Te beoordelen</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Goedgekeurd</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Afgekeurd</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.documentReview.toReview")} ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.dossierId")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.documentType")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.filename")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.uploadedOn")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Geen documenten te beoordelen
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{doc.dossier_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getDocTypeLabel(doc.doc_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.file_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleAction(doc, "approve")}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Goedkeuren
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleAction(doc, "reject")}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Afkeuren
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

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => {
        setSelectedDoc(null);
        setActionType(null);
        setRejectionReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Document goedkeuren" : "Document afkeuren"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Weet je zeker dat je dit document wilt goedkeuren?"
                : "Geef een reden op waarom je dit document afkeurt"}
            </DialogDescription>
          </DialogHeader>
          {actionType === "reject" && (
            <Textarea
              placeholder={t("placeholders.rejectionReason")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDoc(null);
                setActionType(null);
                setRejectionReason("");
              }}
            >
              Annuleren
            </Button>
            <Button onClick={confirmAction}>
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
