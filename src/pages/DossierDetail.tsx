import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Star, AlertCircle, User, Users, FileText, 
  Building2, DollarSign, Clock, MessageSquare,
  CheckCircle2, XCircle, Send, Droplet
} from "lucide-react";
import { PiMosque } from "react-icons/pi";
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
import { DossierTimeline } from "@/components/dossier/DossierTimeline";
import { MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DeleteDossierDialog } from "@/components/dossier/DeleteDossierDialog";

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
  const [deleteReason, setDeleteReason] = useState("");

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
    // Use admin labels if user is admin, otherwise use FD labels
    const labels = isAdmin ? {
      CREATED: "Nieuw dossier aangemaakt",
      INTAKE_IN_PROGRESS: "Intake lopend",
      DOCS_PENDING: "Documenten in behandeling",
      DOCS_VERIFIED: "Documenten gecontroleerd",
      APPROVED: "Goedgekeurd door verzekeraar",
      LEGAL_HOLD: "Juridische blokkade (parket)",
      PLANNING: "Planningfase gestart",
      READY_FOR_TRANSPORT: "Klaar voor uitvoering",
      IN_TRANSIT: "In uitvoering",
      SETTLEMENT: "Financiële afhandeling",
      ARCHIVED: "Afgerond & gearchiveerd",
    } : {
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
                  <DeleteDossierDialog
                    dossierId={id!}
                    dossierDisplayId={dossier.display_id || dossier.ref_number}
                    currentStatus={dossier.status}
                    currentFlow={dossier.flow}
                    isFD={true}
                  />
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
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          // Open soft-delete dialog via state
                          const deleteBtn = document.getElementById('soft-delete-trigger');
                          deleteBtn?.click();
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Verwijder Dossier
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

      {/* Soft Delete Dialog */}
      {(dossier.status === 'CREATED' || dossier.status === 'INTAKE_IN_PROGRESS') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button id="soft-delete-trigger" className="hidden" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dossier verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dit is een onomkeerbare actie. Het dossier wordt gearchiveerd en verborgen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="delete-reason">Reden voor verwijdering *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Bijv. 'Foutief aangemaakt', 'Dubbel dossier'..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteReason("")}>
                Annuleren
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deleteReason.trim()) {
                    toast({
                      title: "Reden verplicht",
                      description: "Geef een reden op voor het verwijderen",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    const { error } = await supabase.rpc('soft_delete_dossier', {
                      p_dossier_id: id,
                      p_reason: deleteReason.trim(),
                    });

                    if (error) throw error;

                    toast({
                      title: "Dossier verwijderd",
                      description: "Het dossier is gearchiveerd",
                    });

                    navigate("/dossiers");
                  } catch (error: any) {
                    toast({
                      title: "Fout",
                      description: error.message || "Kon dossier niet verwijderen",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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
          <TabsList className="w-full grid grid-cols-5 lg:grid-cols-9 gap-1 bg-transparent h-auto p-0">
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
        <TabsContent value="documents" className="space-y-6">
          {/* Document Status Summary */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Overzicht documentgoedkeuringen</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 rounded-lg border bg-muted/30">
                  <p className="text-3xl font-bold text-green-600">
                    {documents.filter(d => d.status === "APPROVED").length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Goedgekeurd</p>
                </div>
                <div className="text-center p-6 rounded-lg border bg-muted/30">
                  <p className="text-3xl font-bold text-orange-600">
                    {documents.filter(d => d.status === "IN_REVIEW").length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">In Review</p>
                </div>
                <div className="text-center p-6 rounded-lg border bg-muted/30">
                  <p className="text-3xl font-bold text-red-600">
                    {documents.filter(d => d.status === "REJECTED").length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Afgekeurd</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Documenten</CardTitle>
                </div>
                <DocumentUploadDialog 
                  dossierId={id!} 
                  onDocumentUploaded={fetchDossierData}
                />
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.doc_type.replace(/_/g, " ")} • {formatDateTime(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                Bekijken
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={doc.file_url} download={doc.file_name}>
                                Downloaden
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={async () => {
                                if (confirm('Weet je zeker dat je dit document wilt verwijderen?')) {
                                  const { error } = await supabase
                                    .from('documents')
                                    .delete()
                                    .eq('id', doc.id);
                                  
                                  if (error) {
                                    toast({
                                      title: "Fout",
                                      description: "Document kon niet worden verwijderd",
                                      variant: "destructive"
                                    });
                                  } else {
                                    toast({
                                      title: "Document verwijderd",
                                      description: "Het document is succesvol verwijderd"
                                    });
                                    fetchDossierData();
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Geen documenten</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obituary Tab */}
        <TabsContent value="obituary" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Overlijdensbericht</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ObituaryViewer dossierId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stakeholders Tab */}
        <TabsContent value="stakeholders" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Moskee */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <PiMosque className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Moskee</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mosqueService ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Moskee</Label>
                      <p className="text-base font-semibold">{mosqueService.organizations?.name || "N/A"}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status</Label>
                      <div className="mt-1">
                        <Badge>{mosqueService.status}</Badge>
                      </div>
                    </div>
                    {mosqueService.prayer && (
                      <>
                        <Separator />
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Gebed</Label>
                          <p className="text-base font-medium">{mosqueService.prayer}</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <PiMosque className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Geen moskee dienst gepland</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mortuarium */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Droplet className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Mortuarium</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {washService ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Mortuarium</Label>
                      <p className="text-base font-semibold">{washService.organizations?.name || "N/A"}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status</Label>
                      <div className="mt-1">
                        <Badge>{washService.status}</Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <Droplet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Geen mortuarium dienst gepland</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verzekeraar */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Verzekeraar</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Verzekeraar</Label>
                      <p className="text-base font-semibold">{claim.organizations?.name || "N/A"}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Polisnummer</Label>
                      <p className="text-base font-mono font-medium">{claim.policy_number}</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status</Label>
                      <div className="mt-1">
                        <Badge>{claim.status}</Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Geen verzekeraar gekoppeld</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chat Tab - Integratie */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Communicatie met Familie</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Chat met familie en collega's over dit dossier.
              </p>
              <Button 
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Chat voor {dossier.display_id || dossier.ref_number}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Facturatie</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceManagementCard dossierId={id!} userRole={userRole || ''} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab - Nieuwe component */}
        <TabsContent value="timeline" className="space-y-6">
          <DossierTimeline dossierId={id!} />
          
          {/* Manual events toevoegen optie */}
          <Card>
            <CardHeader>
              <CardTitle>Handmatige gebeurtenis toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <AddManualEventDialog 
                dossierId={id!}
                onEventAdded={fetchDossierData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab - Alleen Interne Notities */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Interne Notities</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <InternalNotesCard 
                dossierId={id!} 
                initialNotes={dossier.internal_notes}
                onNotesSaved={fetchDossierData}
              />
            </CardContent>
          </Card>
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
