import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { nl, enGB, fr } from "date-fns/locale";
import { format, startOfDay, endOfDay } from "date-fns";
import { Refrigerator, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type CoolCell = {
  id: string;
  label: string;
  status: string;
  out_of_service_note: string | null;
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
};

const statusColors: Record<string, string> = {
  FREE: "bg-green-600 text-white border-0",
  RESERVED: "bg-orange-600 text-white border-0",
  OCCUPIED: "bg-red-600 text-white border-0",
  OUT_OF_SERVICE: "bg-gray-600 text-white border-0",
};

export function CoolCellCalendarView() {
  const { t, i18n } = useTranslation();
  
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'en': return enGB;
      default: return nl;
    }
  };
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserOrg();
  }, []);

  useEffect(() => {
    if (userOrgId) {
      fetchCoolCells();
      fetchReservations();
    }
  }, [userOrgId, selectedDate]);

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
      toast({
        title: t("toasts.errors.loadError"),
        description: t("mortuarium.coolCells.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from("cool_cell_reservations")
        .select(`
          *,
          dossier:dossiers(deceased_name, display_id)
        `)
        .eq("facility_org_id", userOrgId)
        .or(`and(start_at.lte.${dayEnd},end_at.gte.${dayStart})`)
        .in("status", ["PENDING", "CONFIRMED"]);

      if (error) throw error;
      if (data) setReservations(data as any);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const getCellAvailability = (cellId: string) => {
    const cell = coolCells.find(c => c.id === cellId);
    if (!cell) return { available: false, reason: t("common.unknown") };

    if (cell.status === "OUT_OF_SERVICE") {
      return { 
        available: false, 
        reason: cell.out_of_service_note || t("mortuarium.status.out_of_service")
      };
    }

    const reservation = reservations.find(r => r.cool_cell_id === cellId);
    if (reservation) {
      return {
        available: false,
        reason: `${t("mortuarium.coolCells.reserved")} - ${reservation.dossier?.deceased_name || t("common.unknown")}`,
        reservation
      };
    }

    return { available: true, reason: t("mortuarium.coolCells.available") };
  };

  const availableCells = coolCells.filter(cell => {
    const availability = getCellAvailability(cell.id);
    return availability.available;
  });

  const unavailableCells = coolCells.filter(cell => {
    const availability = getCellAvailability(cell.id);
    return !availability.available;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
      {/* Calendar Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Refrigerator className="h-5 w-5 text-muted-foreground" />
            {t("mortuarium.coolCells.selectDate")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={getDateLocale()}
            className={cn("rounded-md border pointer-events-auto")}
          />
        </CardContent>
      </Card>

      {/* Cool Cells Availability Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              {t("mortuarium.coolCells.availability")} - {format(selectedDate, "d MMMM yyyy", { locale: getDateLocale() })}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  {availableCells.length} {t("mortuarium.coolCells.available")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">
                  {unavailableCells.length} {t("mortuarium.coolCells.occupied")}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : coolCells.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("mortuarium.coolCells.noCellsFound")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Available Cells */}
              {availableCells.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("mortuarium.coolCells.available")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {availableCells.map((cell) => (
                      <div
                        key={cell.id}
                        className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cell.label}</span>
                          <Badge className="bg-green-600 text-white border-0">
                            {t("mortuarium.status.free")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unavailable Cells */}
              {unavailableCells.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {t("mortuarium.coolCells.unavailable")}
                  </h3>
                  <div className="space-y-2">
                    {unavailableCells.map((cell) => {
                      const availability = getCellAvailability(cell.id);
                      return (
                        <div
                          key={cell.id}
                          className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{cell.label}</span>
                                <Badge className={statusColors[cell.status]}>
                                  {t(`mortuarium.status.${cell.status.toLowerCase()}`)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {availability.reason}
                              </p>
                              {availability.reservation && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {format(new Date(availability.reservation.start_at), "HH:mm", { locale: getDateLocale() })}
                                    {" - "}
                                    {format(new Date(availability.reservation.end_at), "HH:mm", { locale: getDateLocale() })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}