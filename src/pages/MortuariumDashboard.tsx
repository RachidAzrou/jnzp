import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, CheckCircle2, XCircle, Unlock, AlertTriangle, Refrigerator } from "lucide-react";
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
  cool_cells: { label: string } | null;
  dossiers: { display_id: string; deceased_name: string } | null;
};

export default function MortuariumDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (!userRole?.organization_id) return;

      // Fetch cool cells
      const { data: cellsData } = await supabase
        .from("cool_cells")
        .select("*")
        .eq("facility_org_id", userRole.organization_id)
        .order("label");

      if (cellsData) setCoolCells(cellsData);

      // Fetch today's reservations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: reservationsData } = await supabase
        .from("cool_cell_reservations")
        .select(`
          *,
          cool_cells(label),
          dossiers(display_id, deceased_name)
        `)
        .eq("facility_org_id", userRole.organization_id)
        .gte("start_at", today.toISOString())
        .lt("start_at", tomorrow.toISOString())
        .order("start_at");

      if (reservationsData) setTodayReservations(reservationsData as any);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Fout bij laden",
        description: "Kon dashboard gegevens niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("cool_cell_reservations")
        .update({ status: "CONFIRMED" })
        .eq("id", reservationId);

      if (error) throw error;

      toast({
        title: "Bevestigd",
        description: "Reservering is bevestigd",
      });

      fetchData();
    } catch (error) {
      console.error("Error confirming reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet bevestigen",
        variant: "destructive",
      });
    }
  };

  const releaseReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("cool_cell_reservations")
        .update({ status: "CANCELLED", note: "Vrijgegeven door mortuarium" })
        .eq("id", reservationId);

      if (error) throw error;

      toast({
        title: "Vrijgegeven",
        description: "Koelcel is vrijgegeven",
      });

      fetchData();
    } catch (error) {
      console.error("Error releasing reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet vrijgeven",
        variant: "destructive",
      });
    }
  };

  const cancelReservation = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden op voor annulering",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("cool_cell_reservations")
        .update({ 
          status: "CANCELLED", 
          note: `Geannuleerd: ${cancelReason}` 
        })
        .eq("id", selectedReservationId);

      if (error) throw error;

      toast({
        title: "Geannuleerd",
        description: "Reservering is geannuleerd",
      });

      setCancelReason("");
      setSelectedReservationId("");
      fetchData();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast({
        title: "Fout",
        description: "Kon reservering niet annuleren",
        variant: "destructive",
      });
    }
  };

  const capacityStats = {
    total: coolCells.length,
    free: coolCells.filter((c) => c.status === "FREE").length,
    occupied: coolCells.filter((c) => c.status === "OCCUPIED").length,
    outOfService: coolCells.filter((c) => c.status === "OUT_OF_SERVICE").length,
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

  return (
    <div className="space-y-6 pb-8">
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
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vrij
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {capacityStats.free}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bezet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {capacityStats.occupied}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buiten Dienst
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {capacityStats.outOfService}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Reservations */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">Vandaag ({format(new Date(), "EEEE d MMMM", { locale: nl })})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayReservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm">Geen reserveringen voor vandaag</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Koelcel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notitie</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(reservation.start_at), "HH:mm", { locale: nl })} -{" "}
                        {format(parseISO(reservation.end_at), "HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {reservation.dossiers?.deceased_name || "Onbekend"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {reservation.dossiers?.display_id || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reservation.cool_cells?.label || "-"}
                      </TableCell>
                      <TableCell>
                        {reservation.status === "PENDING" && (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            In afwachting
                          </Badge>
                        )}
                        {reservation.status === "CONFIRMED" && (
                          <Badge variant="default">Bevestigd</Badge>
                        )}
                        {reservation.status === "CANCELLED" && (
                          <Badge variant="destructive">Geannuleerd</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {reservation.note || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {reservation.status === "PENDING" && (
                            <Button
                              size="sm"
                              onClick={() => confirmReservation(reservation.id)}
                              className="gap-1 h-8"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Bevestigen
                            </Button>
                          )}
                          {reservation.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => releaseReservation(reservation.id)}
                              className="gap-1 h-8"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              Vrijgeven
                            </Button>
                          )}
                          {(reservation.status === "PENDING" || reservation.status === "CONFIRMED") && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedReservationId(reservation.id)}
                                  className="gap-1 h-8"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Annuleren
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reservering annuleren</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Geef een reden op voor de annulering
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2 py-4">
                                  <Label htmlFor="reason">Reden *</Label>
                                  <Textarea
                                    id="reason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Bijv. Verkeerde datum, planning gewijzigd..."
                                    rows={3}
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => {
                                    setCancelReason("");
                                    setSelectedReservationId("");
                                  }}>
                                    Terug
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={cancelReservation}>
                                    Annuleren
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
