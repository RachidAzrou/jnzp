import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Star, AlertCircle, User, Users, FileText, 
  Building2, DollarSign, Clock, MessageSquare,
  CheckCircle2, XCircle, Send
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { FlowSelector } from "@/components/dossier/FlowSelector";
import { StatusChanger } from "@/components/dossier/StatusChanger";
import { InternalNotesCard } from "@/components/dossier/InternalNotesCard";
import { DocumentUploadDialog } from "@/components/dossier/DocumentUploadDialog";
import { AddManualEventDialog } from "@/components/dossier/AddManualEventDialog";

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
  const [manualEvents, setManualEvents] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDossierData();
      checkAdminStatus();
    }
  }, [id]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .in("role", ["admin", "org_admin"])
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

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

    // Fetch manual events
    const { data: manualEventsData } = await supabase
      .from("manual_events")
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
    setManualEvents(manualEventsData || []);
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
          <h1 className="text-3xl font-bold">
            Dossier {dossier.display_id || dossier.ref_number}
          </h1>
          <p className="text-xl text-muted-foreground">{dossier.deceased_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={getStatusColor(dossier.status)} 
            className={`text-sm px-3 py-1 min-w-[140px] justify-center ${
              getStatusColor(dossier.status) !== "destructive" ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : ""
            }`}
          >
            {getStatusLabel(dossier.status)}
          </Badge>
          <StatusChanger 
            dossierId={id!} 
            currentStatus={dossier.status}
            onStatusChanged={fetchDossierData}
            isAdmin={isAdmin}
          />
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
        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Overledene */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Overledene</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Naam</Label>
                  <p className="font-medium mt-1">{dossier.deceased_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Geboortedatum</Label>
                    <p className="mt-1">{formatDate(dossier.deceased_dob)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Overlijdensdatum</Label>
                    <p className="mt-1">{formatDate(dossier.date_of_death)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Flow type</Label>
                  <div className="mt-1">
                    <FlowSelector 
                      dossierId={id!} 
                      currentFlow={dossier.flow} 
                      onFlowChanged={fetchDossierData}
                    />
                  </div>
                </div>
                {dossier.deceased_gender && (
                  <div>
                    <Label className="text-muted-foreground">Geslacht</Label>
                    <p className="font-medium mt-1">
                      {dossier.deceased_gender === 'M' ? 'Man' : 'Vrouw'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Familie & Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Familie & Contact</h3>
              </div>
              {familyContacts.length > 0 ? (
                <div className="space-y-3">
                  {familyContacts.map((contact) => (
                    <div key={contact.id} className="p-4 border bg-muted/30">
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
                <p className="text-sm text-muted-foreground py-4">Geen contactpersonen</p>
              )}
            </div>
          </div>

          {/* Document Status Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Document Pakket Status</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-6 border bg-muted/30">
                <p className="text-3xl font-bold text-green-600">
                  {documents.filter(d => d.status === "APPROVED").length}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Goedgekeurd</p>
              </div>
              <div className="text-center p-6 border bg-muted/30">
                <p className="text-3xl font-bold text-orange-600">
                  {documents.filter(d => d.status === "IN_REVIEW").length}
                </p>
                <p className="text-sm text-muted-foreground mt-2">In Review</p>
              </div>
              <div className="text-center p-6 border bg-muted/30">
                <p className="text-3xl font-bold text-red-600">
                  {documents.filter(d => d.status === "REJECTED").length}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Afgekeurd</p>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <InternalNotesCard 
            dossierId={id!} 
            initialNotes={dossier.internal_notes}
            onNotesSaved={fetchDossierData}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Documenten</h3>
              </div>
              <DocumentUploadDialog 
                dossierId={id!} 
                onDocumentUploaded={fetchDossierData}
              />
            </div>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.doc_type.replace(/_/g, " ")} • {formatDateTime(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={getDocStatusColor(doc.status)}
                      className={`min-w-[120px] justify-center ${
                        getDocStatusColor(doc.status) !== "destructive" ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : ""
                      }`}
                    >
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
          </div>
        </TabsContent>

        {/* Stakeholders Tab */}
        <TabsContent value="stakeholders" className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Moskee */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Moskee</h3>
              </div>
              {mosqueService ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Moskee</Label>
                    <p className="font-medium mt-1">{mosqueService.organizations?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge>{mosqueService.status}</Badge>
                    </div>
                  </div>
                  {mosqueService.prayer && (
                    <div>
                      <Label className="text-muted-foreground">Gebed</Label>
                      <p className="font-medium mt-1">{mosqueService.prayer}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Geen moskee dienst gepland</p>
              )}
            </div>

            {/* Mortuarium */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Mortuarium</h3>
              </div>
              {washService ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Mortuarium</Label>
                    <p className="font-medium mt-1">{washService.organizations?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge>{washService.status}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Geen mortuarium dienst gepland</p>
              )}
            </div>

            {/* Verzekeraar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Verzekeraar</h3>
              </div>
              {claim ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Verzekeraar</Label>
                    <p className="font-medium mt-1">{claim.organizations?.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Polisnummer</Label>
                    <p className="font-medium font-mono mt-1">{claim.policy_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge>{claim.status}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Geen verzekeraar gekoppeld</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Communicatie met Familie</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-muted/30 border p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Chat functionaliteit komt binnenkort
                </p>
              </div>
              <Button className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Start Chat
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Facturen</h3>
              </div>
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Nieuwe Factuur
              </Button>
            </div>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border bg-muted/30">
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
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Tijdlijn</h3>
              </div>
              <AddManualEventDialog 
                dossierId={id!}
                onEventAdded={fetchDossierData}
              />
            </div>
            {(events.length > 0 || manualEvents.length > 0) ? (
              <div className="space-y-4">
                {/* Combine and sort all events */}
                {[
                  ...events.map(e => ({ ...e, type: 'system', time: e.created_at })),
                  ...manualEvents.map(e => ({ ...e, type: 'manual', time: e.created_at }))
                ]
                  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                  .map((event, index, arr) => (
                    <div key={`${event.type}-${event.id}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${
                          event.type === 'manual' ? 'bg-blue-500' : 'bg-primary'
                        }`} />
                        {index < arr.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        {event.type === 'manual' ? (
                          <>
                            <p className="font-medium">{event.event_title}</p>
                            {event.event_description && (
                              <p className="text-sm mt-1">{event.event_description}</p>
                            )}
                            <Badge variant="outline" className="mt-1 text-xs">Handmatig toegevoegd</Badge>
                          </>
                        ) : (
                          <p className="font-medium">{event.event_description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDateTime(event.time)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Geen gebeurtenissen</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DossierDetail;
