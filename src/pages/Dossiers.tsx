import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { Calendar } from "@/components/ui/calendar";

const ITEMS_PER_PAGE = 10;

const Dossiers = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flowFilter, setFlowFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const getDateLocale = () => {
    switch(i18n.language) {
      case 'fr': return fr;
      case 'en': return enUS;
      default: return nl;
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, []);

  useEffect(() => {
    filterDossiers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [dossiers, searchQuery, statusFilter, flowFilter]);

  const fetchDossiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dossiers")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setDossiers(data);
    }
    setLoading(false);
  };

  const filterDossiers = () => {
    let filtered = [...dossiers];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          (d.display_id && d.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
          d.ref_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.deceased_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Flow filter
    if (flowFilter !== "all") {
      filtered = filtered.filter((d) => d.flow === flowFilter);
    }

    setFilteredDossiers(filtered);
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
    if (status === 'COMPLETED' || status === 'ARCHIVED') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'CREATED': t('status.created'),
      'FD_ASSIGNED': t('status.fdAssigned'),
      'DOCS_PENDING': t('status.docsPending'),
      'READY_FOR_TRANSPORT': t('status.readyForTransport'),
      'IN_TRANSIT': t('status.inTransit'),
      'PLANNING': t('status.planning'),
      'COMPLETED': t('status.completed'),
      'ARCHIVED': t('status.archived'),
      'LEGAL_HOLD': t('status.legalHold'),
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
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("navigation.dossiers")}</span>
            <span>{">"}</span>
            <span>{t("dossiers.allFiles")}</span>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("dossiers.searchPlaceholder")}
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
              
              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("dossiers.status")}</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("dossiers.allStatuses")}</SelectItem>
                        <SelectItem value="CREATED">{t("status.created")}</SelectItem>
                        <SelectItem value="FD_ASSIGNED">{t("status.fdAssigned")}</SelectItem>
                        <SelectItem value="DOCS_PENDING">{t("status.docsPending")}</SelectItem>
                        <SelectItem value="READY_FOR_TRANSPORT">{t("status.readyForTransport")}</SelectItem>
                        <SelectItem value="IN_TRANSIT">{t("status.inTransit")}</SelectItem>
                        <SelectItem value="PLANNING">{t("status.planning")}</SelectItem>
                        <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                        <SelectItem value="ARCHIVED">{t("status.archived")}</SelectItem>
                        <SelectItem value="LEGAL_HOLD">{t("status.legalHold")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("dossiers.flow")}</label>
                    <Select value={flowFilter} onValueChange={setFlowFilter}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("dossiers.allFlows")}</SelectItem>
                        <SelectItem value="REP">{t("flow.repatriation")}</SelectItem>
                        <SelectItem value="LOC">{t("flow.local")}</SelectItem>
                        <SelectItem value="UNSET">{t("flow.unset")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border-border/40">
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">{t("dossiers.jaId")}</TableHead>
                    <TableHead className="font-semibold">{t("dossiers.deceasedName")}</TableHead>
                    <TableHead className="font-semibold">{t("dossiers.city")}</TableHead>
                    <TableHead className="font-semibold">{t("dossiers.dateCreated")}</TableHead>
                    <TableHead className="font-semibold">{t("dossiers.status")}</TableHead>
                    <TableHead className="font-semibold"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDossiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {dossiers.length === 0 ? t("dossiers.noDossiers") : t("dossiers.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentDossiers.map((dossier) => (
                      <TableRow key={dossier.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm font-medium">
                          {dossier.display_id || dossier.ref_number}
                        </TableCell>
                        <TableCell className="font-medium">{dossier.deceased_name}</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(dossier.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(dossier.status)} flex items-center gap-1 w-fit`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {getStatusLabel(dossier.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(dossier.id)}
                          >
                            {t("common.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {currentDossiers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {dossiers.length === 0 ? t("dossiers.noDossiers") : t("dossiers.noResults")}
                </div>
              ) : (
                currentDossiers.map((dossier) => (
                  <div key={dossier.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-medium">{dossier.display_id || dossier.ref_number}</p>
                        <p className="text-base font-semibold mt-1 truncate">{dossier.deceased_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(dossier.created_at)}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(dossier.status)} flex items-center gap-1 flex-shrink-0`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {getStatusLabel(dossier.status)}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(dossier.id)}
                      className="w-full"
                    >
                      {t("common.view")}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

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
              // Show first page, last page, current page, and pages around current
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
    </div>
  );
};

export default Dossiers;
