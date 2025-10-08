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
import { AuditLogTable } from "@/components/dossier/AuditLogTable";
import { DossierProgressCard } from "@/components/DossierProgressCard";
import { DossierComments } from "@/components/dossier/DossierComments";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import { ExternalInvoiceUpload } from "@/components/dossier/ExternalInvoiceUpload";
import { SendFeedbackButton } from "@/components/dossier/SendFeedbackButton";
import { ActivateDossierButton } from "@/components/dossier/ActivateDossierButton";
import ReleaseDossierDialog from "@/components/dossier/ReleaseDossierDialog";
import FDManagementCard from "@/components/dossier/FDManagementCard";
import { InvoiceManagementCard } from "@/components/dossier/InvoiceManagementCard";
import { ObituaryViewer } from "@/components/dossier/ObituaryViewer";
import { LegalHoldBadge } from "@/components/dossier/LegalHoldBadge";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (id) {
      fetchDossierData();
      checkAdminStatus();
      handleAutoTransitions();
    }
  }, [id]);

  const handleViewLegalHoldDetails = () => {
    setActiveTab("timeline");
    // Scroll to timeline tab
    setTimeout(() => {
      const timelineTab = document.querySelector('[value="timeline"]');
      timelineTab?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleAutoTransitions = async () => {
    const { data: dossierData } = await supabase
      .from("dossiers")
      .select("status")
      .eq("id", id)
      .single();

    // Auto-transition: created → intake_in_progress on first open
    if (dossierData?.status === "created" as any) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      await supabase
        .from("dossiers")
        .update({ status: "intake_in_progress" as any })
        .eq("id", id);

      await supabase.from("dossier_events").insert({
        dossier_id: id,
        event_type: "STATUS_AUTO_CHANGED",
        event_description: "Status automatisch gewijzigd: Aangemaakt → Intake lopend (dossier geopend)",
        created_by: userId,
        metadata: { auto_transition: true },
      });

      // Refresh data after auto-transition
      fetchDossierData();
    }
  };

  const checkAdminStatus = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role, is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    
    setIsAdmin(data?.role === "admin" || data?.is_admin === true);
    setUserRole(data?.role || null);
  };

  const fetchDossierData = async () => {
    setLoading(true);
    
    // Fetch current user's organization
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    const { data: userRoleData } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    
    // Fetch dossier
    const { data: dossierData, error: dossierError } = await supabase
      .from("dossiers")
      .select("*")
      .eq("id", id)
      .single();

    if (dossierError || !dossierData) {
      toast({
        title: "Fout",
        description: "Dossier niet gevonden",
        variant: "destructive",
      });
      navigate("/dossiers");
      return;
    }

    // SECURITY CHECK: Verify access rights
    const isAdminRole = userRoleData?.role === "admin" || userRoleData?.role === "platform_admin";
    const isOwnOrganization = dossierData.assigned_fd_org_id === userRoleData?.organization_id;
    
    if (!isAdminRole && !isOwnOrganization) {
      toast({
        title: "Geen toegang",
        description: "Je hebt geen toegang tot dit dossier. Het is niet toegewezen aan jouw organisatie.",
        variant: "destructive",
      });
      navigate("/dossiers");
      return;
    }

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

    // Fetch janazah service via case_events
    const { data: mosqueData } = await supabase
      .from("case_events")
      .select("*")
      .eq("dossier_id", id)
      .eq("event_type", "MOSQUE_SERVICE")
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

    // Fetch invoices (including external)
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

    // Set all fetched data
    setDossier(dossierData);
    setDocuments(docsData || []);
    setEvents(eventsData || []);
    setMosqueService(mosqueData);
    setWashService(washData);
    setClaim(claimData);
    setFamilyContacts(familyData || []);
    setInvoices(invoicesData || []);
    setManualEvents(manualEventsData || []);
    setProgress(null); // Remove mock progress data
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
      CREATED: "Nieuw",
      INTAKE_IN_PROGRESS: "Intake",
      DOCS_PENDING: "Documenten in behandeling",
      DOCS_VERIFIED: "Documenten volledig",
      APPROVED: "Goedgekeurd",
      LEGAL_HOLD: "Juridisch geblokkeerd",
      PLANNING: "Planning",
      READY_FOR_TRANSPORT: "Klaar voor uitvoering",
      IN_TRANSIT: "Uitvoering",
      SETTLEMENT: "Facturatie",
      ARCHIVED: "Afgerond",
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
    <div className="space-y-6 pb-8">
      {/* Professional Header with cleaner layout */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/dossiers")}
              className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar overzicht
            </Button>
            
            {/* Main header content */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Dossier</p>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {dossier.display_id || dossier.ref_number}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-15">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-medium">{dossier.deceased_name}</p>
                </div>
                {dossier.status === "archived" && (
                  <Badge variant="secondary" className="text-xs ml-15">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Alleen-lezen (gearchiveerd)
                  </Badge>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <QRCodeGenerator 
                  dossierId={id!}
                  displayId={dossier.display_id || dossier.ref_number}
                />
                <Badge 
                  variant={getStatusColor(dossier.status)} 
                  className={`text-sm px-4 py-1.5 min-w-[160px] justify-center font-medium ${
                    getStatusColor(dossier.status) !== "destructive" 
                      ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" 
                      : ""
                  }`}
                >
                  {getStatusLabel(dossier.status)}
                </Badge>
                <LegalHoldBadge
                  legal_hold_active={dossier.legal_hold_active}
                  legal_hold_authority={dossier.legal_hold_authority}
                  legal_hold_case_number={dossier.legal_hold_case_number}
                  onViewDetails={handleViewLegalHoldDetails}
                />
                {dossier.status === "intake_in_progress" && (
                  <ActivateDossierButton
                    dossierId={id!}
                    currentStatus={dossier.status}
                    flow={dossier.flow}
                    onActivated={fetchDossierData}
                  />
                )}
                {dossier.status !== "archived" && (
                  <StatusChanger 
                    dossierId={id!} 
                    currentStatus={dossier.status}
                    onStatusChanged={fetchDossierData}
                    isAdmin={isAdmin}
                  />
                )}
                {dossier.status === "archived" && (
                  <SendFeedbackButton dossierId={id!} />
                )}
                {userRole === "funeral_director" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => setReleaseDialogOpen(true)}>
                        Dossier vrijgeven
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReleaseDossierDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        dossierId={id!}
        dossierDisplayId={dossier.display_id || dossier.ref_number}
        onSuccess={() => {
          navigate("/dossiers");
        }}
      />

      {/* Progress Card */}
      {progress && (
        <DossierProgressCard
          dossierId={progress.dossier_id}
          displayId={progress.display_id}
          deceasedName={progress.deceased_name}
          pipelineType={progress.pipeline_type}
          progressPct={progress.progress_pct}
          nextStepLabel={progress.next_step_label}
          currentMainKey={progress.current_main_key}
          events={events}
        />
      )}


      {/* Modern Tabs with icons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card className="p-1 bg-muted/50 border-none shadow-none">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 gap-1 bg-transparent h-auto p-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Overzicht</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documenten</span>
            </TabsTrigger>
            <TabsTrigger value="obituary" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Bericht</span>
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Betrokkenen</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financieel</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notities</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2 py-3">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Tijdlijn</span>
            </TabsTrigger>
          </TabsList>
        </Card>

        {/* Overview Tab - Professional Cards */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Overledene Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Overledene</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Naam</Label>
                  <p className="text-base font-semibold">{dossier.deceased_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Geboortedatum</Label>
                    <p className="text-sm">{formatDate(dossier.deceased_dob)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Overlijdensdatum</Label>
                    <p className="text-sm">{formatDate(dossier.date_of_death)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Flow type</Label>
                  <div className="mt-2">
                    <FlowSelector 
                      dossierId={id!} 
                      currentFlow={dossier.flow} 
                      onFlowChanged={fetchDossierData}
                    />
                  </div>
                </div>
                {dossier.deceased_gender && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Geslacht</Label>
                      <p className="text-sm font-medium">
                        {dossier.deceased_gender === 'M' ? 'Man' : 'Vrouw'}
                      </p>
                    </div>
                  </>
                )}
                {dossier.place_of_death && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Plaats van overlijden</Label>
                      <p className="text-sm font-medium">{dossier.place_of_death}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Familie & Contact Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Familie & Contact</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {familyContacts.length > 0 ? (
                  <div className="space-y-3">
                    {familyContacts.map((contact) => (
                      <div key={contact.id} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <p className="font-semibold text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{contact.relationship}</p>
                        {contact.phone && (
                          <p className="text-sm mt-2">{contact.phone}</p>
                        )}
                        {contact.email && (
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Geen contactpersonen geregistreerd</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {/* Document Status Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Overzicht documentgoedkeuringen</h3>
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

        {/* Obituary Tab */}
        <TabsContent value="obituary" className="space-y-4">
          <ObituaryViewer dossierId={id!} />
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
          <InvoiceManagementCard dossierId={id!} userRole={userRole || ''} />
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

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <InternalNotesCard 
            dossierId={id!} 
            initialNotes={dossier.internal_notes}
            onNotesSaved={fetchDossierData}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Opmerkingen & Discussie</h3>
            <DossierComments
              dossierId={id!}
              organizationId={dossier.assigned_fd_org_id}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Audit Log Section - Bottom of page */}
      <div className="mt-8">
        <AuditLogTable dossierId={id!} />
      </div>
    </div>
  );
};

export default DossierDetail;
