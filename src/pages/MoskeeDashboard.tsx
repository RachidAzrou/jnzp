import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  CONFIRMED: "Bevestigd",
  DECLINED: "Niet mogelijk",
  PROPOSED: "Voorstel gedaan",
};

const prayerLabels: Record<string, string> = {
  FAJR: "Fajr",
  DHUHR: "Dhuhr",
  ASR: "Asr",
  MAGHRIB: "Maghrib",
  ISHA: "Isha",
  JUMUAH: "Jumu'ah",
};

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
        .from("mosque_services")
        .select("*, dossiers(ref_number, deceased_name)")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      if (data) setServices(data as any);
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
        .from("mosque_services")
        .update({ status: "CONFIRMED" })
        .eq("id", serviceId);

      if (error) throw error;

      if (service) {
        await supabase.from("audit_events").insert({
          event_type: "mosque.confirm",
          user_id: session.user.id,
          dossier_id: service.dossier_id,
          description: `Moskee bevestigde janāza-gebed voor ${service.dossiers.deceased_name}`,
          metadata: {
            mosque_service_id: serviceId,
            prayer: service.prayer,
            requested_date: service.requested_date,
          },
        });
      }

      toast({
        title: "Bevestigd",
        description: "Aanvraag is bevestigd",
      });

      fetchServices();
    } catch (error) {
      console.error("Error confirming service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet bevestigen",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedService || !rejectReason.trim()) {
      toast({
        title: "Fout",
        description: "Geef een reden op voor weigering",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const service = services.find(s => s.id === selectedService);

      const { error } = await supabase
        .from("mosque_services")
        .update({ 
          status: "DECLINED",
          decline_reason: rejectReason 
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
            mosque_service_id: selectedService,
            prayer: service.prayer,
            requested_date: service.requested_date,
            decline_reason: rejectReason,
          },
        });
      }

      toast({
        title: "Geweigerd",
        description: "Aanvraag is geweigerd",
      });

      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error("Error rejecting service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet weigeren",
        variant: "destructive",
      });
    }
  };

  // KPI calculations
  const openRequests = services.filter(s => s.status === "PENDING" || s.status === "OPEN").length;
  const todayPrayers = services.filter(s => 
    s.status === "CONFIRMED" && 
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

  // Active requests (PENDING/OPEN)
  const activeRequests = services
    .filter(s => s.status === "PENDING" || s.status === "OPEN")
    .filter(s =>
      s.dossiers.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Upcoming confirmed prayers (today + 3 days)
  const upcomingPrayers = services
    .filter(s => {
      if (s.status !== "CONFIRMED" || !s.requested_date) return false;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold">{t("mosque.dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("mosque.dashboard.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/moskee/beschikbaarheid")} variant="outline" size="sm">
              {t("mosque.dashboard.availability")}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t("mosque.dashboard.openRequests")}
            value={openRequests}
            icon={AlertCircle}
          />
          <KPICard
            title={t("mosque.dashboard.todayPrayers")}
            value={todayPrayers}
            icon={Calendar}
          />
          <KPICard
            title={t("mosque.dashboard.blockedDays")}
            value={blockedDays}
            icon={X}
          />
          <KPICard
            title={t("mosque.dashboard.thisWeek")}
            value={thisWeekCount}
            icon={Clock}
          />
        </div>

        {/* Active Requests */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">{t("mosque.dashboard.activeRequests")}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-sm">Dossier</TableHead>
                  <TableHead className="font-medium text-sm">Overledene</TableHead>
                  <TableHead className="font-medium text-sm">Gevraagd gebed</TableHead>
                  <TableHead className="font-medium text-sm">Datum</TableHead>
                  <TableHead className="font-medium text-sm">Status</TableHead>
                  <TableHead className="text-right font-medium text-sm">Acties</TableHead>
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
                      {service.prayer ? prayerLabels[service.prayer] || service.prayer : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {service.requested_date
                        ? format(new Date(service.requested_date), "EEE dd MMM", { locale: nl })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        Wachten
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
                          Bevestig
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
                          Weiger
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Geen openstaande aanvragen
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Planning - Upcoming Prayers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Planning komende dagen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-sm">Datum</TableHead>
                  <TableHead className="font-medium text-sm">Gebed</TableHead>
                  <TableHead className="font-medium text-sm">Dossier</TableHead>
                  <TableHead className="font-medium text-sm">Overledene</TableHead>
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
                      {service.prayer ? prayerLabels[service.prayer] || service.prayer : "—"}
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
                      Geen geplande janāza's
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recente activiteit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.slice(0, 5).map((service) => (
                <div key={service.id} className="flex items-start gap-3 text-sm">
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(service.requested_at), "HH:mm", { locale: nl })}
                  </div>
                  <div className="flex-1">
                    {service.status === "CONFIRMED" ? (
                      <span>Gebed bevestigd voor dossier {service.dossiers.ref_number}</span>
                    ) : service.status === "DECLINED" ? (
                      <span>Gebed geweigerd voor dossier {service.dossiers.ref_number}</span>
                    ) : (
                      <span>Nieuwe aanvraag ontvangen ({service.dossiers.ref_number})</span>
                    )}
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Geen recente activiteit
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanvraag weigeren</DialogTitle>
            <DialogDescription>
              Geef een reden op waarom deze janāza-aanvraag niet mogelijk is.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reden voor weigering..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Weigeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
