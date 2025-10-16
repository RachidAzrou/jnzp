import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, CheckCircle2, XCircle, Unlock, AlertTriangle, Refrigerator } from "lucide-react";
import { MortuariumCalendarView } from "@/components/wasplaats/MortuariumCalendarView";
import { format, isToday, parseISO } from "date-fns";
import { nl, enGB, fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
type CoolCell = {
  id: string;
  label: string;
  status: string;
};
type Reservation = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  cool_cell_id: string;
  note: string | null;
  dossier_id: string;
  cool_cells: {
    label: string;
  } | null;
  dossiers: {
    display_id: string;
    deceased_name: string;
  } | null;
};
type PendingRequest = {
  id: string;
  start_at: string;
  end_at: string;
  note: string | null;
  cool_cells: {
    label: string;
  } | null;
  dossiers: {
    display_id: string;
    deceased_name: string;
  } | null;
};
export default function MortuariumDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  useEffect(() => {
    fetchData();
    fetchUserName();
  }, []);

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || '');
        }
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const fetchData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: userRole
      } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).eq("role", "mortuarium").single();
      if (!userRole?.organization_id) return;

      // Fetch cool cells
      const {
        data: cellsData
      } = await supabase.from("cool_cells").select("*").eq("facility_org_id", userRole.organization_id).order("label");
      if (cellsData) setCoolCells(cellsData);

      // Fetch today's reservations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const {
        data: reservationsData
      } = await supabase.from("cool_cell_reservations").select(`
          *,
          cool_cells(label),
          dossiers(display_id, deceased_name)
        `).eq("facility_org_id", userRole.organization_id).gte("start_at", today.toISOString()).lt("start_at", tomorrow.toISOString()).order("start_at");
      if (reservationsData) setTodayReservations(reservationsData as any);

      // Fetch all pending requests
      const {
        data: pendingData
      } = await supabase.from("cool_cell_reservations").select(`
          *,
          cool_cells(label),
          dossiers(display_id, deceased_name)
        `).eq("facility_org_id", userRole.organization_id).eq("status", "PENDING").order("start_at");
      if (pendingData) setPendingRequests(pendingData as any);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
        description: t("mortuarium.errors.loadDashboard"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const confirmReservation = async (reservationId: string) => {
    try {
      const {
        error
      } = await supabase.from("cool_cell_reservations").update({
        status: "CONFIRMED"
      }).eq("id", reservationId);
      if (error) throw error;
      toast({
        title: t("common.success"),
        description: t("mortuarium.dashboard.reservationConfirmed")
      });
      fetchData();
    } catch (error) {
      console.error("Error confirming reservation:", error);
      toast({
        title: t("common.error"),
        description: t("mortuarium.errors.confirmError"),
        variant: "destructive"
      });
    }
  };
  const releaseReservation = async (reservationId: string) => {
    try {
      const {
        error
      } = await supabase.from("cool_cell_reservations").update({
        status: "CANCELLED",
        note: t("mortuarium.dashboard.releasedByMortuarium")
      }).eq("id", reservationId);
      if (error) throw error;
      toast({
        title: t("common.success"),
        description: t("mortuarium.dashboard.cellReleased")
      });
      fetchData();
    } catch (error) {
      console.error("Error releasing reservation:", error);
      toast({
        title: t("common.error"),
        description: t("mortuarium.errors.releaseError"),
        variant: "destructive"
      });
    }
  };
  const cancelReservation = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: t("mortuarium.dashboard.reasonRequired"),
        description: t("mortuarium.dashboard.provideReason"),
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from("cool_cell_reservations").update({
        status: "CANCELLED",
        note: `${t("mortuarium.dashboard.cancelled")}: ${cancelReason}`
      }).eq("id", selectedReservationId);
      if (error) throw error;
      toast({
        title: t("common.success"),
        description: t("mortuarium.dashboard.reservationCancelled")
      });
      setCancelReason("");
      setSelectedReservationId("");
      fetchData();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast({
        title: t("common.error"),
        description: t("mortuarium.errors.cancelError"),
        variant: "destructive"
      });
    }
  };
  const capacityStats = {
    total: coolCells.length,
    free: coolCells.filter(c => c.status === "FREE").length,
    occupied: coolCells.filter(c => c.status === "OCCUPIED").length,
    outOfService: coolCells.filter(c => c.status === "OUT_OF_SERVICE").length
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>;
  }
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'en': return enGB;
      default: return nl;
    }
  };

  const getCurrentDate = () => {
    const locale = i18n.language || 'nl';
    const localeMap: { [key: string]: string } = {
      'nl': 'nl-NL',
      'fr': 'fr-FR',
      'en': 'en-GB'
    };
    
    return new Date().toLocaleDateString(localeMap[locale] || 'nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return <div className="space-y-6 pb-8">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t("dashboard.welcomeBack")}, {userName}
            </h1>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("mortuarium.dashboard.totalCells")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacityStats.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow border-success/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success"></div>
              {t("mortuarium.status.free")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {capacityStats.free}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive"></div>
              {t("mortuarium.status.occupied")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {capacityStats.occupied}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
              {t("mortuarium.status.out_of_service")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {capacityStats.outOfService}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && <Card className="animate-fade-in border-warning/30 bg-gradient-to-r from-card to-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t("mortuarium.dashboard.incomingRequests")} ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("mortuarium.dashboard.dateTime")}</TableHead>
                    <TableHead>{t("mortuarium.dashboard.dossier")}</TableHead>
                    <TableHead>{t("mortuarium.dashboard.coolCell")}</TableHead>
                    <TableHead>{t("mortuarium.dashboard.note")}</TableHead>
                    <TableHead className="text-right">{t("mortuarium.dashboard.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map(request => <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{format(parseISO(request.start_at), "EEE d MMM yyyy", {
                        locale: getDateLocale()
                      })}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(request.start_at), "HH:mm", {
                        locale: getDateLocale()
                      })} -{" "}
                            {format(parseISO(request.end_at), "HH:mm", {
                        locale: getDateLocale()
                      })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {request.dossiers?.deceased_name || t("common.unknown")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.dossiers?.display_id || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.cool_cells?.label || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {request.note || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => confirmReservation(request.id)} className="gap-1 h-8">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("mortuarium.dashboard.confirm")}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" onClick={() => setSelectedReservationId(request.id)} className="gap-1 h-8">
                                <XCircle className="h-3.5 w-3.5" />
                                {t("mortuarium.dashboard.reject")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("mortuarium.dashboard.rejectRequest")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("mortuarium.dashboard.provideRejectionReason")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-2 py-4">
                                <Label htmlFor="reason">{t("mortuarium.dashboard.reason")} *</Label>
                                <Textarea id="reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t("placeholders.cancelReason")} rows={3} />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                            setCancelReason("");
                            setSelectedReservationId("");
                          }}>
                                  {t("common.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={cancelReservation}>
                                  {t("mortuarium.dashboard.reject")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>}

      {/* Calendar View */}
      <div className="animate-fade-in">
        <MortuariumCalendarView />
      </div>
    </div>;
}