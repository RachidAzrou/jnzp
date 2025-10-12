import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, Clock, MapPin, Building2, CheckCircle, XCircle, User, Phone, Calendar, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl, fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateDossierDialog } from "@/components/dossier/CreateDossierDialog";
import { ClaimDossierDialog } from "@/components/dossier/ClaimDossierDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 10;

const Dossiers = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { organizationId, role: userRole } = useUserRole();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"my" | "all" | "incoming">("my");
  const [myDossiers, setMyDossiers] = useState<any[]>([]);
  const [allDossiers, setAllDossiers] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<any[]>([]);
  const [claimableCount, setClaimableCount] = useState(0);
  const [incomingCount, setIncomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flowFilter, setFlowFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const getDateLocale = () => {
    switch(i18n.language) {
      case 'fr': return fr;
      case 'en': return enUS;
      default: return nl;
    }
  };

  useEffect(() => {
    fetchDossiers();
    fetchIncomingRequests();
    fetchClaimableCount();
    setupRealtimeSubscriptions();
  }, [organizationId]);

  useEffect(() => {
    filterDossiers();
    setCurrentPage(1);
  }, [activeTab, myDossiers, allDossiers, incomingRequests, searchQuery, statusFilter, flowFilter]);

  const fetchDossiers = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch "Mijn dossiers" - assigned to my org
      const { data: myData, error: myError } = await supabase
        .from("view_my_dossiers")
        .select("*")
        .eq("assigned_fd_org_id", organizationId)
        .order("created_at", { ascending: false });

      if (myError) throw myError;

      // Fetch dossiers with pending claims by my org
      const { data: pendingClaims, error: claimsError } = await supabase
        .from("dossier_claims")
        .select(`
          dossier:dossiers(*)
        `)
        .eq("requesting_org_id", organizationId)
        .eq("status", "PENDING");

      if (claimsError) throw claimsError;

      // Combine assigned dossiers and pending claim dossiers
      const pendingDossiers = pendingClaims?.map((claim: any) => claim.dossier).filter(Boolean) || [];
      setMyDossiers([...(myData || []), ...pendingDossiers]);

      // Fetch "Alle dossiers" - alleen UNASSIGNED (niet-toegewezen) dossiers
      const { data: allData, error: allError } = await supabase
        .from("dossiers")
        .select(`
          *,
          assigned_fd_org:organizations!assigned_fd_org_id(name),
          insurer_org:organizations!insurer_org_id(name)
        `)
        .eq("assignment_status", "UNASSIGNED")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (allError) throw allError;
      setAllDossiers(allData || []);
    } catch (error) {
      console.error("Error fetching dossiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingRequests = async () => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase
        .from("dossier_claims")
        .select(`
          *,
          dossier:dossiers!inner(
            id,
            display_id,
            deceased_name,
            flow,
            date_of_death,
            family_contacts(
              name,
              phone,
              relationship
            )
          )
        `)
        .eq("requesting_org_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setIncomingRequests(data || []);
      setIncomingCount(data?.filter((r: any) => r.status === "PENDING").length || 0);
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
    }
  };

  const fetchClaimableCount = async () => {
    try {
      const { data, error } = await supabase.rpc("count_claimable_dossiers");
      if (error) throw error;
      setClaimableCount(data || 0);
    } catch (error) {
      console.error("Error fetching claimable count:", error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const dossiersChannel = supabase
      .channel("dossiers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dossiers" },
        () => {
          fetchDossiers();
          fetchClaimableCount();
        }
      )
      .subscribe();

    const claimsChannel = supabase
      .channel("claims_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dossier_claims" },
        () => {
          fetchIncomingRequests();
          fetchClaimableCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dossiersChannel);
      supabase.removeChannel(claimsChannel);
    };
  };

  const filterDossiers = () => {
    let source = activeTab === "my" ? myDossiers : activeTab === "all" ? allDossiers : incomingRequests;
    let filtered = [...source];

    if (searchQuery) {
      filtered = filtered.filter((d) => {
        const dossier = activeTab === "incoming" ? d.dossier : d;
        if (!dossier) return false;
        return (
          (dossier.display_id && dossier.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (dossier.ref_number && dossier.ref_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (dossier.deceased_name && dossier.deceased_name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });
    }

    if (activeTab !== "incoming") {
      if (statusFilter !== "all") {
        filtered = filtered.filter((d) => d.status === statusFilter);
      }

      if (flowFilter !== "all") {
        filtered = filtered.filter((d) => d.flow === flowFilter);
      }
    }

    setFilteredDossiers(filtered);
  };

  const handleClaim = (dossier: any) => {
    setSelectedDossier(dossier);
    setClaimDialogOpen(true);
  };

  const handleClaimSuccess = () => {
    fetchDossiers();
    fetchClaimableCount();
  };

  const isClaimable = (dossier: any) => {
    return dossier.assignment_status === "UNASSIGNED";
  };

  const canViewDossier = (dossier: any) => {
    // Alleen toegang tot dossiers van eigen organisatie
    return dossier.assigned_fd_org_id === organizationId;
  };

  const shouldBlurInfo = (dossier: any) => {
    // Blur info als het dossier NIET van jouw organisatie is
    // Dit geldt voor UNASSIGNED dossiers en dossiers van andere organisaties
    return !canViewDossier(dossier);
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("handle_fd_request", {
        p_claim_id: requestId,
        p_approved: true,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Aanvraag geaccepteerd",
          description: "Het dossier is aan jouw organisatie toegewezen",
        });
        fetchDossiers();
        fetchIncomingRequests();
        fetchClaimableCount();
      } else {
        throw new Error((data as any)?.error || "Acceptatie mislukt");
      }
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon aanvraag niet accepteren",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest || !declineReason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden op voor de weigering",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("handle_fd_request", {
        p_claim_id: selectedRequest.id,
        p_approved: false,
        p_rejection_reason: declineReason,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Aanvraag geweigerd",
          description: "Het dossier blijft beschikbaar voor andere uitvaartondernemers",
        });
        setShowDeclineDialog(false);
        setDeclineReason("");
        setSelectedRequest(null);
        fetchDossiers();
        fetchIncomingRequests();
        fetchClaimableCount();
      } else {
        throw new Error((data as any)?.error || "Weigering mislukt");
      }
    } catch (error: any) {
      console.error("Error declining request:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon aanvraag niet weigeren",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredDossiers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentDossiers = filteredDossiers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getStatusColor = (status: string) => {
    if (status === 'archived') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  const getStatusLabel = (status: string) => {
    // Use admin labels if user is admin
    const isAdminUser = userRole === 'platform_admin';
    
    const statusMap: Record<string, string> = isAdminUser ? {
      'CREATED': 'Nieuw dossier aangemaakt',
      'INTAKE_IN_PROGRESS': 'Intake lopend',
      'DOCS_PENDING': 'Documenten in behandeling',
      'DOCS_VERIFIED': 'Documenten gecontroleerd',
      'APPROVED': 'Goedgekeurd door verzekeraar',
      'LEGAL_HOLD': 'Juridische blokkade (parket)',
      'PLANNING': 'Planningfase gestart',
      'READY_FOR_TRANSPORT': 'Klaar voor uitvoering',
      'IN_TRANSIT': 'In uitvoering',
      'SETTLEMENT': 'Financiële afhandeling',
      'ARCHIVED': 'Afgerond & gearchiveerd',
    } : {
      'CREATED': 'Nieuw',
      'INTAKE_IN_PROGRESS': 'Intake',
      'DOCS_PENDING': 'Documenten in behandeling',
      'DOCS_VERIFIED': 'Documenten volledig',
      'APPROVED': 'Goedgekeurd',
      'LEGAL_HOLD': 'Juridisch geblokkeerd',
      'PLANNING': 'Planning',
      'READY_FOR_TRANSPORT': 'Klaar voor uitvoering',
      'IN_TRANSIT': 'Uitvoering',
      'SETTLEMENT': 'Facturatie',
      'ARCHIVED': 'Afgerond',
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: getDateLocale() });
    } catch {
      return "N/A";
    }
  };

  const handleViewDetails = (dossierId: string) => {
    navigate(`/dossiers/${dossierId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
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
                    <h1 className="text-2xl font-bold tracking-tight">Dossiers</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
                  Beheer jouw dossiers en claim nieuwe aanvragen
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CreateDossierDialog />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "my" | "all" | "incoming")} className="space-y-6">
          <TabsList className="bg-card border shadow-sm">
            <TabsTrigger value="my" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Mijn dossiers
            </TabsTrigger>
            <TabsTrigger value="all" className="relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Alle dossiers
              {claimableCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs h-5 rounded-full">
                  {claimableCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Inkomende aanvragen
              {incomingCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs h-5 rounded-full animate-pulse">
                  {incomingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op naam, ID, telefoon..."
                      className="pl-10 bg-background border-muted-foreground/20 focus:border-primary transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className="transition-all"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle statussen</SelectItem>
                          <SelectItem value="created">Aangemaakt</SelectItem>
                          <SelectItem value="intake_in_progress">Intake lopend</SelectItem>
                          <SelectItem value="operational">Operationeel</SelectItem>
                          <SelectItem value="archived">Gearchiveerd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select value={flowFilter} onValueChange={setFlowFilter}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle types</SelectItem>
                          <SelectItem value="LOC">Lokaal</SelectItem>
                          <SelectItem value="REP">Repatriëring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <TabsContent value="my" className="mt-0 space-y-4">
            <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
              <CardContent className="p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="font-medium">Case ID</TableHead>
                        <TableHead className="font-medium">Overledene</TableHead>
                        <TableHead className="font-medium">Type</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Laatste update</TableHead>
                        <TableHead className="font-medium text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDossiers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                            Geen dossiers gevonden
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentDossiers.map((dossier) => (
                          <TableRow key={dossier.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {dossier.display_id || dossier.ref_number}
                            </TableCell>
                            <TableCell className="font-medium">
                              {shouldBlurInfo(dossier) ? (
                                <span className="inline-block bg-muted text-transparent select-none blur-sm">
                                  ████████████
                                </span>
                              ) : (
                                dossier.deceased_name
                              )}
                            </TableCell>
                            <TableCell>
                              {shouldBlurInfo(dossier) ? (
                                <Badge variant="outline" className="blur-sm">████</Badge>
                              ) : (
                                <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {shouldBlurInfo(dossier) ? (
                                <Badge className="blur-sm">████████</Badge>
                              ) : dossier.assignment_status === 'PENDING_CLAIM' ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  In afwachting
                                </Badge>
                              ) : (
                                <Badge variant={dossier.status === 'archived' ? 'default' : 'secondary'}>
                                  {getStatusLabel(dossier.status)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {shouldBlurInfo(dossier) ? (
                                <span className="blur-sm">██/██/████</span>
                              ) : (
                                formatDate(dossier.updated_at)
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {dossier.assignment_status === 'PENDING_CLAIM' ? (
                                <div className="flex justify-end">
                                  <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>
                              ) : isClaimable(dossier) ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleClaim(dossier)}
                                  className="bg-primary hover:bg-primary/90 shadow-sm"
                                >
                                  Claimen
                                </Button>
                              ) : canViewDossier(dossier) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(dossier.id)}
                                >
                                  Bekijken
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Geen toegang
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden space-y-3 p-4">
                  {currentDossiers.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      Geen dossiers gevonden
                    </div>
                  ) : (
                    currentDossiers.map((dossier) => (
                      <div key={dossier.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-mono text-xs text-muted-foreground">
                              {dossier.display_id || dossier.ref_number}
                            </p>
                            <p className="text-sm font-medium mt-1">{dossier.deceased_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(dossier.updated_at)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                            {dossier.assignment_status === 'PENDING_CLAIM' && (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                In afwachting
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(dossier.id)}
                          className="w-full"
                        >
                          Bekijken
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
              <CardContent className="p-0">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="font-medium">Case ID</TableHead>
                        <TableHead className="font-medium">Overledene</TableHead>
                        <TableHead className="font-medium">Type</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Toewijzing</TableHead>
                        <TableHead className="font-medium text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDossiers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                            Geen dossiers gevonden
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentDossiers.map((dossier) => (
                          <TableRow key={dossier.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-sm">
                              {dossier.display_id || dossier.ref_number}
                            </TableCell>
                            <TableCell className="font-medium">
                              {shouldBlurInfo(dossier) ? (
                                <span className="inline-block bg-muted text-transparent select-none blur-sm">
                                  ████████████
                                </span>
                              ) : (
                                dossier.deceased_name
                              )}
                            </TableCell>
                            <TableCell>
                              {shouldBlurInfo(dossier) ? (
                                <Badge variant="outline" className="blur-sm">████</Badge>
                              ) : (
                                <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {shouldBlurInfo(dossier) ? (
                                <Badge className="blur-sm">████████</Badge>
                              ) : (
                                <Badge variant={dossier.status === 'archived' ? 'default' : 'secondary'}>
                                  {getStatusLabel(dossier.status)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {dossier.assignment_status === 'ASSIGNED' ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span>{dossier.assigned_fd_org?.name || "Toegewezen"}</span>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Niet toegewezen
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {isClaimable(dossier) ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleClaim(dossier)}
                                  className="bg-primary hover:bg-primary/90 shadow-sm"
                                >
                                  Claimen
                                </Button>
                              ) : canViewDossier(dossier) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(dossier.id)}
                                >
                                  Bekijken
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Geen toegang
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden space-y-3 p-4">
                  {currentDossiers.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      Geen dossiers gevonden
                    </div>
                  ) : (
                    currentDossiers.map((dossier) => (
                      <div key={dossier.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-all space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-mono text-xs text-muted-foreground bg-muted/50 inline-block px-2 py-1 rounded">
                              {dossier.display_id || dossier.ref_number}
                            </p>
                            <p className="text-sm font-semibold mt-2">
                              {shouldBlurInfo(dossier) ? (
                                <span className="inline-block bg-muted text-transparent select-none blur-sm">
                                  ████████████
                                </span>
                              ) : (
                                dossier.deceased_name
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {shouldBlurInfo(dossier) ? (
                                <>
                                  <Badge variant="outline" className="text-xs blur-sm">████</Badge>
                                  {dossier.assignment_status === 'UNASSIGNED' && (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <Clock className="h-3 w-3" />
                                      Niet toegewezen
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5">{getFlowLabel(dossier.flow)}</Badge>
                                  {dossier.assignment_status === 'UNASSIGNED' && (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <Clock className="h-3 w-3" />
                                      Niet toegewezen
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isClaimable(dossier) ? (
                            <Button
                              size="sm"
                              onClick={() => handleClaim(dossier)}
                              className="w-full"
                            >
                              Claimen
                            </Button>
                          ) : canViewDossier(dossier) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(dossier.id)}
                              className="w-full"
                            >
                              Bekijken
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="w-full justify-center py-2">
                              Geen toegang
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="mt-0 space-y-4">
            <div className="space-y-4">
              {currentDossiers.length === 0 ? (
                <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
                  <CardContent className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-muted p-4">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Geen inkomende aanvragen</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                currentDossiers.map((request: any) => {
                  const isPending = request.status === "PENDING";
                  const dossier = request.dossier;
                  
                  // Skip if dossier data is missing
                  if (!dossier) return null;
                  
                  return (
                    <Card
                      key={request.id}
                      className={`border-0 shadow-md bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg animate-fade-in ${!isPending ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-2">
                            <h3 className="text-base sm:text-lg font-semibold">
                              {dossier.deceased_name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground bg-muted/50 inline-block px-2 py-1 rounded">
                              Dossier {dossier.display_id}
                            </p>
                          </div>
                          <Badge 
                            variant={isPending ? "default" : request.status === "APPROVED" ? "default" : "secondary"} 
                            className="gap-1.5 shadow-sm"
                          >
                            {isPending && <Clock className="h-3 w-3" />}
                            {request.status === "APPROVED" && <CheckCircle className="h-3 w-3" />}
                            {request.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                            {request.status === "PENDING" ? "In afwachting" : 
                             request.status === "APPROVED" ? "Geaccepteerd" :
                             request.status === "REJECTED" ? "Geweigerd" : request.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {dossier.flow === "LOC" ? "Lokaal" : "Repatriëring"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {dossier.date_of_death
                                ? formatDate(dossier.date_of_death)
                                : "Onbekend"}
                            </span>
                          </div>
                          {dossier.family_contacts?.[0] && (
                            <>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {dossier.family_contacts[0].name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {dossier.family_contacts[0].phone}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {isPending && (
                          <>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Verloopt om {format(new Date(request.expire_at), "HH:mm", { locale: getDateLocale() })}
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                              <Button
                                onClick={() => handleAcceptRequest(request.id)}
                                disabled={processing}
                                className="flex-1 min-h-[44px]"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accepteren
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDeclineDialog(true);
                                }}
                                disabled={processing}
                                className="flex-1 min-h-[44px]"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Weigeren
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Claim Dialog */}
      {selectedDossier && (
        <ClaimDossierDialog
          open={claimDialogOpen}
          onOpenChange={setClaimDialogOpen}
          dossier={selectedDossier}
          onClaimed={handleClaimSuccess}
        />
      )}

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aanvraag weigeren</DialogTitle>
            <DialogDescription>
              Waarom wil je deze aanvraag weigeren? De nabestaande zal een melding ontvangen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reden</Label>
              <Textarea
                id="reason"
                placeholder="bijv. Te druk met andere dossiers, geen capaciteit..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setDeclineReason("");
                setSelectedRequest(null);
              }}
              className="min-h-[44px]"
            >
              Annuleren
            </Button>
            <Button
              onClick={handleDeclineRequest}
              disabled={processing || !declineReason.trim()}
              variant="destructive"
              className="min-h-[44px]"
            >
              Weigeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getFlowLabel = (flow: string) => {
  const flowMap: Record<string, string> = {
    LOC: "Lokaal",
    REP: "Repatriëring",
    UNSET: "Niet ingesteld",
  };
  return flowMap[flow] || flow;
};

export default Dossiers;
