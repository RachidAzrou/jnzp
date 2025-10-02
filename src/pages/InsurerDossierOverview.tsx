import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function InsurerDossierOverview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: dossier, isLoading } = useQuery({
    queryKey: ["insurer-dossier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          *,
          organizations:assigned_fd_org_id(name),
          polis_checks(*),
          documents(id, doc_type, status, uploaded_at, file_name),
          mosque_services(status, confirmed_slot, mosque_org_id, organizations!mosque_services_mosque_org_id_fkey(name)),
          wash_services(status, scheduled_at),
          repatriations(*, flights(*))
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

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
            <h1 className="text-3xl font-bold">Dossier {dossier.ref_number}</h1>
            <p className="text-muted-foreground mt-1">Details van het dossier</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/insurer/dossier/${id}/documenten`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Documenten
          </Button>
        </div>

        <Tabs defaultValue="overzicht">
          <TabsList>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="notities">Notities</TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="space-y-6">
            {/* Polis Information */}
            <Card>
              <CardHeader>
                <CardTitle>Polis</CardTitle>
              </CardHeader>
              <CardContent>
                {dossier.polis_checks && dossier.polis_checks.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {dossier.polis_checks[0].is_covered ? "Actief" : "Niet gevonden"}
                      </span>
                    </div>
                    {dossier.polis_checks[0].num_travelers && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Meereizigers gedekt:</span>
                        <span className="font-medium">{dossier.polis_checks[0].num_travelers}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bron:</span>
                      <span className="font-medium">
                        mock (laatste check: {new Date(dossier.polis_checks[0].checked_at).toLocaleString("nl-NL")})
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Geen polisgegevens beschikbaar</p>
                )}
              </CardContent>
            </Card>

            {/* Document Package */}
            <Card>
              <CardHeader>
                <CardTitle>Documenten pakket</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
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
                        <TableRow key={docType}>
                          <TableCell>{typeLabel}</TableCell>
                          <TableCell>{doc ? getDocumentStatusBadge(doc.status) : <Badge variant="secondary">Pending</Badge>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Planning */}
            <Card>
              <CardHeader>
                <CardTitle>Planning (inzage)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Moskee:</span>
                  <span className="font-medium">
                    {dossier.mosque_services?.[0] ? (
                      dossier.mosque_services[0].status === "CONFIRMED" ? (
                        `CONFIRMED: ${dossier.mosque_services[0].organizations?.name}, ${new Date(dossier.mosque_services[0].confirmed_slot!).toLocaleString("nl-NL")}`
                      ) : (
                        dossier.mosque_services[0].status
                      )
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Wasplaats:</span>
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
            <Card>
              <CardHeader>
                <CardTitle>Updates</CardTitle>
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

          <TabsContent value="notities">
            <Card>
              <CardHeader>
                <CardTitle>Notities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Notities functionaliteit komt binnenkort</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
