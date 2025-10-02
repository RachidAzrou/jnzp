import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function InsurerDossierDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"none" | "reject">("none");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: dossier, isLoading } = useQuery({
    queryKey: ["insurer-dossier-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          *,
          documents(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ docId, status, reason }: { docId: string; status: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("documents")
        .update(updateData)
        .eq("id", docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurer-dossier-documents", id] });
      toast({
        title: "Document bijgewerkt",
        description: "De beoordeling is opgeslagen",
      });
      setSelectedDoc(null);
      setReviewAction("none");
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon document niet bijwerken: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleReview = () => {
    if (!selectedDoc) return;

    if (reviewAction === "reject") {
      if (rejectionReason.trim().length < 8) {
        toast({
          title: "Ongeldige reden",
          description: "Afwijzingsreden moet minimaal 8 tekens bevatten",
          variant: "destructive",
        });
        return;
      }
      updateDocumentMutation.mutate({
        docId: selectedDoc.id,
        status: "REJECTED",
        reason: rejectionReason,
      });
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="default">Goedgekeurd</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Afgewezen</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getDocumentTypeLabel = (docType: string) => {
    const labels: Record<string, string> = {
      "MEDICAL_DEATH_CERT": "Med. overlijdensverklaring (IIIC/IIID)",
      "ID_DECEASED": "ID Overledene",
      "LAISSEZ_PASSER": "Laissez-passer",
      "COFFIN_CERT": "Kistingsattest",
    };
    return labels[docType] || docType;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">Laden...</div>
        </div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">Dossier niet gevonden</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/insurer/dossier/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Dossier {dossier.ref_number} - Documenten</h1>
            <p className="text-muted-foreground">Verzekeraar documentbeoordeling</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle>Minimumpakket</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dossier.documents && dossier.documents.length > 0 ? (
                    dossier.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{getDocumentTypeLabel(doc.doc_type)}</TableCell>
                        <TableCell>{getDocumentStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDoc(doc)}
                          >
                            Toon
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Geen documenten beschikbaar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Review Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Review / Comment (optioneel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDoc ? (
                <>
                  <div>
                    <p className="font-medium mb-2">Geselecteerd document:</p>
                    <p className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(selectedDoc.doc_type)} - {selectedDoc.file_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {getDocumentStatusBadge(selectedDoc.status)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Beoordeling</Label>
                    <RadioGroup value={reviewAction} onValueChange={(v) => setReviewAction(v as "none" | "reject")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none">Geen oordeel</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reject" id="reject" />
                        <Label htmlFor="reject">Afwijzen (verzekeraar)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {reviewAction === "reject" && (
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reden bij afwijzing</Label>
                      <Textarea
                        id="reason"
                        placeholder="Geef een duidelijke reden voor afwijzing (minimaal 8 tekens)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReview}
                      disabled={reviewAction === "none" || updateDocumentMutation.isPending}
                    >
                      Opslaan beoordeling
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedDoc(null);
                        setReviewAction("none");
                        setRejectionReason("");
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Let op:</strong> Afwijzen vereist een duidelijke motivatie; 
                      FD en Familie krijgen notificatie.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Selecteer een document om te beoordelen</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
