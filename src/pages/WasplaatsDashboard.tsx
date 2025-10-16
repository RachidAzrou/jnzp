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
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
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
    return <div className="p-6">{t("common.loading")}</div>;
  }

  const getCurrentDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(now);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentDate()}</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("wasplaats.dashboard.title")}</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/wasplaats/koelcellen")} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t("wasplaats.dashboard.coolCells")}
              </Button>
              <Button onClick={() => navigate("/wasplaats/reservaties/nieuw")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("wasplaats.dashboard.newReservation")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("wasplaats.dashboard.totalCells")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacityStats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("wasplaats.dashboard.free")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{capacityStats.free}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("wasplaats.dashboard.reserved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{capacityStats.reserved}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("wasplaats.dashboard.occupied")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{capacityStats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("wasplaats.dashboard.outOfService")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{capacityStats.outOfService}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="week">{t("wasplaats.dashboard.weekOverview")}</TabsTrigger>
            <TabsTrigger value="day">{t("wasplaats.dashboard.dayDetail")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="week" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t("wasplaats.dashboard.weekOf")} {format(currentWeek, "d MMMM yyyy", { locale: nl })}
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
                {t("wasplaats.dashboard.today")}
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
                {t("wasplaats.dashboard.today")}
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
