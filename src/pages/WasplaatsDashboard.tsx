import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { WasplaatsWeekView } from "@/components/WasplaatsWeekView";
import { WasplaatsDayView } from "@/components/WasplaatsDayView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  cool_cell_id: string | null;
  status: string;
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
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

      if (cellsRes.data) setCoolCells(cellsRes.data.sort((a, b) => a.label.localeCompare(b.label, 'nl', { numeric: true })));
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

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mortuarium Dashboard</h1>
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

      <Tabs defaultValue="week" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="week">Weekoverzicht</TabsTrigger>
            <TabsTrigger value="day">Dag-detail</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="week" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Week van {format(currentWeek, "d MMMM yyyy", { locale: nl })}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Vandaag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <WasplaatsWeekView
            coolCells={coolCells}
            reservations={reservations}
            dayBlocks={dayBlocks}
            currentWeek={currentWeek}
          />
        </TabsContent>

        <TabsContent value="day" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: nl })}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Vandaag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <WasplaatsDayView
            coolCells={coolCells}
            reservations={reservations}
            selectedDate={selectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
