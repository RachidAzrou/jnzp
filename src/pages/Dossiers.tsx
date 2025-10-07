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
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, Clock, MapPin, Building2, CheckCircle, XCircle, User, Phone, Calendar } from "lucide-react";
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
  const { organizationId } = useUserRole();
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
      setMyDossiers(myData || []);

      // Fetch "Alle dossiers" - all org dossiers + unassigned claimable
      const { data: allData, error: allError } = await supabase
        .from("dossiers")
        .select(`
          *,
          assigned_fd_org:organizations!assigned_fd_org_id(name),
          insurer_org:organizations!insurer_org_id(name)
        `)
        .or(`assigned_fd_org_id.eq.${organizationId},assignment_status.eq.UNASSIGNED`)
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
        return (
          (dossier.display_id && dossier.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (dossier.ref_number && dossier.ref_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
          dossier.deceased_name.toLowerCase().includes(searchQuery.toLowerCase())
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
    return dossier.assignment_status === "UNASSIGNED" && dossier.flow !== "UNSET";
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
    const statusMap: Record<string, string> = {
      'created': 'Aangemaakt',
      'intake_in_progress': 'Intake lopend',
      'operational': 'Operationeel',
      'planning_in_progress': 'Planning bezig',
      'execution_in_progress': 'Uitvoering bezig',
      'settlement': 'Afronding / Facturatie',
      'archived': 'Afgerond & Gearchiveerd',
    };
    return statusMap[status] || status;
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
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Dossiers
            </h1>
            <p className="text-sm text-muted-foreground">
              Beheer jouw dossiers en claim nieuwe aanvragen
            </p>
          </div>
          <CreateDossierDialog />
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "my" | "all" | "incoming")} className="space-y-4">
          <TabsList>
            <TabsTrigger value="my">Mijn dossiers</TabsTrigger>
            <TabsTrigger value="all" className="relative">
              Alle dossiers
              {claimableCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs h-5">
                  {claimableCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="relative">
              Inkomende aanvragen
              {incomingCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs h-5">
                  {incomingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op naam, ID, telefoon..."
                      className="pl-10 bg-background"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-muted" : ""}
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

          <TabsContent value="my" className="mt-0">
            <Card className="border-0 shadow-sm">
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
                          <TableRow key={dossier.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-sm">
                              {dossier.display_id || dossier.ref_number}
                            </TableCell>
                            <TableCell className="font-medium">{dossier.deceased_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={dossier.status === 'archived' ? 'default' : 'secondary'}>
                                {getStatusLabel(dossier.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(dossier.updated_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(dossier.id)}
                              >
                                Bekijken
                              </Button>
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
                          <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
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
            <Card className="border-0 shadow-sm">
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
                            <TableCell className="font-medium">{dossier.deceased_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={dossier.status === 'archived' ? 'default' : 'secondary'}>
                                {getStatusLabel(dossier.status)}
                              </Badge>
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
                                >
                                  Claimen
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(dossier.id)}
                                >
                                  Bekijken
                                </Button>
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
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{getFlowLabel(dossier.flow)}</Badge>
                              {dossier.assignment_status === 'UNASSIGNED' && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Clock className="h-3 w-3" />
                                  Niet toegewezen
                                </Badge>
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
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(dossier.id)}
                              className="w-full"
                            >
                              Bekijken
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="mt-0">
            <div className="space-y-4">
              {currentDossiers.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Geen inkomende aanvragen
                  </CardContent>
                </Card>
              ) : (
                currentDossiers.map((request: any) => {
                  const isPending = request.status === "PENDING";
                  const dossier = request.dossier;
                  
                  return (
                    <Card
                      key={request.id}
                      className={`border-0 shadow-sm ${!isPending ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="text-base sm:text-lg font-semibold">
                              {dossier.deceased_name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Dossier {dossier.display_id}
                            </p>
                          </div>
                          <Badge variant={isPending ? "default" : request.status === "APPROVED" ? "default" : "secondary"} className="gap-1">
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
