import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { CoolCellReservationSheet } from "./CoolCellReservationSheet";

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

type DayViewProps = {
  coolCells: CoolCell[];
  reservations: Reservation[];
  selectedDate: Date;
};

const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 08:00 - 24:00

const getReservationStyle = (start: Date, end: Date) => {
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const duration = endHour - startHour;
  
  const left = ((startHour - 8) / 16) * 100;
  const width = (duration / 16) * 100;
  
  return { left: `${left}%`, width: `${width}%` };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-warning/80 border-warning text-warning-foreground";
    case "CONFIRMED":
      return "bg-blue-500/80 border-blue-500 text-white";
    case "OCCUPIED":
      return "bg-destructive/80 border-destructive text-destructive-foreground";
    default:
      return "bg-muted border-muted-foreground";
  }
};

export function WasplaatsDayView({
  coolCells,
  reservations,
  selectedDate,
}: DayViewProps) {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const dayStr = format(selectedDate, "yyyy-MM-dd");
  const dayReservations = reservations.filter(
    (r) => format(new Date(r.start_at), "yyyy-MM-dd") === dayStr
  );

  const handleReservationClick = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setIsSheetOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dag-detail: {format(selectedDate, "EEEE d MMMM yyyy", { locale: nl })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Time header */}
            <div className="flex mb-2">
              <div className="w-32 flex-shrink-0" />
              <div className="flex-1 flex">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs text-muted-foreground border-l first:border-l-0"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Cells timeline */}
            <div className="space-y-2">
              {coolCells.map((cell) => {
                const cellReservations = dayReservations.filter(
                  (r) => r.cool_cell_id === cell.id
                );
                const isOutOfService = cell.status === "OUT_OF_SERVICE";

                return (
                  <div key={cell.id} className="flex items-center">
                    <div className="w-32 flex-shrink-0 font-medium pr-4">
                      <span>{cell.label}</span>
                    </div>
                    <div className="flex-1 relative h-12 bg-muted/30 rounded border">
                      {/* Hour grid lines */}
                      {hours.slice(1).map((hour) => (
                        <div
                          key={hour}
                          className="absolute top-0 bottom-0 border-l border-muted"
                          style={{
                            left: `${((hour - 8) / 16) * 100}%`,
                          }}
                        />
                      ))}

                      {/* Reservations */}
                      {!isOutOfService &&
                        cellReservations.map((res) => {
                          const start = new Date(res.start_at);
                          const end = new Date(res.end_at);
                          const style = getReservationStyle(start, end);

                          return (
                            <div
                              key={res.id}
                              className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-center cursor-pointer transition-all hover:scale-105 border ${getStatusColor(
                                res.status
                              )}`}
                              style={style}
                              onClick={() => handleReservationClick(res.id)}
                            >
                              <span className="text-xs font-medium truncate">
                                {format(start, "HH:mm")} - {format(end, "HH:mm")}
                              </span>
                            </div>
                          );
                        })}

                      {/* Out of service overlay */}
                      {isOutOfService && (
                        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center rounded">
                          <span className="text-xs text-destructive font-medium">
                            Buiten dienst
                          </span>
                        </div>
                      )}

                      {/* Free indicator */}
                      {!isOutOfService && cellReservations.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            Vrij
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex gap-4 justify-center flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-success/30 border border-success/50" />
                <span className="text-xs">Vrij</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-warning/80 border border-warning" />
                <span className="text-xs">In afwachting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/80 border border-blue-500" />
                <span className="text-xs">Bevestigd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/80 border border-destructive" />
                <span className="text-xs">Bezet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/50 border border-destructive/70" />
                <span className="text-xs">Buiten dienst</span>
              </div>
            </div>
          </div>
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
