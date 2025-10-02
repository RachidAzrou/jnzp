import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";

type CoolCell = {
  id: string;
  label: string;
  status: string;
};

type Reservation = {
  id: string;
  start_at: string;
  end_at: string;
  dossier_id: string;
};

type DayBlock = {
  id: string;
  date: string;
  reason: string;
};

export default function WasplaatsDashboard() {
  const navigate = useNavigate();
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dayBlocks, setDayBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cellsRes, reservationsRes, blocksRes] = await Promise.all([
        supabase.from("cool_cells").select("*"),
        supabase
          .from("cool_cell_reservations")
          .select("*")
          .gte("start_at", new Date().toISOString())
          .order("start_at"),
        supabase.from("facility_day_blocks").select("*"),
      ]);

      if (cellsRes.data) setCoolCells(cellsRes.data);
      if (reservationsRes.data) setReservations(reservationsRes.data);
      if (blocksRes.data) setDayBlocks(blocksRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const capacityStats = {
    total: coolCells.length,
    free: coolCells.filter((c) => c.status === "FREE").length,
    reserved: coolCells.filter((c) => c.status === "RESERVED").length,
    occupied: coolCells.filter((c) => c.status === "OCCUPIED").length,
    outOfService: coolCells.filter((c) => c.status === "OUT_OF_SERVICE").length,
  };

  const getWeekDays = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const weekDays = getWeekDays();

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Wasplaats Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/wasplaats/koelcellen")}>
            <Calendar className="h-4 w-4 mr-2" />
            Koelcellen
          </Button>
          <Button onClick={() => navigate("/wasplaats/reservaties/nieuw")} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Reservatie
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal Cellen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacityStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vrij</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{capacityStats.free}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gereserveerd</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{capacityStats.reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bezet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{capacityStats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Buiten Dienst</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{capacityStats.outOfService}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda (Deze Week)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Dag</th>
                  <th className="text-left p-2">Vrije Cellen</th>
                  <th className="text-left p-2">Reserveringen</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const dayReservations = reservations.filter(
                    (r) => format(new Date(r.start_at), "yyyy-MM-dd") === dayStr
                  );
                  const isBlocked = dayBlocks.some((b) => b.date === dayStr);

                  return (
                    <tr key={dayStr} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">
                        {format(day, "EEEE d MMM", { locale: nl })}
                      </td>
                      <td className="p-2">
                        {isBlocked ? "0" : capacityStats.free}/{capacityStats.total}
                      </td>
                      <td className="p-2">
                        {dayReservations.length > 0
                          ? dayReservations
                              .map((r) => `${format(new Date(r.start_at), "HH:mm")}-${format(new Date(r.end_at), "HH:mm")}`)
                              .join(", ")
                          : "-"}
                      </td>
                      <td className="p-2">
                        {isBlocked ? (
                          <span className="inline-flex items-center text-destructive">
                            <Ban className="h-4 w-4 mr-1" />
                            Geblokkeerd
                          </span>
                        ) : (
                          <span className="text-success">Beschikbaar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
