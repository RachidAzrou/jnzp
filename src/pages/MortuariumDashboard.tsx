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
import { nl } from "date-fns/locale";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  useEffect(() => {
    fetchData();
  }, []);
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
        title: "Fout bij laden",
        description: "Kon dashboard gegevens niet laden",
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
        title: "Bevestigd",
        description: "Reservering is bevestigd"
      });
      fetchData();
    } catch (error) {
      console.error("Error confirming reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet bevestigen",
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
        note: "Vrijgegeven door mortuarium"
      }).eq("id", reservationId);
      if (error) throw error;
      toast({
        title: "Vrijgegeven",
        description: "Koelcel is vrijgegeven"
      });
      fetchData();
    } catch (error) {
      console.error("Error releasing reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet vrijgeven",
        variant: "destructive"
      });
    }
  };
  const cancelReservation = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden op voor annulering",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from("cool_cell_reservations").update({
        status: "CANCELLED",
        note: `Geannuleerd: ${cancelReason}`
      }).eq("id", selectedReservationId);
      if (error) throw error;
      toast({
        title: "Geannuleerd",
        description: "Reservering is geannuleerd"
      });
      setCancelReason("");
      setSelectedReservationId("");
      fetchData();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet annuleren",
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
    return <div className="p-6">Laden...</div>;
  }
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('nl-NL', {
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
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mortuarium Dashboard</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/mortuarium/koelcellen")} variant="outline" size="sm" className="h-9">
                <Calendar className="h-4 w-4 mr-2" />
                Koelcellen
              </Button>
              <Button onClick={() => navigate("/mortuarium/ad-hoc")} size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Ad-hoc Intake
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Cellen
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
              Vrij
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
              Bezet
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
              Buiten Dienst
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
              Inkomende Aanvragen ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum & Tijd</TableHead>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Koelcel</TableHead>
                    <TableHead>Notitie</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map(request => <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{format(parseISO(request.start_at), "EEE d MMM yyyy", {
                        locale: nl
                      })}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(request.start_at), "HH:mm", {
                        locale: nl
                      })} -{" "}
                            {format(parseISO(request.end_at), "HH:mm", {
                        locale: nl
                      })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {request.dossiers?.deceased_name || "Onbekend"}
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
                            Bevestigen
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" onClick={() => setSelectedReservationId(request.id)} className="gap-1 h-8">
                                <XCircle className="h-3.5 w-3.5" />
                                Weigeren
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aanvraag weigeren</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Geef een reden op voor de weigering
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-2 py-4">
                                <Label htmlFor="reason">Reden *</Label>
                                <Textarea id="reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t("placeholders.cancelReason")} rows={3} />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                            setCancelReason("");
                            setSelectedReservationId("");
                          }}>
                                  Terug
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={cancelReservation}>
                                  Weigeren
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