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
import { ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
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
  FREE: "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-800",
  PENDING: "bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800 cursor-pointer hover:bg-orange-200",
  CONFIRMED: "bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-800 cursor-pointer hover:bg-red-200",
  OCCUPIED: "bg-red-200 dark:bg-red-950/50 border-red-400 dark:border-red-700 cursor-pointer hover:bg-red-300",
  OUT_OF_SERVICE: "bg-gray-200 dark:bg-gray-800 border-gray-400 dark:border-gray-600",
};

const statusLabels: Record<string, string> = {
  FREE: "Beschikbaar",
  PENDING: "In afwachting",
  CONFIRMED: "Gereserveerd",
  OCCUPIED: "Bezet",
  OUT_OF_SERVICE: "Buiten dienst",
};

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
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border p-3 bg-muted/50 font-medium text-sm text-left min-w-[80px] sticky left-0 z-10 rounded-tl-lg">
                Tijd
              </th>
              {filteredCells.map((cell, index) => (
                <th
                  key={cell.id}
                  className={cn(
                    "border border-border p-3 bg-muted/50 font-medium text-sm text-center min-w-[200px]",
                    index === filteredCells.length - 1 && "rounded-tr-lg"
                  )}
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, hourIndex) => (
              <tr key={hour} className="hover:bg-muted/30 transition-colors">
                <td className={cn(
                  "border border-border p-3 font-medium text-sm bg-muted/30 sticky left-0 z-10",
                  hourIndex === HOURS.length - 1 && "rounded-bl-lg"
                )}>
                  {String(hour).padStart(2, "0")}:00
                </td>
                {filteredCells.map((cell, cellIndex) => {
                  const reservation = getReservationForCellAndTime(cell.id, currentDate, hour);
                  const isVisible = filteredReservations.includes(reservation as any);
                  const status = reservation && isVisible ? reservation.status : cell.status === "OUT_OF_SERVICE" ? "OUT_OF_SERVICE" : "FREE";

                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "border border-border p-2 transition-all min-h-[60px]",
                        statusColors[status],
                        cellIndex === filteredCells.length - 1 && hourIndex === HOURS.length - 1 && "rounded-br-lg"
                      )}
                      onClick={() => {
                        if (reservation && isVisible) {
                          setSelectedReservationId(reservation.id);
                          setIsSheetOpen(true);
                        }
                      }}
                    >
                      {reservation && isVisible && (
                        <div className="flex flex-col gap-1">
                          <Badge className="text-xs bg-primary text-primary-foreground border-0 shadow-sm">
                            {statusLabels[reservation.status]}
                          </Badge>
                          <div className="text-xs font-medium">
                            {reservation.organization?.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {reservation.dossier?.deceased_name || "Onbekend"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(reservation.start_at), "HH:mm")} -{" "}
                            {format(new Date(reservation.end_at), "HH:mm")}
                          </div>
                        </div>
                      )}
                      {cell.status === "OUT_OF_SERVICE" && !reservation && (
                        <Badge className="text-xs bg-gray-600 text-white border-0">
                          Buiten dienst
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
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border p-3 bg-muted/50 font-medium text-sm text-left min-w-[100px] sticky left-0 z-10 rounded-tl-lg">
                Koelcel
              </th>
              {weekDays.map((day, index) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "border border-border p-3 bg-muted/50 font-medium text-center min-w-[150px]",
                    index === weekDays.length - 1 && "rounded-tr-lg"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">
                      {format(day, "EEEE", { locale: nl })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(day, "d MMM", { locale: nl })}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCells.map((cell, cellIndex) => (
              <tr key={cell.id} className="hover:bg-muted/30 transition-colors">
                <td className={cn(
                  "border border-border p-3 font-medium text-sm bg-muted/30 sticky left-0 z-10",
                  cellIndex === filteredCells.length - 1 && "rounded-bl-lg"
                )}>
                  {cell.label}
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
                        "border border-border p-2 transition-all align-top",
                        statusColors[status],
                        cellIndex === filteredCells.length - 1 && dayIndex === weekDays.length - 1 && "rounded-br-lg"
                      )}
                      onClick={() => {
                        if (reservation) {
                          setSelectedReservationId(reservation.id);
                          setIsSheetOpen(true);
                        }
                      }}
                    >
                      {reservation ? (
                        <div className="flex flex-col gap-1">
                          <Badge className="text-xs bg-primary text-primary-foreground border-0 shadow-sm w-fit">
                            {statusLabels[reservation.status]}
                          </Badge>
                          <div className="text-xs font-medium truncate">
                            {reservation.organization?.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {reservation.dossier?.deceased_name || "Onbekend"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(reservation.start_at), "HH:mm")} -{" "}
                            {format(new Date(reservation.end_at), "HH:mm")}
                          </div>
                        </div>
                      ) : cell.status === "OUT_OF_SERVICE" ? (
                        <Badge className="text-xs bg-gray-600 text-white border-0">
                          Buiten dienst
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
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Kalenderweergave
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={viewMode === "day" ? "default" : "ghost"}
                  onClick={() => setViewMode("day")}
                >
                  Dag
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "default" : "ghost"}
                  onClick={() => setViewMode("week")}
                >
                  Week
                </Button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => navigateDate("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[200px] text-center">
                  {viewMode === "day"
                    ? format(currentDate, "d MMMM yyyy", { locale: nl })
                    : `Week ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: nl })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "d MMM yyyy", { locale: nl })}`
                  }
                </span>
                <Button size="sm" variant="outline" onClick={() => navigateDate("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Vandaag
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
                  placeholder="Zoek op naam of dossiernummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={selectedCellFilter} onValueChange={setSelectedCellFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle koelcellen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle koelcellen</SelectItem>
                {coolCells.map((cell) => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFDFilter} onValueChange={setSelectedFDFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle uitvaartverzorgers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle uitvaartverzorgers</SelectItem>
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

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            viewMode === "day" ? renderDayView() : renderWeekView()
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800"></div>
              <span>Beschikbaar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800"></div>
              <span>In afwachting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-800"></div>
              <span>Gereserveerd</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-950/50 border border-red-400 dark:border-red-700"></div>
              <span>Bezet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600"></div>
              <span>Buiten dienst</span>
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
