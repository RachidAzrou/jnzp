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
      return "bg-yellow-100 border-yellow-300 text-yellow-900";
    case "CONFIRMED":
      return "bg-blue-100 border-blue-300 text-blue-900";
    case "OCCUPIED":
      return "bg-red-100 border-red-300 text-red-900";
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
                const isOccupied = cell.status === "OCCUPIED";

                return (
                  <div key={cell.id} className="flex items-center">
                    <div className="w-32 flex-shrink-0 font-medium pr-4">
                      <span>{cell.label}</span>
                    </div>
                    <div className="flex-1 relative h-12 bg-white rounded border">
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
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center rounded border-2 border-gray-400">
                          <span className="text-xs text-gray-700 font-medium">
                            Buiten dienst
                          </span>
                        </div>
                      )}

                      {/* Manually occupied (no reservation) */}
                      {!isOutOfService && isOccupied && cellReservations.length === 0 && (
                        <div className="absolute inset-0 bg-red-100 flex items-center justify-center rounded border-2 border-red-300">
                          <span className="text-xs text-red-700 font-medium">
                            Bezet
                          </span>
                        </div>
                      )}

                      {/* Free indicator */}
                      {!isOutOfService && !isOccupied && cellReservations.length === 0 && (
                        <div className="absolute inset-0 bg-green-100 flex items-center justify-center rounded border-2 border-green-300">
                          <span className="text-xs text-green-700 font-medium">
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
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                <span className="text-xs">Vrij</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" />
                <span className="text-xs">Gereserveerd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                <span className="text-xs">Bezet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 border border-gray-400" />
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
