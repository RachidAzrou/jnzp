import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ban } from "lucide-react";
import { useState } from "react";
import { CoolCellReservationSheet } from "./CoolCellReservationSheet";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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

type WeekViewProps = {
  coolCells: CoolCell[];
  reservations: Reservation[];
  dayBlocks: DayBlock[];
  currentWeek: Date;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "FREE":
      return "bg-green-100 hover:bg-green-200 border-green-300 cursor-default";
    case "PENDING":
      return "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 cursor-pointer";
    case "CONFIRMED":
      return "bg-blue-100 hover:bg-blue-200 border-blue-300 cursor-pointer";
    case "OCCUPIED":
      return "bg-red-100 hover:bg-red-200 border-red-300 cursor-pointer";
    case "OUT_OF_SERVICE":
      return "bg-gray-200 hover:bg-gray-300 border-gray-400 cursor-default";
    default:
      return "bg-muted hover:bg-muted/80 cursor-default";
  }
};

const getStatusLabel = (status: string, t: any) => {
  const statusMap: Record<string, string> = {
    FREE: 'wasplaats.statusFree',
    PENDING: 'wasplaats.statusPending',
    CONFIRMED: 'wasplaats.statusConfirmed',
    OCCUPIED: 'wasplaats.statusOccupied',
    OUT_OF_SERVICE: 'wasplaats.statusOutOfService'
  };
  return t(statusMap[status] || status);
};

export function WasplaatsWeekView({
  coolCells,
  reservations,
  dayBlocks,
  currentWeek,
}: WeekViewProps) {
  const { t } = useTranslation();
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i)
  );

  const handleReservationClick = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setIsSheetOpen(true);
  };

  const getCellStatusForDay = (cellId: string, day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const cell = coolCells.find((c) => c.id === cellId);
    
    if (!cell) return { status: "FREE", reservations: [], reservation: null };
    
    // Check if the entire facility is blocked for this day
    const isBlocked = dayBlocks.some((b) => b.date === dayStr);
    if (isBlocked) return { status: "BLOCKED", reservations: [], reservation: null };
    
    // If the cell itself is out of service, always show that
    if (cell.status === "OUT_OF_SERVICE") {
      return { status: "OUT_OF_SERVICE", reservations: [], reservation: null };
    }

    // Check for reservations on this day
    const dayReservations = reservations.filter(
      (r) =>
        r.cool_cell_id === cellId &&
        format(new Date(r.start_at), "yyyy-MM-dd") === dayStr
    );

    if (dayReservations.length > 0) {
      // Use the status from the reservation
      const firstReservation = dayReservations[0];
      return { 
        status: firstReservation.status, 
        reservations: dayReservations,
        reservation: firstReservation 
      };
    }

    // If the cell is manually marked as OCCUPIED (without a reservation), show that
    if (cell.status === "OCCUPIED") {
      return { status: "OCCUPIED", reservations: [], reservation: null };
    }

    // Otherwise, the cell is free
    return { status: "FREE", reservations: [], reservation: null };
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">{t("wasplaats.weekOverview")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border p-3 bg-muted/50 font-medium text-sm text-left min-w-[100px] rounded-tl-lg">
                  {t("wasplaats.label")}
                </th>
                {weekDays.map((day, index) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isBlocked = dayBlocks.some((b) => b.date === dayStr);
                  const blockReason = dayBlocks.find((b) => b.date === dayStr)?.reason;
                  const isLastDay = index === weekDays.length - 1;

                  return (
                    <th
                      key={dayStr}
                      className={`border border-border p-3 bg-muted/50 font-medium text-center min-w-[120px] ${
                        isLastDay ? 'rounded-tr-lg' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold">
                          {format(day, "EEEE", { locale: nl })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(day, "d MMM", { locale: nl })}
                        </span>
                        {isBlocked && (
                          <HoverCard>
                            <HoverCardTrigger>
                              <Badge variant="destructive" className="text-xs gap-1">
                                <Ban className="h-3 w-3" />
                                {t("wasplaats.blocked")}
                              </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-auto">
                              <p className="text-sm font-medium">{t("wasplaats.reason")}</p>
                              <p className="text-xs text-muted-foreground">
                                {blockReason}
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {coolCells.map((cell, cellIndex) => {
                const isLastRow = cellIndex === coolCells.length - 1;
                
                return (
                  <tr key={cell.id} className="hover:bg-muted/30 transition-colors">
                    <td className={`border border-border p-3 font-medium text-sm ${
                      isLastRow ? 'rounded-bl-lg' : ''
                    }`}>
                      {cell.label}
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const { status, reservations: dayReservations, reservation } =
                        getCellStatusForDay(cell.id, day);
                      const isLastDay = dayIndex === weekDays.length - 1;

                      return (
                        <td
                          key={dayStr}
                          className={`border border-border p-3 transition-all ${getStatusColor(
                            status
                          )} ${isLastRow && isLastDay ? 'rounded-br-lg' : ''}`}
                          onClick={() => {
                            if (reservation) {
                              handleReservationClick(reservation.id);
                            }
                          }}
                        >
                          {status === "BLOCKED" ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="destructive" className="text-xs">
                                {t("wasplaats.blocked")}
                              </Badge>
                            </div>
                          ) : reservation ? (
                            <div className="flex flex-col items-center gap-2">
                              <Badge className={`text-xs shadow-sm ${
                                status === "FREE" ? "bg-green-600 hover:bg-green-700 text-white border-0" :
                                status === "PENDING" ? "bg-orange-600 hover:bg-orange-700 text-white border-0" :
                                status === "CONFIRMED" ? "bg-blue-600 hover:bg-blue-700 text-white border-0" :
                                status === "OCCUPIED" ? "bg-red-600 hover:bg-red-700 text-white border-0" :
                                status === "OUT_OF_SERVICE" ? "bg-gray-600 hover:bg-gray-700 text-white border-0" :
                                "bg-gray-600 hover:bg-gray-700 text-white border-0"
                              }`}>
                                {getStatusLabel(status, t)}
                              </Badge>
                              <div className="text-xs font-medium bg-background/80 px-2 py-1 rounded">
                                {format(new Date(reservation.start_at), "HH:mm")}
                                {" - "}
                                {format(new Date(reservation.end_at), "HH:mm")}
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Badge className={`text-xs ${
                                status === "FREE" ? "bg-green-600 hover:bg-green-700 text-white border-0" :
                                status === "OCCUPIED" ? "bg-red-600 hover:bg-red-700 text-white border-0" :
                                status === "OUT_OF_SERVICE" ? "bg-gray-600 hover:bg-gray-700 text-white border-0" :
                                "bg-gray-600 hover:bg-gray-700 text-white border-0"
                              }`}>
                                {getStatusLabel(status, t)}
                              </Badge>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CoolCellReservationSheet
        reservationId={selectedReservationId}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </Card>
  );
}
