import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  rejection_reason: string | null;
  export_url: string | null;
  metadata: any;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminGDPR() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data: requestsData, error } = await supabase
        .from("gdpr_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      // Haal profile informatie apart op voor elke request
      const requestsWithProfiles = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", request.user_id)
            .single();

          return {
            ...request,
            profiles: profile || undefined,
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Fout bij ophalen verzoeken",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      // Voor DATA_EXPORT: genereer export
      if (selectedRequest.request_type === "DATA_EXPORT") {
        const { data: exportData, error: exportError } = await supabase.rpc(
          "get_user_data_export",
          { p_user_id: selectedRequest.user_id }
        );

        if (exportError) throw exportError;

        // In productie zou je dit uploaden naar storage en een presigned URL genereren
        // Voor nu: simuleren we dat met een JSON blob
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const { error: updateError } = await supabase
          .from("gdpr_requests")
          .update({
            status: "COMPLETED",
            processed_at: new Date().toISOString(),
            processed_by: (await supabase.auth.getUser()).data.user?.id,
            notes: actionNotes,
            export_url: url, // In productie: presigned URL
          })
          .eq("id", selectedRequest.id);

        if (updateError) throw updateError;

        toast({
          title: "Data export gegenereerd",
          description: "Gebruiker kan nu hun data downloaden.",
        });
      }

      // Voor DATA_DELETION: markeer als compleet (daadwerkelijke verwijdering gebeurt in achtergrond)
      if (selectedRequest.request_type === "DATA_DELETION") {
        const { error: updateError } = await supabase
          .from("gdpr_requests")
          .update({
            status: "PROCESSING",
            processed_at: new Date().toISOString(),
            processed_by: (await supabase.auth.getUser()).data.user?.id,
            notes: actionNotes,
          })
          .eq("id", selectedRequest.id);

        if (updateError) throw updateError;

        toast({
          title: "Verwijdering gestart",
          description: "Data wordt verwijderd volgens retentiebeleid.",
        });
      }

      setShowApproveDialog(false);
      setSelectedRequest(null);
      setActionNotes("");
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Fout bij verwerken verzoek",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      const { error } = await supabase
        .from("gdpr_requests")
        .update({
          status: "REJECTED",
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: rejectionReason,
          notes: actionNotes,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Verzoek afgewezen",
        description: "Gebruiker wordt op de hoogte gesteld.",
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      setActionNotes("");
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Fout bij afwijzen verzoek",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />In behandeling</Badge>;
      case "PROCESSING":
        return <Badge variant="outline" className="gap-1"><AlertTriangle className="w-3 h-3" />Wordt verwerkt</Badge>;
      case "COMPLETED":
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Voltooid</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Afgewezen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeName = (type: string) => {
    switch (type) {
      case "DATA_EXPORT":
        return "Data Export (Inzage)";
      case "DATA_DELETION":
        return "Data Verwijdering (Vergetelheid)";
      case "DATA_RECTIFICATION":
        return "Data Correctie";
      case "DATA_RESTRICTION":
        return "Beperking Verwerking";
      case "DATA_OBJECTION":
        return "Bezwaar Verwerking";
      default:
        return type;
    }
  };

  const filterByStatus = (status: string) => {
    if (status === "all") return requests;
    return requests.filter((req) => req.status === status);
  };

  const RequestCard = ({ request }: { request: GDPRRequest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {request.profiles?.first_name} {request.profiles?.last_name}
            </CardTitle>
            <CardDescription>{request.profiles?.email}</CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Type verzoek</p>
            <p className="font-medium">{getRequestTypeName(request.request_type)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Aangevraagd op</p>
            <p className="font-medium">
              {format(new Date(request.requested_at), "d MMMM yyyy", { locale: nl })}
            </p>
          </div>
        </div>

        {request.notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Notities gebruiker</p>
            <p className="text-sm bg-muted p-2 rounded">{request.notes}</p>
          </div>
        )}

        {request.rejection_reason && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Reden afwijzing</p>
            <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">
              {request.rejection_reason}
            </p>
          </div>
        )}

        {request.status === "PENDING" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedRequest(request);
                setShowApproveDialog(true);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Goedkeuren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedRequest(request);
                setShowRejectDialog(true);
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Afwijzen
            </Button>
          </div>
        )}

        {request.status === "COMPLETED" && request.export_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(request.export_url!, "_blank")}
          >
            <FileDown className="w-4 h-4 mr-1" />
            Download Export
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">GDPR Verzoeken</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Beheer data export en verwijderingsverzoeken van gebruikers
                </p>
              </div>

              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">
                    Alle ({requests.length})
                  </TabsTrigger>
                  <TabsTrigger value="PENDING">
                    In behandeling ({filterByStatus("PENDING").length})
                  </TabsTrigger>
                  <TabsTrigger value="PROCESSING">
                    Wordt verwerkt ({filterByStatus("PROCESSING").length})
                  </TabsTrigger>
                  <TabsTrigger value="COMPLETED">
                    Voltooid ({filterByStatus("COMPLETED").length})
                  </TabsTrigger>
                  <TabsTrigger value="REJECTED">
                    Afgewezen ({filterByStatus("REJECTED").length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {loading ? (
                    <p>Laden...</p>
                  ) : requests.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Geen GDPR verzoeken gevonden
                      </CardContent>
                    </Card>
                  ) : (
                    requests.map((request) => <RequestCard key={request.id} request={request} />)
                  )}
                </TabsContent>

                {["PENDING", "PROCESSING", "COMPLETED", "REJECTED"].map((status) => (
                  <TabsContent key={status} value={status} className="space-y-4">
                    {filterByStatus(status).length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          Geen verzoeken met status "{status}"
                        </CardContent>
                      </Card>
                    ) : (
                      filterByStatus(status).map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verzoek goedkeuren</DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_type === "DATA_EXPORT"
                ? "Er wordt een data export gegenereerd die de gebruiker kan downloaden."
                : "De data van de gebruiker wordt verwijderd volgens het retentiebeleid."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notities (optioneel)</label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("gdpr.notesPlaceholder")}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleApproveRequest}>Goedkeuren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verzoek afwijzen</DialogTitle>
            <DialogDescription>
              Geef een reden op waarom dit verzoek wordt afgewezen. De gebruiker ontvangt deze reden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reden voor afwijzing *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("gdpr.rejectionReasonPlaceholder")}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Aanvullende notities (optioneel)</label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("gdpr.internalNotesPlaceholder")}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={!rejectionReason}
            >
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
