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
      return "bg-success/30 hover:bg-success/40 border-success/50 cursor-default";
    case "PENDING":
      return "bg-warning/30 hover:bg-warning/40 border-warning/50 cursor-pointer";
    case "CONFIRMED":
      return "bg-blue-500/30 hover:bg-blue-500/40 border-blue-500/50 cursor-pointer";
    case "OCCUPIED":
      return "bg-destructive/30 hover:bg-destructive/40 border-destructive/50 cursor-pointer";
    case "OUT_OF_SERVICE":
      return "bg-destructive/50 hover:bg-destructive/60 border-destructive/70 cursor-default";
    default:
      return "bg-muted hover:bg-muted/80 cursor-default";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "FREE":
      return "Vrij";
    case "PENDING":
      return "In afwachting";
    case "CONFIRMED":
      return "Bevestigd";
    case "OCCUPIED":
      return "Bezet";
    case "OUT_OF_SERVICE":
      return "Buiten dienst";
    default:
      return status;
  }
};

export function WasplaatsWeekView({
  coolCells,
  reservations,
  dayBlocks,
  currentWeek,
}: WeekViewProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>Weekoverzicht</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-muted font-medium text-left min-w-[100px]">
                  Koelcel
                </th>
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isBlocked = dayBlocks.some((b) => b.date === dayStr);
                  const blockReason = dayBlocks.find((b) => b.date === dayStr)?.reason;

                  return (
                    <th
                      key={dayStr}
                      className="border p-2 bg-muted font-medium text-center min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm">
                          {format(day, "EEE", { locale: nl })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(day, "d MMM", { locale: nl })}
                        </span>
                        {isBlocked && (
                          <HoverCard>
                            <HoverCardTrigger>
                              <Ban className="h-4 w-4 text-destructive cursor-help" />
                            </HoverCardTrigger>
                            <HoverCardContent className="w-auto">
                              <p className="text-sm font-medium">Geblokkeerd</p>
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
              {coolCells.map((cell) => (
                <tr key={cell.id} className="hover:bg-muted/50">
                  <td className="border p-2 font-medium">{cell.label}</td>
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const { status, reservations: dayReservations, reservation } =
                      getCellStatusForDay(cell.id, day);

                    return (
                      <td
                        key={dayStr}
                        className={`border p-2 transition-colors ${getStatusColor(
                          status
                        )}`}
                        onClick={() => {
                          if (reservation) {
                            handleReservationClick(reservation.id);
                          }
                        }}
                      >
                        {status === "BLOCKED" ? (
                          <div className="text-center">
                            <Badge variant="destructive" className="text-xs">
                              Geblokkeerd
                            </Badge>
                          </div>
                        ) : reservation ? (
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getStatusLabel(status)}
                            </Badge>
                            <p className="text-xs mt-1">
                              {format(new Date(reservation.start_at), "HH:mm")}
                              -
                              {format(new Date(reservation.end_at), "HH:mm")}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getStatusLabel(status)}
                            </Badge>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
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
