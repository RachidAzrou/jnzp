import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function InsurerDossierOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overrideReason, setOverrideReason] = useState("");

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
          mosque_services(status, confirmed_slot, mosque_org_id, mosque_org:organizations!mosque_services_mosque_org_id_fkey(name)),
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dossier {dossier.ref_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">Details van het dossier</p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

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
                  <span className="text-muted-foreground">Moskee:</span>
                  <span className="font-medium">
                    {dossier.mosque_services?.[0] ? (
                      dossier.mosque_services[0].status === "CONFIRMED" ? (
                        `CONFIRMED: ${dossier.mosque_services[0].mosque_org?.name}, ${new Date(dossier.mosque_services[0].confirmed_slot!).toLocaleString("nl-NL")}`
                      ) : (
                        dossier.mosque_services[0].status
                      )
                    ) : (
                      "-"
                    )}
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Claim Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium">Acties</h4>
                      
                      {dossier.claims.source === 'MANUAL' ? (
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
                              placeholder="Leg uit waarom je de claim handmatig goedkeurt of afwijst..."
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              rows={3}
                              className="mt-2"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-success hover:bg-success/90"
                              onClick={() => handleOverrideClaim('MANUAL_APPROVED')}
                              disabled={!overrideReason.trim()}
                            >
                              Goedkeuren (Override)
                            </Button>
                            <Button
                              className="flex-1"
                              variant="destructive"
                              onClick={() => handleOverrideClaim('MANUAL_REJECTED')}
                              disabled={!overrideReason.trim()}
                            >
                              Afwijzen (Override)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Geen claim informatie beschikbaar</p>
                )}
              </CardContent>
            </Card>
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
              <CardContent>
                {dossier.invoices && dossier.invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factuurnummer</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bedrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dossier.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>{new Date(invoice.created_at).toLocaleDateString("nl-NL")}</TableCell>
                          <TableCell>
                            <Badge>
                              {invoice.status === "ISSUED" ? "Te accorderen" :
                               invoice.status === "APPROVED" ? "Geaccordeerd" :
                               invoice.status === "PAID" ? "Betaald" :
                               invoice.status === "NEEDS_INFO" ? "Info nodig" : invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>€{Number(invoice.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">Geen facturen beschikbaar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
