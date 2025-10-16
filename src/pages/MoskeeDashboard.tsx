import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X, Calendar, AlertCircle, MessageSquare, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, isToday, addDays, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "@/components/KPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

type MosqueService = {
  id: string;
  dossier_id: string;
  requested_at: string;
  requested_date: string | null;
  prayer: string | null;
  status: string;
  dossiers: {
    ref_number: string;
    deceased_name: string;
  };
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500 text-white",
  CONFIRMED: "bg-green-500 text-white",
  DECLINED: "bg-red-500 text-white",
  PROPOSED: "bg-amber-500 text-white",
};

// Moved to translation keys - prayers remain same (proper names)

export default function MoskeeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<MosqueService[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("case_events")
        .select("*, dossiers(ref_number, deceased_name, display_id)")
        .eq("event_type", "MOSQUE_SERVICE")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        // Map case_events to MosqueService format
        const mapped = data.map(event => ({
          id: event.id,
          dossier_id: event.dossier_id,
          requested_at: event.created_at,
          requested_date: event.scheduled_at,
          prayer: (event.metadata as any)?.prayer_time || null,
          status: event.status,
          dossiers: event.dossiers
        }));
        setServices(mapped as any);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickConfirm = async (serviceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const service = services.find(s => s.id === serviceId);

      const { error } = await supabase
        .from("case_events")
        .update({ status: "PLANNED" })
        .eq("id", serviceId);

      if (error) throw error;

      if (service) {
        await supabase.from("audit_events").insert({
          event_type: "mosque.confirm",
          user_id: session.user.id,
          dossier_id: service.dossier_id,
          description: `Moskee bevestigde janāza-gebed voor ${service.dossiers.deceased_name}`,
          metadata: {
            case_event_id: serviceId,
            scheduled_at: service.requested_date,
          },
        });
      }

      toast({
        title: t("mosque.dashboard.confirmed"),
        description: t("mosque.dashboard.confirmedDesc"),
      });

      fetchServices();
    } catch (error) {
      console.error("Error confirming service:", error);
      toast({
        title: t("mosque.dashboard.confirmError"),
        description: t("mosque.dashboard.confirmError"),
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedService || !rejectReason.trim()) {
      toast({
        title: t("toast.error.generic"),
        description: t("mosque.dashboard.rejectReasonRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const service = services.find(s => s.id === selectedService);

      const { error } = await supabase
        .from("case_events")
        .update({ 
          status: "CANCELLED",
          notes: (service as any)?.notes ? `${(service as any).notes}\n\nAfwijzing: ${rejectReason}` : `Afwijzing: ${rejectReason}`
        })
        .eq("id", selectedService);

      if (error) throw error;

      if (service) {
        await supabase.from("audit_events").insert({
          event_type: "mosque.decline",
          user_id: session.user.id,
          dossier_id: service.dossier_id,
          description: `Moskee weigerde janāza-gebed voor ${service.dossiers.deceased_name}`,
          metadata: {
            case_event_id: selectedService,
            scheduled_at: service.requested_date,
            decline_reason: rejectReason,
          },
        });
      }

      toast({
        title: t("mosque.dashboard.rejected"),
        description: t("mosque.dashboard.rejectedDesc"),
      });

      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error("Error rejecting service:", error);
      toast({
        title: t("mosque.dashboard.rejectError"),
        description: t("mosque.dashboard.rejectError"),
        variant: "destructive",
      });
    }
  };

  // KPI calculations
  const openRequests = services.filter(s => !["PLANNED", "STARTED", "DONE", "CANCELLED"].includes(s.status)).length;
  const todayPrayers = services.filter(s => 
    ["PLANNED", "STARTED"].includes(s.status) && 
    s.requested_date && 
    isToday(new Date(s.requested_date))
  ).length;
  
  const blockedDays = 0; // TODO: Fetch from mosque_day_blocks
  
  const thisWeekCount = services.filter(s => {
    if (!s.requested_date) return false;
    const date = new Date(s.requested_date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return date >= weekStart && date < weekEnd;
  }).length;

  // Active requests (not PLANNED/STARTED/DONE/CANCELLED)
  const activeRequests = services
    .filter(s => !["PLANNED", "STARTED", "DONE", "CANCELLED"].includes(s.status))
    .filter(s =>
      s.dossiers.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Upcoming confirmed prayers (today + 3 days)
  const upcomingPrayers = services
    .filter(s => {
      if (!["PLANNED", "STARTED"].includes(s.status) || !s.requested_date) return false;
      const date = new Date(s.requested_date);
      const now = new Date();
      const threeDaysFromNow = addDays(now, 3);
      return date >= startOfDay(now) && date <= endOfDay(threeDaysFromNow);
    })
    .sort((a, b) => {
      if (!a.requested_date || !b.requested_date) return 0;
      return new Date(a.requested_date).getTime() - new Date(b.requested_date).getTime();
    });

  if (loading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {t("mosque.dashboard.title")}
              </h1>
            </div>
            <Button onClick={() => navigate("/moskee/beschikbaarheid")} variant="outline" size="sm" className="h-9">
              {t("mosque.dashboard.availability")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <KPICard title={t("mosque.dashboard.openRequests")} value={openRequests} icon={AlertCircle} />
        <KPICard title={t("mosque.dashboard.todayPrayers")} value={todayPrayers} icon={Calendar} />
        <KPICard title={t("mosque.dashboard.blockedDays")} value={blockedDays} icon={X} />
        <KPICard title={t("mosque.dashboard.thisWeek")} value={thisWeekCount} icon={Clock} />
      </div>

      {/* Active Requests */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("mosque.dashboard.activeRequests")}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.dossierCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.deceasedCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.requestedPrayerCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.dateCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.statusCol")}</TableHead>
                  <TableHead className="text-right font-medium text-sm">{t("mosque.dashboard.actionsCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRequests.map((service) => (
                  <TableRow key={service.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">
                      {service.dossiers.ref_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {service.dossiers.deceased_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {service.prayer || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {service.requested_date
                        ? format(new Date(service.requested_date), "EEE dd MMM", { locale: nl })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t("mosque.dashboard.waitingStatus")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleQuickConfirm(service.id)}
                          className="bg-green-600 hover:bg-green-700 h-8"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {t("mosque.dashboard.confirmBtn")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedService(service.id);
                            setRejectDialogOpen(true);
                          }}
                          className="h-8"
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t("mosque.dashboard.rejectBtn")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      {t("mosque.dashboard.noOpenRequests")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Planning - Upcoming Prayers */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">{t("mosque.dashboard.planningTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.dateCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.prayerCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.dossierCol")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("mosque.dashboard.deceasedCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPrayers.map((service) => (
                  <TableRow key={service.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                      {service.requested_date
                        ? format(new Date(service.requested_date), "EEE dd MMM", { locale: nl })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {service.prayer || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {service.dossiers.ref_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {service.dossiers.deceased_name}
                    </TableCell>
                  </TableRow>
                ))}
                {upcomingPrayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      {t("mosque.dashboard.noPlannedServices")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("mosque.dashboard.recentActivityTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            {services.slice(0, 5).map((service, idx) => (
              <div 
                key={service.id} 
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors",
                  idx !== 4 && "border-b"
                )}
              >
                <div className="text-xs text-muted-foreground whitespace-nowrap min-w-[50px]">
                  {format(new Date(service.requested_at), "HH:mm", { locale: nl })}
                </div>
                <div className="flex-1 text-sm">
                  {service.status === "PLANNED" ? (
                    <span>{t("mosque.dashboard.prayerPlanned")} {service.dossiers.ref_number}</span>
                  ) : service.status === "DONE" ? (
                    <span>{t("mosque.dashboard.prayerDone")} {service.dossiers.ref_number}</span>
                  ) : service.status === "CANCELLED" ? (
                    <span>{t("mosque.dashboard.prayerCancelled")} {service.dossiers.ref_number}</span>
                  ) : (
                    <span>{t("mosque.dashboard.newRequestReceived")} ({service.dossiers.ref_number})</span>
                  )}
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("mosque.dashboard.noActivity")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mosque.dashboard.rejectDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("mosque.dashboard.rejectDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={t("placeholders.rejectionReason")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleReject} variant="destructive">
              {t("mosque.dashboard.rejectBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
