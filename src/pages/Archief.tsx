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
import { Search, Download, Archive, Calendar, FileText, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 20;

const Archief = () => {
  const navigate = useNavigate();
  const { organizationId } = useUserRole();
  
  const [activeTab, setActiveTab] = useState<"dossiers" | "tasks-dossier" | "tasks-loose">("dossiers");
  const [archivedDossiers, setArchivedDossiers] = useState<any[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const [looseTasks, setLooseTasks] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [flowFilter, setFlowFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const getCurrentDate = () => {
    return format(new Date(), "EEEE d MMMM yyyy", { locale: nl });
  };

  useEffect(() => {
    fetchArchivedData();
  }, [organizationId]);

  useEffect(() => {
    filterItems();
    setCurrentPage(1);
  }, [activeTab, archivedDossiers, archivedTasks, looseTasks, searchQuery, flowFilter]);

  const fetchArchivedData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch archived dossiers
      const { data: dossiersData, error: dossiersError } = await supabase
        .from("dossiers")
        .select("*")
        .eq("assigned_fd_org_id", organizationId)
        .eq("status", "ARCHIVED")
        .order("updated_at", { ascending: false });

      if (dossiersError) throw dossiersError;
      setArchivedDossiers(dossiersData || []);

      // Fetch completed tasks with dossier
      const { data: tasksData, error: tasksError } = await supabase
        .from("kanban_tasks")
        .select(`
          *,
          dossier:dossiers(
            id,
            display_id,
            deceased_name,
            flow
          ),
          assignee:profiles(
            id,
            display_name
          )
        `)
        .eq("status", "DONE")
        .not("dossier_id", "is", null)
        .order("completed_at", { ascending: false });

      if (tasksError) throw tasksError;
      setArchivedTasks(tasksData || []);

      // Fetch loose tasks (without dossier_id)
      const { data: looseTasksData, error: looseTasksError } = await supabase
        .from("kanban_tasks")
        .select(`
          *,
          assignee:profiles(
            id,
            display_name
          )
        `)
        .eq("status", "DONE")
        .is("dossier_id", null)
        .order("completed_at", { ascending: false });

      if (looseTasksError) throw looseTasksError;
      setLooseTasks(looseTasksData || []);

    } catch (error) {
      console.error("Error fetching archived data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let source = activeTab === "dossiers" 
      ? archivedDossiers 
      : activeTab === "tasks-dossier" 
        ? archivedTasks 
        : looseTasks;
    
    let filtered = [...source];

    if (searchQuery) {
      filtered = filtered.filter((item) => {
        if (activeTab === "dossiers") {
          return (
            (item.display_id && item.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.deceased_name && item.deceased_name.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        } else {
          return (
            (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.dossier?.display_id && item.dossier.display_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.dossier?.deceased_name && item.dossier.deceased_name.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
      });
    }

    if (flowFilter !== "all") {
      if (activeTab === "dossiers") {
        filtered = filtered.filter((d) => d.flow === flowFilter);
      } else if (activeTab === "tasks-dossier") {
        filtered = filtered.filter((t) => t.dossier?.flow === flowFilter);
      }
    }

    setFilteredItems(filtered);
  };

  const exportToCSV = () => {
    let csvContent = "";
    
    if (activeTab === "dossiers") {
      csvContent = "Display ID,Overleden,Flow,Afgesloten op\n";
      filteredItems.forEach((item) => {
        csvContent += `${item.display_id || ""},${item.deceased_name || ""},${item.flow || ""},${formatDate(item.updated_at)}\n`;
      });
    } else {
      csvContent = "Taak,Dossier ID,Overleden,Afgesloten op,Toegewezen aan\n";
      filteredItems.forEach((item) => {
        csvContent += `${item.title || ""},${item.dossier?.display_id || "N/A"},${item.dossier?.deceased_name || "N/A"},${formatDate(item.completed_at)},${item.assignee?.display_name || "Niet toegewezen"}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `archief_${activeTab}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
  };

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  const getFlowLabel = (flow: string) => {
    const flowMap: Record<string, string> = {
      'LOC': 'Lokale uitvaart',
      'REP': 'Repatriëring',
      'UNSET': 'Niet ingesteld',
    };
    return flowMap[flow] || flow;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      'HIGH': 'destructive',
      'MEDIUM': 'default',
      'LOW': 'secondary',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
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
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <p className="text-sm text-muted-foreground font-medium">{getCurrentDate()}</p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Archive className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Archief</h1>
                    <p className="text-sm text-muted-foreground">Afgeronde dossiers en taken (alleen-lezen)</p>
                  </div>
                </div>
              </div>
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exporteer naar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-card border shadow-sm">
            <TabsTrigger value="dossiers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Dossiers ({archivedDossiers.length})
            </TabsTrigger>
            <TabsTrigger value="tasks-dossier" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Taken (per dossier) ({archivedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="tasks-loose" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Losse taken ({looseTasks.length})
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === "dossiers" ? "Zoek op naam of ID..." : "Zoek op taak, dossier ID of naam..."}
                    className="pl-10 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {activeTab !== "tasks-loose" && (
                  <Select value={flowFilter} onValueChange={setFlowFilter}>
                    <SelectTrigger className="w-[200px] bg-background">
                      <SelectValue placeholder="Flow filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle flows</SelectItem>
                      <SelectItem value="LOC">Lokale uitvaart</SelectItem>
                      <SelectItem value="REP">Repatriëring</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <TabsContent value="dossiers" className="mt-0">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display ID</TableHead>
                      <TableHead>Overleden</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Afgesloten op</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Geen afgeronde dossiers gevonden
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((dossier) => (
                        <TableRow key={dossier.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{dossier.display_id}</TableCell>
                          <TableCell>{dossier.deceased_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFlowLabel(dossier.flow)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(dossier.updated_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dossiers/${dossier.id}`)}
                            >
                              Bekijken
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Pagina {currentPage} van {totalPages} ({filteredItems.length} resultaten)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks-dossier" className="mt-0">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taak</TableHead>
                      <TableHead>Dossier</TableHead>
                      <TableHead>Overleden</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Prioriteit</TableHead>
                      <TableHead>Afgesloten op</TableHead>
                      <TableHead>Toegewezen aan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Geen afgeronde taken gevonden
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((task) => (
                        <TableRow key={task.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.dossier?.display_id || "N/A"}</TableCell>
                          <TableCell>{task.dossier?.deceased_name || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFlowLabel(task.dossier?.flow || "UNSET")}</Badge>
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(task.completed_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.assignee?.display_name || "Niet toegewezen"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Pagina {currentPage} van {totalPages} ({filteredItems.length} resultaten)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks-loose" className="mt-0">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taak</TableHead>
                      <TableHead>Prioriteit</TableHead>
                      <TableHead>Afgesloten op</TableHead>
                      <TableHead>Toegewezen aan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Geen losse taken gevonden
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((task) => (
                        <TableRow key={task.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(task.completed_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.assignee?.display_name || "Niet toegewezen"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Pagina {currentPage} van {totalPages} ({filteredItems.length} resultaten)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Archief;
