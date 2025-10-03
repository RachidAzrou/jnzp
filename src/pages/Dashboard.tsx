import { FolderOpen, AlertTriangle, FileX, Clock, Plane, MapPin, CheckSquare } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { nl, fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateLocale = () => {
    switch(i18n.language) {
      case 'fr': return fr;
      case 'en': return enUS;
      default: return nl;
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`status.${status}`) || status.replace(/_/g, " ");
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: dossiersData } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false });
      
      const { data: auditData } = await supabase
        .from("audit_events")
        .select("*, dossiers(display_id, ref_number)")
        .order("created_at", { ascending: false })
        .limit(5);

      setDossiers(dossiersData || []);
      setAuditEvents(auditData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const activeDossiers = dossiers.filter(d => 
    !['ARCHIVED', 'IN_TRANSIT'].includes(d.status)
  ).length;

  const legalHold = dossiers.filter(d => d.legal_hold).length;
  
  const repatriationDossiers = dossiers.filter(d => d.flow === 'REP').length;
  const localDossiers = dossiers.filter(d => d.flow === 'LOC').length;

  const getTaskDescription = (status: string, legalHold: boolean) => {
    if (legalHold) return t("tasks.awaitParkingRelease");
    const taskKey = `tasks.${status.toLowerCase().replace(/_/g, '')}`;
    return t(taskKey, { defaultValue: t("tasks.performTask") });
  };

  const getTaskUrgency = (status: string, legalHold: boolean) => {
    if (legalHold) return t("status.high");
    if (["DOCS_PENDING", "FD_ASSIGNED"].includes(status)) return t("status.high");
    if (["PLANNING", "READY_FOR_TRANSPORT"].includes(status)) return t("status.normal");
    return t("status.low");
  };


  const getTaskAction = (status: string, dossierId: string) => {
    if (["DOCS_PENDING"].includes(status)) {
      return () => navigate(`/documenten?filter=missing`);
    }
    if (["PLANNING"].includes(status)) {
      return () => navigate(`/planning`);
    }
    return () => navigate(`/dossiers`);
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: getDateLocale() });
    } catch {
      return formatEventTime(timestamp);
    }
  };

  // Get urgent/today tasks (legal hold + docs pending + planning)
  const urgentTasks = dossiers.filter(d => 
    d.legal_hold || ["DOCS_PENDING", "FD_ASSIGNED", "PLANNING"].includes(d.status)
  ).slice(0, 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("dashboard.overview")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 auto-rows-fr">
          <div onClick={() => navigate('/dossiers')} className="cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 h-full">
            <KPICard
              title={t("dashboard.runningDossiers")}
              value={activeDossiers}
              icon={FolderOpen}
            />
          </div>
          <div onClick={() => navigate('/dossiers?status=LEGAL_HOLD')} className="cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 h-full">
            <KPICard
              title={t("dashboard.legalHold")}
              value={legalHold}
              icon={AlertTriangle}
            />
          </div>
          <div onClick={() => navigate('/documenten?filter=missing')} className="cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 h-full">
            <KPICard
              title={t("dashboard.missingDocuments")}
              value={5}
              icon={FileX}
            />
          </div>
          <div onClick={() => navigate('/dossiers?flow=REP')} className="cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 h-full">
            <KPICard
              title={t("dashboard.repatriation")}
              value={repatriationDossiers}
              icon={Plane}
            />
          </div>
          <div onClick={() => navigate('/dossiers?flow=LOC')} className="cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 h-full">
            <KPICard
              title={t("dashboard.local")}
              value={localDossiers}
              icon={MapPin}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Actieve dossiers */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-4 sm:pb-5">
              <div>
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 shadow-sm">
                    <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="truncate">{t("dashboard.activeDossiers")}</span>
                </CardTitle>
                <CardDescription className="mt-2 sm:mt-2.5 text-sm sm:text-base">{t("dashboard.dossiersRequiringAttention")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="overflow-x-auto -mx-8 px-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t("dossiers.dossier")}</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">{t("dossiers.flow")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("dossiers.name")}</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">{t("dossiers.status")}</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">{t("dossiers.update")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("dossiers.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dossiers.slice(0, 5).map((dossier) => (
                    <TableRow key={dossier.id}>
                      <TableCell className="font-medium font-mono text-xs sm:text-sm whitespace-nowrap">
                        {dossier.display_id || dossier.ref_number}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {dossier.flow === "REP" && (
                          <Badge variant="outline" className="gap-1 whitespace-nowrap">
                            <Plane className="h-3 w-3" />
                            <span className="hidden sm:inline">REP</span>
                          </Badge>
                        )}
                        {dossier.flow === "LOC" && (
                          <Badge variant="outline" className="gap-1 whitespace-nowrap">
                            <MapPin className="h-3 w-3" />
                            <span className="hidden sm:inline">LOC</span>
                          </Badge>
                        )}
                        {dossier.flow === "UNSET" && (
                          <Badge variant="secondary">-</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] sm:max-w-none truncate text-sm">{dossier.deceased_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge 
                          variant={dossier.legal_hold ? "destructive" : "default"}
                          className={`min-w-[100px] sm:min-w-[120px] justify-center text-xs ${
                            !dossier.legal_hold ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : ""
                          }`}
                        >
                          <span className="truncate">{getStatusLabel(dossier.status)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {formatRelativeTime(dossier.updated_at)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/dossiers/${dossier.id}`)}
                          className="hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">{t("dossiers.open")}</span>
                          <span className="sm:hidden">→</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
                </TableBody>
              </Table>
              </div>
          </CardContent>
        </Card>

          {/* Mijn openstaande taken */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-4 sm:pb-5">
              <div>
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 shadow-sm">
                    <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="truncate">{t("dashboard.myOpenTasks")}</span>
                </CardTitle>
                <CardDescription className="mt-2 sm:mt-2.5 text-sm sm:text-base">{t("dashboard.tasksToday")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="overflow-x-auto -mx-8 px-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t("dossiers.dossier")}</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">{t("dossiers.task")}</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">{t("dossiers.urgency")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("dossiers.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urgentTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                        {t("dashboard.noUrgentTasks")}
                    </TableCell>
                  </TableRow>
                ) : (
                  urgentTasks.map((task) => {
                    const urgency = getTaskUrgency(task.status, task.legal_hold);
                    const taskDesc = getTaskDescription(task.status, task.legal_hold);
                    const action = getTaskAction(task.status, task.id);

                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium font-mono text-xs sm:text-sm whitespace-nowrap">
                            {task.display_id || task.ref_number}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden sm:table-cell max-w-[200px] truncate">
                            {taskDesc}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge 
                              variant={
                                urgency === "Hoog" ? "destructive" : 
                                urgency === "Normaal" ? "default" : 
                                "secondary"
                              }
                              className={`min-w-[100px] sm:min-w-[120px] justify-center text-xs ${
                                urgency !== "Hoog" ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : ""
                              }`}
                            >
                              <span className="truncate">{urgency}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={action}
                              className="hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap text-xs sm:text-sm"
                            >
                              <span className="hidden sm:inline">
                              {task.status === "DOCS_PENDING" ? t("tasks.toDocuments") :
                               task.status === "PLANNING" ? t("tasks.toPlanning") :
                               t("tasks.openDossier")}
                              </span>
                              <span className="sm:hidden">→</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
          </CardContent>
        </Card>
      </div>

        {/* Recent bijgewerkt */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-4 sm:pb-5">
            <div>
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 shadow-sm">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <span className="truncate">{t("dashboard.recentlyUpdated")}</span>
              </CardTitle>
              <CardDescription className="mt-2 sm:mt-2.5 text-sm sm:text-base">{t("dashboard.lastActivities")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{t("dossiers.time")}</TableHead>
                <TableHead className="w-24">{t("dossiers.dossier")}</TableHead>
                <TableHead>{t("dossiers.event")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {t("dashboard.noRecentActivities")}
                  </TableCell>
                </TableRow>
              ) : (
                auditEvents.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground">
                      {formatEventTime(event.created_at)}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {event.dossiers?.display_id || event.dossiers?.ref_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">{event.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
