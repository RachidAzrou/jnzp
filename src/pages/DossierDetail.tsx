import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Star, AlertCircle, User, Users, FileText, 
  Building2, Plane, MapPin, DollarSign, Clock, MessageSquare,
  CheckCircle2, XCircle, Upload, Send
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const DossierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [mosqueService, setMosqueService] = useState<any>(null);
  const [washService, setWashService] = useState<any>(null);
  const [claim, setClaim] = useState<any>(null);
  const [familyContacts, setFamilyContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchDossierData();
    }
  }, [id]);

  const fetchDossierData = async () => {
    setLoading(true);
    
    // Fetch dossier
    const { data: dossierData } = await supabase
      .from("dossiers")
      .select("*")
      .eq("id", id)
      .single();

    // Fetch documents
    const { data: docsData } = await supabase
      .from("documents")
      .select("*")
      .eq("dossier_id", id)
      .order("uploaded_at", { ascending: false });

    // Fetch events
    const { data: eventsData } = await supabase
      .from("dossier_events")
      .select("*")
      .eq("dossier_id", id)
      .order("created_at", { ascending: false });

    // Fetch mosque service
    const { data: mosqueData } = await supabase
      .from("mosque_services")
      .select("*, organizations(name)")
      .eq("dossier_id", id)
      .maybeSingle();

    // Fetch wash service
    const { data: washData } = await supabase
      .from("wash_services")
      .select("*, organizations(name)")
      .eq("dossier_id", id)
      .maybeSingle();

    // Fetch claim
    const { data: claimData } = await supabase
      .from("claims")
      .select("*, organizations(name)")
      .eq("dossier_id", id)
      .maybeSingle();

    // Fetch family contacts
    const { data: familyData } = await supabase
      .from("family_contacts")
      .select("*")
      .eq("dossier_id", id);

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("*")
      .eq("dossier_id", id)
      .order("created_at", { ascending: false });

    setDossier(dossierData);
    setDocuments(docsData || []);
    setEvents(eventsData || []);
    setMosqueService(mosqueData);
    setWashService(washData);
    setClaim(claimData);
    setFamilyContacts(familyData || []);
    setInvoices(invoicesData || []);
    setLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "d MMM yyyy HH:mm", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      CREATED: "secondary",
      DOCS_PENDING: "destructive",
      LEGAL_HOLD: "destructive",
      PLANNING: "default",
      READY_FOR_TRANSPORT: "default",
      IN_TRANSIT: "default",
      ARCHIVED: "secondary",
    };
    return colors[status] || "secondary";
  };

  const getDocStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      IN_REVIEW: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
    };
    return colors[status] || "secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: "Aangemaakt",
      INTAKE_IN_PROGRESS: "Intake lopend",
      DOCS_PENDING: "Documenten vereist",
      FD_ASSIGNED: "FD toegewezen",
      DOCS_VERIFIED: "Docs geverifieerd",
      APPROVED: "Goedgekeurd",
      LEGAL_HOLD: "Legal Hold",
      PLANNING: "Planning",
      READY_FOR_TRANSPORT: "Klaar voor transport",
      IN_TRANSIT: "In transit",
      ARCHIVED: "Gearchiveerd",
    };
    return labels[status] || status.replace(/_/g, " ");
  };

  const getDocStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      IN_REVIEW: "In behandeling",
      APPROVED: "Goedgekeurd",
      REJECTED: "Afgewezen",
    };
    return labels[status] || status.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Dossier niet gevonden</h2>
        <Button onClick={() => navigate("/dossiers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar dossiers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/dossiers")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar dossiers
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              Dossier {dossier.display_id || dossier.ref_number}
            </h1>
            <Button variant="outline" size="icon">
              <Star className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xl text-muted-foreground">{dossier.deceased_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(dossier.status)} className="text-sm px-3 py-1">
            {getStatusLabel(dossier.status)}
          </Badge>
          {dossier.flow === "REP" && (
            <Badge variant="outline" className="gap-1">
              <Plane className="h-3 w-3" />
              Repatriëring
            </Badge>
          )}
          {dossier.flow === "LOC" && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              Lokaal
            </Badge>
          )}
        </div>
      </div>

      {/* Legal Hold Warning */}
      {dossier.legal_hold && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Legal Hold Actief</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {dossier.require_doc_ref || "Parketvrijgave afwachten"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="documents">Documenten</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="chat">Communicatie</TabsTrigger>
          <TabsTrigger value="financial">Financieel</TabsTrigger>
          <TabsTrigger value="timeline">Tijdlijn</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overledene */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Overledene
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Naam</p>
                  <p className="font-medium">{dossier.deceased_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Geboortedatum</p>
                    <p className="text-sm">{formatDate(dossier.deceased_dob)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overlijdensdatum</p>
                    <p className="text-sm">{formatDate(dossier.date_of_death)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flow type</p>
                  <p className="text-sm font-medium">
                    {dossier.flow === "REP" ? "Repatriëring" : dossier.flow === "LOC" ? "Lokaal" : "Niet ingesteld"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Familie & Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Familie & Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {familyContacts.length > 0 ? (
                  <div className="space-y-3">
                    {familyContacts.map((contact) => (
                      <div key={contact.id} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                        {contact.phone && (
                          <p className="text-sm mt-1">{contact.phone}</p>
                        )}
                        {contact.email && (
                          <p className="text-sm">{contact.email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen contactpersonen</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Pakket Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {documents.filter(d => d.status === "APPROVED").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Goedgekeurd</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {documents.filter(d => d.status === "IN_REVIEW").length}
                  </p>
                  <p className="text-sm text-muted-foreground">In Review</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {documents.filter(d => d.status === "REJECTED").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Afgekeurd</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
                <Button variant="outline" className="w-full">
                  <Building2 className="mr-2 h-4 w-4" />
                  Moskee Aanvraag
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat Familie
                </Button>
                <Button variant="outline" className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Nieuwe Factuur
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documenten</CardTitle>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.doc_type.replace(/_/g, " ")} • {formatDateTime(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getDocStatusColor(doc.status)}>
                        {doc.status === "APPROVED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {doc.status === "REJECTED" && <XCircle className="mr-1 h-3 w-3" />}
                        {getDocStatusLabel(doc.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Geen documenten</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stakeholders Tab */}
        <TabsContent value="stakeholders" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Moskee */}
            <Card>
              <CardHeader>
                <CardTitle>Moskee</CardTitle>
              </CardHeader>
              <CardContent>
                {mosqueService ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Moskee</p>
                      <p className="font-medium">{mosqueService.organizations?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{mosqueService.status}</Badge>
                    </div>
                    {mosqueService.prayer && (
                      <div>
                        <p className="text-sm text-muted-foreground">Gebed</p>
                        <p className="font-medium">{mosqueService.prayer}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen moskee dienst gepland</p>
                )}
              </CardContent>
            </Card>

            {/* Wasplaats */}
            <Card>
              <CardHeader>
                <CardTitle>Wasplaats</CardTitle>
              </CardHeader>
              <CardContent>
                {washService ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Wasplaats</p>
                      <p className="font-medium">{washService.organizations?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{washService.status}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen wasplaats dienst gepland</p>
                )}
              </CardContent>
            </Card>

            {/* Verzekeraar */}
            <Card>
              <CardHeader>
                <CardTitle>Verzekeraar</CardTitle>
              </CardHeader>
              <CardContent>
                {claim ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Verzekeraar</p>
                      <p className="font-medium">{claim.organizations?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Polisnummer</p>
                      <p className="font-medium font-mono">{claim.policy_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{claim.status}</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen verzekeraar gekoppeld</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communicatie met Familie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Chat functionaliteit komt binnenkort
                  </p>
                </div>
                <Button className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Start Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Facturen</CardTitle>
                <Button>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Nieuwe Factuur
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoice_number || "Concept"}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€{invoice.total}</p>
                        <Badge variant="outline">{invoice.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Geen facturen</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tijdlijn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        {index < events.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{event.event_description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Geen gebeurtenissen</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DossierDetail;
