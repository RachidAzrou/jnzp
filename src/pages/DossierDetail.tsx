import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Star, AlertCircle, User, Users, FileText, 
  Building2, DollarSign, Clock, MessageSquare,
  CheckCircle2, XCircle, Send, Edit2, Save, X, Plus, Trash2
} from "lucide-react";
import { PiMosque } from "react-icons/pi";
import { MdOutlineShower } from "react-icons/md";
import { AiOutlineExport } from "react-icons/ai";
import { Input } from "@/components/ui/input";
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
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DeleteDossierDialog } from "@/components/dossier/DeleteDossierDialog";
import { EditableFamilyContacts } from "@/components/dossier/EditableFamilyContacts";
import { EditableObituaryCard } from "@/components/dossier/EditableObituaryCard";
import { EditableServiceCard } from "@/components/dossier/EditableServiceCard";

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
  const [mosqueeService, setMosqueeService] = useState<any>(null);
  const [mortuariumService, setMortuariumService] = useState<any>(null);
  const [obituary, setObituary] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [manualEvents, setManualEvents] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteReason, setDeleteReason] = useState("");
  const [isEditingDeceased, setIsEditingDeceased] = useState(false);
  const [editedDossier, setEditedDossier] = useState<any>(null);

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
    setEditedDossier(dossierData); // Initialize edited dossier
    setLoading(false);
  };

  const handleEditDeceased = () => {
    setIsEditingDeceased(true);
    setEditedDossier({ ...dossier });
  };

  const handleCancelEdit = () => {
    setIsEditingDeceased(false);
    setEditedDossier(dossier);
  };

  const handleSaveDeceased = async () => {
    try {
      const { error } = await supabase
        .from('dossiers')
        .update({
          deceased_name: editedDossier.deceased_name,
          deceased_first_name: editedDossier.deceased_first_name,
          deceased_last_name: editedDossier.deceased_last_name,
          deceased_dob: editedDossier.deceased_dob,
          date_of_death: editedDossier.date_of_death,
          deceased_gender: editedDossier.deceased_gender,
          place_of_death: editedDossier.place_of_death
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Opgeslagen",
        description: "Gegevens succesvol bijgewerkt"
      });

      setIsEditingDeceased(false);
      fetchDossierData();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon gegevens niet opslaan",
        variant: "destructive"
      });
    }
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
                        <AiOutlineExport className="h-4 w-4 mr-2" />
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

        {/* Overview Tab - Combined Card */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Dossier</p>
                      <h2 className="text-2xl font-bold tracking-tight">Overzicht</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Overledene en contactpersonen
                  </p>
                </div>
                {!isEditingDeceased ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleEditDeceased}
                    className="h-9"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Bewerken
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={handleSaveDeceased}>
                      <Save className="h-4 w-4 mr-2" />
                      Opslaan
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Annuleren
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-6">
              {/* Overledene Sectie */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Overledene</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Naam</Label>
                      {isEditingDeceased ? (
                        <Input
                          value={editedDossier?.deceased_name || ''}
                          onChange={(e) => setEditedDossier({ ...editedDossier, deceased_name: e.target.value })}
                          placeholder="Volledige naam"
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm font-medium">{dossier.deceased_name}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Geboortedatum</Label>
                      {isEditingDeceased ? (
                        <Input
                          type="date"
                          value={editedDossier?.deceased_dob || ''}
                          onChange={(e) => setEditedDossier({ ...editedDossier, deceased_dob: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm">{formatDate(dossier.deceased_dob)}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Geslacht</Label>
                      {isEditingDeceased ? (
                        <select
                          className="w-full h-9 px-3 py-2 border rounded-md text-sm"
                          value={editedDossier?.deceased_gender || ''}
                          onChange={(e) => setEditedDossier({ ...editedDossier, deceased_gender: e.target.value })}
                        >
                          <option value="">Selecteer...</option>
                          <option value="M">Man</option>
                          <option value="V">Vrouw</option>
                        </select>
                      ) : (
                        <p className="text-sm">
                          {dossier.deceased_gender === 'M' ? 'Man' : dossier.deceased_gender === 'V' ? 'Vrouw' : 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Overlijdensdatum</Label>
                      {isEditingDeceased ? (
                        <Input
                          type="date"
                          value={editedDossier?.date_of_death || ''}
                          onChange={(e) => setEditedDossier({ ...editedDossier, date_of_death: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm">{formatDate(dossier.date_of_death)}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Plaats van overlijden</Label>
                      {isEditingDeceased ? (
                        <Input
                          value={editedDossier?.place_of_death || ''}
                          onChange={(e) => setEditedDossier({ ...editedDossier, place_of_death: e.target.value })}
                          placeholder="Plaats van overlijden"
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm">{dossier.place_of_death || 'N/A'}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Flow type</Label>
                      <FlowSelector 
                        dossierId={id!} 
                        currentFlow={dossier.flow} 
                        onFlowChanged={fetchDossierData}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Familie & Contacten Sectie */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Familie & Contacten</span>
                  </div>
                  <Button 
                    onClick={() => {
                      const newContact = {
                        dossier_id: id!,
                        name: prompt("Naam:") || "",
                        relationship: prompt("Relatie:"),
                        phone: prompt("Telefoon:"),
                        email: prompt("Email:"),
                      };
                      if (newContact.name) {
                        supabase.from("family_contacts").insert([newContact]).then(() => {
                          toast({ title: "Contact toegevoegd" });
                          fetchDossierData();
                        });
                      }
                    }} 
                    size="sm" 
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Toevoegen</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                  {familyContacts.length > 0 ? (
                    familyContacts.map((contact) => (
                      <div 
                        key={contact.id} 
                        className="group rounded-lg border bg-accent/5 p-3 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-0.5 min-w-0">
                            <div className="font-medium text-sm">{contact.name}</div>
                            {contact.relationship && (
                              <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                            )}
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {contact.phone && <span>{contact.phone}</span>}
                              {contact.email && <span className="truncate">{contact.email}</span>}
                            </div>
                          </div>
                          <Button 
                            onClick={async () => {
                              if (confirm("Verwijderen?")) {
                                await supabase.from("family_contacts").delete().eq("id", contact.id);
                                toast({ title: "Contact verwijderd" });
                                fetchDossierData();
                              }
                            }} 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-muted-foreground py-6 text-sm">
                      Nog geen contacten toegevoegd
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Beheer</p>
                      <h2 className="text-2xl font-bold tracking-tight">Documenten</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Beheer alle documenten
                  </p>
                </div>
                <DocumentUploadDialog 
                  dossierId={id!} 
                  onDocumentUploaded={fetchDossierData}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-lg border bg-accent/5">
                  <p className="text-2xl font-bold text-green-600">
                    {documents.filter(d => d.status === "APPROVED").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Goedgekeurd</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-accent/5">
                  <p className="text-2xl font-bold text-orange-600">
                    {documents.filter(d => d.status === "IN_REVIEW").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">In Review</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-accent/5">
                  <p className="text-2xl font-bold text-red-600">
                    {documents.filter(d => d.status === "REJECTED").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Afgekeurd</p>
                </div>
              </div>

              <Separator />

              {/* Document List */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Geüploade Documenten</span>
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-2 pl-6">
                    {documents.map((doc) => (
                      <div key={doc.id} className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.doc_type.replace(/_/g, " ")} • {formatDateTime(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                          >
                            {doc.status === "APPROVED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {doc.status === "REJECTED" && <XCircle className="mr-1 h-3 w-3" />}
                            {getDocStatusLabel(doc.status)}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
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
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Geen documenten
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obituary Tab */}
        <TabsContent value="obituary" className="space-y-6">
          <EditableObituaryCard
            dossierId={id!}
            initialObituary={obituary}
            onUpdate={fetchDossierData}
          />
        </TabsContent>

        {/* Stakeholders Tab */}
        <TabsContent value="stakeholders" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Overzicht</p>
                      <h2 className="text-2xl font-bold tracking-tight">Betrokkenen</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Moskee, Mortuarium en Verzekeraar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-6">
              {/* Moskee Dienst */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PiMosque className="h-4 w-4" />
                  <span>Moskee Dienst</span>
                </div>
                <div className="pl-6">
                  <EditableServiceCard
                    event={mosqueeService}
                    title="Janazah Details"
                    description="Planning en locatie informatie"
                    onUpdate={fetchDossierData}
                  />
                </div>
              </div>

              <Separator />

              {/* Mortuarium Dienst */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MdOutlineShower className="h-4 w-4" />
                  <span>Mortuarium Dienst</span>
                </div>
                <div className="pl-6">
                  <EditableServiceCard
                    event={mortuariumService}
                    title="Wassing Details"
                    description="Planning en faciliteit informatie"
                    onUpdate={fetchDossierData}
                  />
                </div>
              </div>

              <Separator />

              {/* Verzekeraar */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Verzekeraar</span>
                </div>
                
                {claim ? (
                  <div className="space-y-2 text-sm pl-6">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Verzekeraar:</span>
                      <span className="font-medium">{claim.organizations?.name || "N/A"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[100px]">Polisnummer:</span>
                      <span className="font-medium font-mono">{claim.policy_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Status:</span>
                      <Badge variant="secondary" className="text-xs">{claim.status}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6 text-sm pl-6">
                    Geen verzekeraar gekoppeld
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Communicatie</p>
                      <h2 className="text-2xl font-bold tracking-tight">Chat</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Chat met familie en collega's
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Start een gesprek over dit dossier met familie en teamleden.
              </p>
              <Button 
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full sm:w-auto"
                size="sm"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Chat
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Financieel</p>
                      <h2 className="text-2xl font-bold tracking-tight">Facturatie</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Beheer facturen en betalingen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <InvoiceManagementCard dossierId={id!} userRole={userRole || ''} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Overzicht</p>
                      <h2 className="text-2xl font-bold tracking-tight">Tijdlijn</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-15">
                    Chronologisch overzicht van alle gebeurtenissen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <DossierTimeline dossierId={id!} />
            </CardContent>
          </Card>
          
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Handmatige gebeurtenis toevoegen</CardTitle>
              <CardDescription>Voeg een gebeurtenis toe aan de tijdlijn</CardDescription>
            </CardHeader>
            <CardContent>
              <AddManualEventDialog 
                dossierId={id!}
                onEventAdded={fetchDossierData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <InternalNotesCard
            dossierId={id!}
            initialNotes={dossier?.internal_notes || null}
            onNotesSaved={fetchDossierData}
          />
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
