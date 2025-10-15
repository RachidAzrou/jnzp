import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Shield, RefreshCw, AlertCircle, FolderOpen } from "lucide-react";
import { BlockDossierDialog } from "@/components/BlockDossierDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const getCurrentDate = () => {
  return new Date().toLocaleDateString("nl-NL", { 
    weekday: "long", 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
};

export default function InsurerDossierOverview() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrideReason, setOverrideReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const { data: dossier, isLoading, refetch } = useQuery({
    queryKey: ["insurer-dossier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          *,
          fd_org:organizations!assigned_fd_org_id(name),
          polis_checks(*),
          claims(*),
          documents(id, doc_type, status, uploaded_at, file_name),
          case_events!case_events_dossier_id_fkey(id, event_type, status, scheduled_at, location_text),
          wash_services(status, scheduled_at),
          repatriations(*, flights(*)),
          invoices(id, invoice_number, status, total, created_at),
          dossier_events(id, event_type, event_description, created_at, metadata)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleOverrideClaim = async (newStatus: 'MANUAL_APPROVED' | 'MANUAL_REJECTED') => {
    if (!overrideReason.trim()) {
      toast({
        title: "Fout",
        description: "Reden is verplicht voor override",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const claim = dossier?.claims;
      if (!claim) throw new Error("No claim found");

      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: newStatus,
          source: 'MANUAL',
          override_reason: overrideReason,
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("claim_actions").insert({
        claim_id: claim.id,
        user_id: user.id,
        action: newStatus === 'MANUAL_APPROVED' ? 'OVERRIDE_APPROVED' : 'OVERRIDE_REJECTED',
        reason: overrideReason,
        from_status: claim.status,
        to_status: newStatus,
      });

      // Create event
      await supabase.from("dossier_events").insert({
        dossier_id: id,
        event_type: "CLAIM_OVERRIDE",
        event_description: `Claim ${newStatus === 'MANUAL_APPROVED' ? 'goedgekeurd' : 'afgewezen'} (manual override)`,
        metadata: { reason: overrideReason },
        created_by: user.id,
      });

      toast({
        title: "Succes",
        description: "Claim status bijgewerkt",
      });

      setOverrideReason("");
      refetch();
    } catch (error) {
      console.error("Error overriding claim:", error);
      toast({
        title: "Fout",
        description: "Kon claim niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const handleBlockClaim = async () => {
    if (!blockReason.trim()) {
      toast({
        title: "Fout",
        description: "Reden is verplicht voor blokkering",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const claim = dossier?.claims;
      if (!claim) throw new Error("No claim found");

      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: 'BLOCKED',
          blocked_reason: blockReason,
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      await supabase.from("claim_actions").insert({
        claim_id: claim.id,
        user_id: user.id,
        action: 'BLOCKED',
        reason: blockReason,
        from_status: claim.status,
        to_status: 'BLOCKED',
      });

      await supabase.from("dossier_events").insert({
        dossier_id: id,
        event_type: "CLAIM_BLOCKED",
        event_description: "Claim geblokkeerd",
        metadata: { reason: blockReason },
        created_by: user.id,
      });

      toast({
        title: "Succes",
        description: "Claim geblokkeerd",
      });

      setBlockReason("");
      refetch();
    } catch (error) {
      console.error("Error blocking claim:", error);
      toast({
        title: "Fout",
        description: "Kon claim niet blokkeren",
        variant: "destructive",
      });
    }
  };

  const handleUnblockClaim = async () => {
    if (!blockReason.trim()) {
      toast({
        title: "Fout",
        description: "Reden is verplicht voor opheffen blokkering",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const claim = dossier?.claims;
      if (!claim) throw new Error("No claim found");

      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: 'MANUAL_APPROVED',
          override_reason: blockReason,
          blocked_reason: null,
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      await supabase.from("claim_actions").insert({
        claim_id: claim.id,
        user_id: user.id,
        action: 'UNBLOCKED',
        reason: blockReason,
        from_status: 'BLOCKED',
        to_status: 'MANUAL_APPROVED',
      });

      await supabase.from("dossier_events").insert({
        dossier_id: id,
        event_type: "CLAIM_UNBLOCKED",
        event_description: "Blokkering opgeheven",
        metadata: { reason: blockReason },
        created_by: user.id,
      });

      toast({
        title: "Succes",
        description: "Blokkering opgeheven",
      });

      setBlockReason("");
      refetch();
    } catch (error) {
      console.error("Error unblocking claim:", error);
      toast({
        title: "Fout",
        description: "Kon blokkering niet opheffen",
        variant: "destructive",
      });
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_invoice_paid', {
        p_invoice_id: invoiceId,
        p_reason: paymentNote || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark invoice as paid');
      }

      toast({
        title: "Succes",
        description: "Factuur gemarkeerd als betaald",
      });

      setPaymentNote("");
      refetch();
    } catch (error) {
      console.error("Error paying invoice:", error);
      toast({
        title: "Fout",
        description: "Kon factuur niet betalen",
        variant: "destructive",
      });
    }
  };

  const handleResetToAPI = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const claim = dossier?.claims;
      if (!claim) throw new Error("No claim found");

      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: 'API_PENDING',
          source: 'API',
          override_reason: null,
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("claim_actions").insert({
        claim_id: claim.id,
        user_id: user.id,
        action: 'RESET_TO_API',
        from_status: claim.status,
        to_status: 'API_PENDING',
      });

      toast({
        title: "Succes",
        description: "Claim gereset naar API",
      });

      refetch();
    } catch (error) {
      console.error("Error resetting claim:", error);
      toast({
        title: "Fout",
        description: "Kon claim niet resetten",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="default">✓</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">✗</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Laden...</div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Dossier niet gevonden</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Dossier {dossier.ref_number}</p>
                <h1 className="text-2xl font-bold tracking-tight">{dossier.deceased_name}</h1>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="text-right mr-4">
                <p className="text-sm text-muted-foreground capitalize">{getCurrentDate()}</p>
              </div>
              <BlockDossierDialog 
                dossierId={dossier.id} 
                dossierRef={dossier.ref_number}
                onSuccess={() => refetch()}
              />
              <Button
                variant="outline"
                onClick={() => navigate(`/insurer/dossier/${id}/documenten`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Documenten
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/insurer/facturen")}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Facturen
              </Button>
              <Button variant="outline" onClick={() => navigate('/insurer/dossiers')}>
                Terug naar Overzicht
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        <Tabs defaultValue="overzicht">
          <TabsList>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="claim">Claim Status</TabsTrigger>
            <TabsTrigger value="facturen">Facturen</TabsTrigger>
            <TabsTrigger value="tijdlijn">Tijdlijn</TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="space-y-6">
            {/* Basis info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Basis Informatie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Overledene:</span>
                    <p className="font-medium">{dossier.deceased_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flow:</span>
                    <p className="font-medium">
                      <Badge>{dossier.flow === 'REP' ? 'Repatriëring' : dossier.flow === 'LOC' ? 'Lokaal' : 'Onbekend'}</Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uitvaartondernemer:</span>
                    <p className="font-medium">{dossier.fd_org?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium">
                      <Badge>{dossier.status}</Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Package */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Documenten pakket</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium text-sm">Type</TableHead>
                      <TableHead className="font-medium text-sm">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["MEDICAL_DEATH_CERT", "ID_DECEASED", "LAISSEZ_PASSER", "COFFIN_CERT"].map((docType) => {
                      const doc = dossier.documents?.find(d => d.doc_type === docType);
                      const typeLabel = {
                        "MEDICAL_DEATH_CERT": "IIIC/IIID",
                        "ID_DECEASED": "ID Overledene",
                        "LAISSEZ_PASSER": "Laissez-passer (repatr.)",
                        "COFFIN_CERT": "Kistingsattest (repatr.)"
                      }[docType];

                      return (
                        <TableRow key={docType} className="hover:bg-muted/30">
                          <TableCell className="text-sm">{typeLabel}</TableCell>
                          <TableCell>{doc ? getDocumentStatusBadge(doc.status) : <Badge variant="secondary" className="text-xs">Pending</Badge>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Planning */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Planning (inzage)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Janazah:</span>
                  <span className="font-medium">
                    {(() => {
                      const janazah = dossier.case_events?.find((e: any) => e.event_type === "MOSQUE_SERVICE");
                      if (!janazah) return "-";
                      if (janazah.status === "PLANNED" && janazah.scheduled_at) {
                        return `GEPLAND: ${janazah.location_text || "Locatie onbekend"}, ${new Date(janazah.scheduled_at).toLocaleString("nl-NL")}`;
                      }
                      if (janazah.status === "DONE") return "VOLTOOID";
                      return janazah.status;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mortuarium:</span>
                  <span className="font-medium">
                    {dossier.wash_services?.[0] ? (
                      dossier.wash_services[0].status === "WASHED" ? (
                        `WASHED (${new Date(dossier.wash_services[0].scheduled_at!).toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })})`
                      ) : (
                        dossier.wash_services[0].status
                      )
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vlucht:</span>
                  <span className="font-medium">
                    {dossier.repatriations?.[0]?.flights?.length > 0 ? "Bevestigd" : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Legal Hold:</span>
                  <span className="font-medium">
                    {dossier.legal_hold ? (
                      <Badge variant="destructive">Ja</Badge>
                    ) : (
                      "Nee"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Updates/Timeline */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dossier.documents
                    ?.filter(d => d.status === "APPROVED")
                    .slice(0, 5)
                    .map((doc) => (
                      <div key={doc.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleString("nl-NL")}
                        </span>
                        <span>Document ({doc.doc_type}) goedgekeurd</span>
                      </div>
                    ))}
                  {(!dossier.documents || dossier.documents.length === 0) && (
                    <p className="text-muted-foreground text-sm">Geen updates beschikbaar</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claim">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Claim Status</Label>
              </div>
              <div className="space-y-6">
                {dossier.claims ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground">Polisnummer:</span>
                          <p className="font-medium font-mono">{dossier.claims.policy_number}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                              dossier.claims.status === 'API_APPROVED' || dossier.claims.status === 'MANUAL_APPROVED'
                                ? 'bg-success text-success-foreground'
                                : dossier.claims.status === 'API_REJECTED' || dossier.claims.status === 'MANUAL_REJECTED'
                                ? 'bg-destructive text-destructive-foreground'
                                : 'bg-muted text-muted-foreground'
                            }>
                              {dossier.claims.status.replace('_', ' ')}
                            </Badge>
                            {dossier.claims.source === 'MANUAL' && (
                              <Badge variant="outline" className="border-warning text-warning">
                                OVERRIDE ACTIEF
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {dossier.claims.override_reason && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900 dark:text-blue-100">Override Reden</p>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                {dossier.claims.override_reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {dossier.claims.blocked_reason && (
                        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900 dark:text-red-100">Blokkade Reden</p>
                              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                                {dossier.claims.blocked_reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium">Acties</h4>
                      
                      {dossier.claims.status === 'BLOCKED' ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="unblock-reason">Reden voor opheffen blokkering (verplicht)</Label>
                            <Textarea
                              id="unblock-reason"
                              placeholder={t("placeholders.explainRequiredInfo")}
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={handleUnblockClaim}
                            className="w-full"
                          >
                            Blokkering Opheffen
                          </Button>
                        </div>
                      ) : dossier.claims.source === 'MANUAL' ? (
                        <Button
                          variant="outline"
                          onClick={handleResetToAPI}
                          className="w-full"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset naar API
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="override-reason">Reden voor override (verplicht)</Label>
                            <Textarea
                              id="override-reason"
                              placeholder={t("placeholders.explainRequiredInfo")}
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleOverrideClaim('MANUAL_APPROVED')}
                              className="flex-1"
                            >
                              Goedkeuren
                            </Button>
                            <Button
                              onClick={() => handleOverrideClaim('MANUAL_REJECTED')}
                              variant="destructive"
                              className="flex-1"
                            >
                              Afwijzen
                            </Button>
                          </div>
                          <div className="border-t pt-4">
                            <Label htmlFor="block-reason">Reden voor blokkering (optioneel)</Label>
                            <Textarea
                              id="block-reason"
                              placeholder={t("placeholders.detailedReason")}
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              rows={2}
                            />
                            <Button
                              onClick={handleBlockClaim}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              Blokkeren
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Geen claim informatie beschikbaar</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tijdlijn">
            <Card>
              <CardHeader>
                <CardTitle>Tijdlijn (read-only)</CardTitle>
              </CardHeader>
              <CardContent>
                {dossier.dossier_events && dossier.dossier_events.length > 0 ? (
                  <div className="space-y-3">
                    {dossier.dossier_events
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((event) => (
                        <div key={event.id} className="flex gap-4 border-l-2 border-primary/20 pl-4 py-2">
                          <div className="flex-shrink-0 text-sm text-muted-foreground w-32">
                            {new Date(event.created_at).toLocaleString("nl-NL", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{event.event_description}</p>
                            {event.metadata && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(event.metadata)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Geen gebeurtenissen beschikbaar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facturen">
            <Card>
              <CardHeader>
                <CardTitle>Facturen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dossier.invoices && dossier.invoices.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factuurnummer</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Bedrag</TableHead>
                          <TableHead>Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dossier.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                            <TableCell>{new Date(invoice.created_at).toLocaleDateString("nl-NL")}</TableCell>
                            <TableCell>
                              <Badge className={
                                invoice.status === "PAID" ? "bg-green-600" :
                                invoice.status === "ISSUED" ? "bg-yellow-600" :
                                invoice.status === "APPROVED" ? "bg-blue-600" :
                                ""
                              }>
                                {invoice.status === "ISSUED" ? "Te accorderen" :
                                 invoice.status === "APPROVED" ? "Geaccordeerd" :
                                 invoice.status === "PAID" ? "Betaald" :
                                 invoice.status === "NEEDS_INFO" ? "Info nodig" : invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>€{Number(invoice.total).toFixed(2)}</TableCell>
                            <TableCell>
                              {invoice.status === "ISSUED" && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayInvoice(invoice.id)}
                                >
                                  Betalen
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="border-t pt-4">
                      <Label htmlFor="payment-note">Betalingsnotitie (optioneel)</Label>
                      <Textarea
                        id="payment-note"
                        placeholder="Voeg een notitie toe bij de betaling..."
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Geen facturen beschikbaar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
