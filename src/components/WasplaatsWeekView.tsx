import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ban } from "lucide-react";
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
      return "bg-success/20 hover:bg-success/30 border-success";
    case "RESERVED":
      return "bg-warning/20 hover:bg-warning/30 border-warning";
    case "OCCUPIED":
      return "bg-primary/20 hover:bg-primary/30 border-primary";
    case "OUT_OF_SERVICE":
      return "bg-destructive/20 hover:bg-destructive/30 border-destructive";
    default:
      return "bg-muted hover:bg-muted/80";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "FREE":
      return "Vrij";
    case "RESERVED":
      return "Gereserveerd";
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
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i)
  );

  const getCellStatusForDay = (cellId: string, day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const cell = coolCells.find((c) => c.id === cellId);
    
    if (!cell) return { status: "FREE", reservations: [] };
    
    const isBlocked = dayBlocks.some((b) => b.date === dayStr);
    if (isBlocked) return { status: "BLOCKED", reservations: [] };
    
    if (cell.status === "OUT_OF_SERVICE") {
      return { status: "OUT_OF_SERVICE", reservations: [] };
    }

    const dayReservations = reservations.filter(
      (r) =>
        r.cool_cell_id === cellId &&
        format(new Date(r.start_at), "yyyy-MM-dd") === dayStr
    );

    if (dayReservations.length > 0) {
      return { status: "RESERVED", reservations: dayReservations };
    }

    return { status: cell.status, reservations: [] };
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
                    const { status, reservations: dayReservations } =
                      getCellStatusForDay(cell.id, day);

                    return (
                      <td
                        key={dayStr}
                        className={`border p-2 transition-colors ${getStatusColor(
                          status
                        )}`}
                      >
                        {status === "BLOCKED" ? (
                          <div className="text-center">
                            <Badge variant="destructive" className="text-xs">
                              Geblokkeerd
                            </Badge>
                          </div>
                        ) : dayReservations.length > 0 ? (
                          <HoverCard>
                            <HoverCardTrigger className="w-full cursor-pointer">
                              <div className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {dayReservations.length}x
                                </Badge>
                                <p className="text-xs mt-1">
                                  {format(new Date(dayReservations[0].start_at), "HH:mm")}
                                  -
                                  {format(new Date(dayReservations[0].end_at), "HH:mm")}
                                </p>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-auto">
                              <div className="space-y-2">
                                {dayReservations.map((res) => (
                                  <div
                                    key={res.id}
                                    className="text-xs border-b pb-2 last:border-b-0"
                                  >
                                    <p className="font-medium">
                                      Dossier: {res.dossier_id.slice(0, 8)}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {format(new Date(res.start_at), "HH:mm")} -{" "}
                                      {format(new Date(res.end_at), "HH:mm")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
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
    </Card>
  );
}
