import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format, addDays, startOfWeek, startOfDay, endOfDay, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Search, Refrigerator } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoolCellReservationSheet } from "../CoolCellReservationSheet";

type CoolCell = {
  id: string;
  label: string;
  status: string;
};

type Reservation = {
  id: string;
  cool_cell_id: string;
  start_at: string;
  end_at: string;
  status: string;
  dossier: {
    deceased_name: string;
    display_id: string;
  } | null;
  organization: {
    name: string;
  } | null;
};

type ViewMode = "day" | "week";

const statusColors: Record<string, string> = {
  FREE: "bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:shadow-md transition-all duration-300",
  PENDING: "bg-gradient-to-br from-warning/5 to-warning/15 border-warning/30 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
  CONFIRMED: "bg-gradient-to-br from-info/5 to-info/15 border-info/30 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
  OCCUPIED: "bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
  OUT_OF_SERVICE: "bg-gradient-to-br from-muted to-muted/50 border-border opacity-75",
};

// Status labels will be translated inline

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export function MortuariumCalendarView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>("all");
  const [selectedFDFilter, setSelectedFDFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [fdOrganizations, setFdOrganizations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchUserOrg();
  }, []);

  useEffect(() => {
    if (userOrgId) {
      fetchCoolCells();
      fetchReservations();
      fetchFDOrganizations();
    }
  }, [userOrgId, currentDate, viewMode]);

  const fetchUserOrg = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (userRole?.organization_id) {
        setUserOrgId(userRole.organization_id);
      }
    } catch (error) {
      console.error("Error fetching user org:", error);
    }
  };

  const fetchCoolCells = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cool_cells")
        .select("*")
        .eq("facility_org_id", userOrgId)
        .order("label");

      if (error) throw error;
      if (data) setCoolCells(data);
    } catch (error) {
      console.error("Error fetching cool cells:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const startDate = viewMode === "day"
        ? startOfDay(currentDate)
        : startOfWeek(currentDate, { weekStartsOn: 1 });
      const endDate = viewMode === "day"
        ? endOfDay(currentDate)
        : endOfDay(addDays(startDate, 6));

      const { data, error } = await supabase
        .from("cool_cell_reservations")
        .select(`
          *,
          dossier:dossiers(deceased_name, display_id),
          organization:organizations!cool_cell_reservations_facility_org_id_fkey(name)
        `)
        .eq("facility_org_id", userOrgId)
        .or(`and(start_at.lte.${endDate.toISOString()},end_at.gte.${startDate.toISOString()})`);

      if (error) throw error;
      if (data) setReservations(data as any);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const fetchFDOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("type", "FUNERAL_DIRECTOR")
        .order("name");

      if (error) throw error;
      if (data) setFdOrganizations(data);
    } catch (error) {
      console.error("Error fetching FD organizations:", error);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) =>
      viewMode === "day"
        ? addDays(prev, direction === "next" ? 1 : -1)
        : addDays(prev, direction === "next" ? 7 : -7)
    );
  };

  const getReservationForCellAndTime = (cellId: string, date: Date, hour: number) => {
    return reservations.find((r) => {
      if (r.cool_cell_id !== cellId) return false;
      const startDate = new Date(r.start_at);
      const endDate = new Date(r.end_at);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return startDate < slotEnd && endDate > slotStart;
    });
  };

  const filteredCells = coolCells.filter((cell) =>
    selectedCellFilter === "all" || cell.id === selectedCellFilter
  );

  const filteredReservations = reservations.filter((res) => {
    const matchesFD = selectedFDFilter === "all" || res.organization?.name === selectedFDFilter;
    const matchesSearch = searchQuery === "" ||
      res.dossier?.deceased_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.dossier?.display_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFD && matchesSearch;
  });

  const renderDayView = () => {
    return (
      <div className="overflow-auto rounded-lg border border-border/50">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-muted/80 to-muted/40">
              <th className="border-r border-border/50 p-4 font-semibold text-sm text-left min-w-[100px] sticky left-0 z-10 bg-muted/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {t("mortuarium.calendar.time")}
                </div>
              </th>
              {filteredCells.map((cell, index) => (
                <th
                  key={cell.id}
                  className={cn(
                    "border-r border-border/50 p-4 font-semibold text-sm text-center min-w-[200px] bg-muted/50 backdrop-blur-sm",
                    index === filteredCells.length - 1 && "border-r-0"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Refrigerator className="h-4 w-4 text-primary" />
                    {cell.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, hourIndex) => (
              <tr key={hour} className="group hover:bg-muted/20 transition-colors duration-200">
                <td className={cn(
                  "border-r border-b border-border/50 p-4 font-medium text-sm bg-muted/30 sticky left-0 z-10 group-hover:bg-muted/50 transition-colors duration-200"
                )}>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors duration-200"></div>
                    <span className="text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
                  </div>
                </td>
                {filteredCells.map((cell, cellIndex) => {
                  const reservation = getReservationForCellAndTime(cell.id, currentDate, hour);
                  const isVisible = filteredReservations.includes(reservation as any);
                  const status = reservation && isVisible ? reservation.status : cell.status === "OUT_OF_SERVICE" ? "OUT_OF_SERVICE" : "FREE";

                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "border-r border-b border-border/50 p-3 min-h-[80px] align-top",
                        statusColors[status],
                        cellIndex === filteredCells.length - 1 && "border-r-0"
                      )}
                      onClick={() => {
                        if (reservation && isVisible) {
                          setSelectedReservationId(reservation.id);
                          setIsSheetOpen(true);
                        }
                      }}
                    >
                      {reservation && isVisible && (
                        <div className="flex flex-col gap-2 animate-fade-in">
                          <Badge className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg w-fit">
                            {t(`mortuarium.status.${reservation.status.toLowerCase()}`)}
                          </Badge>
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">
                              {reservation.organization?.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate font-medium">
                              {reservation.dossier?.deceased_name || t("common.unknown")}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded w-fit">
                              {format(new Date(reservation.start_at), "HH:mm")} -{" "}
                              {format(new Date(reservation.end_at), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      )}
                      {cell.status === "OUT_OF_SERVICE" && !reservation && (
                        <Badge className="text-xs bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0 shadow-md">
                          {t("mortuarium.status.out_of_service")}
                        </Badge>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="overflow-auto rounded-lg border border-border/50">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-muted/80 to-muted/40">
              <th className="border-r border-border/50 p-4 font-semibold text-sm text-left min-w-[120px] sticky left-0 z-10 bg-muted/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Refrigerator className="h-4 w-4 text-muted-foreground" />
                  {t("mortuarium.calendar.coolCell")}
                </div>
              </th>
              {weekDays.map((day, index) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-border/50 p-4 font-semibold text-center min-w-[160px] bg-muted/50 backdrop-blur-sm",
                    index === weekDays.length - 1 && "border-r-0"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      {format(day, "EEEE", { locale: nl })}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {format(day, "d MMM", { locale: nl })}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCells.map((cell, cellIndex) => (
              <tr key={cell.id} className="group hover:bg-muted/20 transition-colors duration-200">
                <td className={cn(
                  "border-r border-b border-border/50 p-4 font-semibold text-sm bg-muted/30 sticky left-0 z-10 group-hover:bg-muted/50 transition-colors duration-200"
                )}>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors duration-200"></div>
                    {cell.label}
                  </div>
                </td>
                {weekDays.map((day, dayIndex) => {
                  const dayReservations = filteredReservations.filter((r) =>
                    r.cool_cell_id === cell.id &&
                    isSameDay(new Date(r.start_at), day)
                  );
                  const reservation = dayReservations[0];
                  const status = reservation ? reservation.status : cell.status === "OUT_OF_SERVICE" ? "OUT_OF_SERVICE" : "FREE";

                  return (
                    <td
                      key={day.toISOString()}
                      className={cn(
                        "border-r border-b border-border/50 p-3 align-top min-h-[100px]",
                        statusColors[status],
                        dayIndex === weekDays.length - 1 && "border-r-0"
                      )}
                      onClick={() => {
                        if (reservation) {
                          setSelectedReservationId(reservation.id);
                          setIsSheetOpen(true);
                        }
                      }}
                    >
                      {reservation ? (
                        <div className="flex flex-col gap-2 animate-fade-in">
                          <Badge className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg w-fit">
                            {t(`mortuarium.status.${reservation.status.toLowerCase()}`)}
                          </Badge>
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {reservation.organization?.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate font-medium">
                              {reservation.dossier?.deceased_name || t("common.unknown")}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded w-fit">
                              {format(new Date(reservation.start_at), "HH:mm")} -{" "}
                              {format(new Date(reservation.end_at), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      ) : cell.status === "OUT_OF_SERVICE" ? (
                        <Badge className="text-xs bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0 shadow-md">
                          {t("mortuarium.status.out_of_service")}
                        </Badge>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <span>{t("mortuarium.calendar.title")}</span>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 shadow-sm">
                <Button
                  size="sm"
                  variant={viewMode === "day" ? "default" : "ghost"}
                  onClick={() => setViewMode("day")}
                  className="font-medium transition-all duration-200"
                >
                  {t("mortuarium.calendar.day")}
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "default" : "ghost"}
                  onClick={() => setViewMode("week")}
                  className="font-medium transition-all duration-200"
                >
                  {t("mortuarium.calendar.week")}
                </Button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50 shadow-sm">
                <Button size="sm" variant="ghost" onClick={() => navigateDate("prev")} className="hover:bg-background">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[220px] text-center px-2">
                  {viewMode === "day"
                    ? format(currentDate, "d MMMM yyyy", { locale: nl })
                    : `Week ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: nl })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "d MMM yyyy", { locale: nl })}`
                  }
                </span>
                <Button size="sm" variant="ghost" onClick={() => navigateDate("next")} className="hover:bg-background">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())} className="ml-2 font-medium">
                  {t("mortuarium.calendar.today")}
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("mortuarium.calendar.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
                />
              </div>
            </div>

            <Select value={selectedCellFilter} onValueChange={setSelectedCellFilter}>
              <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
                <SelectValue placeholder={t("mortuarium.calendar.allCells")} />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all">{t("mortuarium.calendar.allCells")}</SelectItem>
                {coolCells.map((cell) => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFDFilter} onValueChange={setSelectedFDFilter}>
              <SelectTrigger className="w-[220px] bg-background/50 border-border/50">
                <SelectValue placeholder={t("mortuarium.calendar.allFDs")} />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all">{t("mortuarium.calendar.allFDs")}</SelectItem>
                {fdOrganizations.map((org) => (
                  <SelectItem key={org.id} value={org.name}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            viewMode === "day" ? renderDayView() : renderWeekView()
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-200 shadow-sm"></div>
              <span className="font-medium">{t("mortuarium.status.free")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-200 shadow-sm"></div>
              <span className="font-medium">{t("mortuarium.status.pending")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 shadow-sm"></div>
              <span className="font-medium">{t("mortuarium.status.confirmed")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-100 to-red-200/50 border-2 border-red-300 shadow-sm"></div>
              <span className="font-medium">{t("mortuarium.status.occupied")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-gray-100 to-gray-200/50 border-2 border-gray-300 shadow-sm"></div>
              <span className="font-medium">{t("mortuarium.status.out_of_service")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CoolCellReservationSheet
        reservationId={selectedReservationId}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  );
}
