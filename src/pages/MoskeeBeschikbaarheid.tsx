import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DayAvailability = {
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  jumuah: boolean | null;
};

type DayBlock = {
  id: string;
  date: string;
  reason: string;
};

export default function MoskeeBeschikbaarheid() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [dayBlocks, setDayBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockReason, setBlockReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));

      // Fetch availability
      const { data: availData, error: availError } = await supabase
        .from("mosque_availability")
        .select("*")
        .in("date", weekDates);

      if (availError) throw availError;

      // Fetch day blocks
      const { data: blocksData, error: blocksError } = await supabase
        .from("mosque_day_blocks")
        .select("*")
        .in("date", weekDates);

      if (blocksError) throw blocksError;

      const availMap: Record<string, DayAvailability> = {};
      weekDates.forEach((date) => {
        const existing = availData?.find((a) => a.date === date);
        const dayOfWeek = new Date(date).getDay();
        const isFriday = dayOfWeek === 5;

        availMap[date] = existing || {
          date,
          fajr: true,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
          jumuah: isFriday ? true : null,
        };
      });

      setAvailability(availMap);
      setDayBlocks(blocksData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Fout",
        description: "Kon beschikbaarheid niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePrayer = (
    date: string,
    prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "jumuah"
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [prayer]: !prev[date][prayer],
      },
    }));
  };

  const handleSave = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user.id) {
        throw new Error("Niet ingelogd");
      }

      // Get mosque org
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", sessionData.session.user.id)
        .limit(1)
        .maybeSingle();

      if (!roleData?.organization_id) {
        throw new Error("Geen moskee organisatie gevonden");
      }

      const updates = Object.values(availability).map((day) => ({
        mosque_org_id: roleData.organization_id,
        date: day.date,
        fajr: day.fajr,
        dhuhr: day.dhuhr,
        asr: day.asr,
        maghrib: day.maghrib,
        isha: day.isha,
        jumuah: day.jumuah,
      }));

      const { error } = await supabase
        .from("mosque_availability")
        .upsert(updates, { onConflict: "mosque_org_id,date" });

      if (error) throw error;

      toast({
        title: "Opgeslagen",
        description: "Beschikbaarheid is bijgewerkt",
      });
    } catch (error: any) {
      console.error("Error saving availability:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon beschikbaarheid niet opslaan",
        variant: "destructive",
      });
    }
  };

  const handleBlockDay = async () => {
    if (!blockDate || !blockReason || blockReason.trim().length < 8) {
      toast({
        title: "Fout",
        description: "Datum en reden (min. 8 tekens) zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user.id) {
        throw new Error("Niet ingelogd");
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", sessionData.session.user.id)
        .limit(1)
        .maybeSingle();

      if (!roleData?.organization_id) {
        throw new Error("Geen moskee organisatie gevonden");
      }

      const { error } = await supabase.from("mosque_day_blocks").insert({
        mosque_org_id: roleData.organization_id,
        date: blockDate,
        reason: blockReason.trim(),
        created_by_user_id: sessionData.session.user.id,
      });

      if (error) throw error;

      toast({
        title: "Dag geblokkeerd",
        description: `${format(new Date(blockDate), "d MMMM", { locale: nl })} is geblokkeerd`,
      });

      setBlockDate("");
      setBlockReason("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error blocking day:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon dag niet blokkeren",
        variant: "destructive",
      });
    }
  };

  const handleUnblockDay = async (blockId: string) => {
    try {
      const { error } = await supabase.from("mosque_day_blocks").delete().eq("id", blockId);

      if (error) throw error;

      toast({
        title: "Blokkade verwijderd",
        description: "Dag is weer beschikbaar",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error unblocking day:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon blokkade niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const isDateBlocked = (date: string) => {
    return dayBlocks.find((block) => block.date === date);
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Beschikbaarheid per gebed</h1>
        <p className="text-muted-foreground mt-1">
          Beheer de beschikbaarheid van de moskee per gebedstijd
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Weekoverzicht</CardTitle>
            <Button onClick={handleSave}>Opslaan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Dag</th>
                  <th className="text-center p-3">Fajr</th>
                  <th className="text-center p-3">Dhuhr</th>
                  <th className="text-center p-3">Asr</th>
                  <th className="text-center p-3">Maghrib</th>
                  <th className="text-center p-3">Isha</th>
                  <th className="text-center p-3">Jumu'ah</th>
                  <th className="text-center p-3">Overmacht</th>
                </tr>
              </thead>
              <tbody>
                {getWeekDays().map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayAvail = availability[dateStr];
                  const blocked = isDateBlocked(dateStr);
                  const isFriday = day.getDay() === 5;

                  return (
                    <tr key={dateStr} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        {format(day, "EEE d MMM", { locale: nl })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.fajr}
                            onCheckedChange={() => togglePrayer(dateStr, "fajr")}
                            disabled={!!blocked}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.dhuhr}
                            onCheckedChange={() => togglePrayer(dateStr, "dhuhr")}
                            disabled={!!blocked}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.asr}
                            onCheckedChange={() => togglePrayer(dateStr, "asr")}
                            disabled={!!blocked}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.maghrib}
                            onCheckedChange={() => togglePrayer(dateStr, "maghrib")}
                            disabled={!!blocked}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.isha}
                            onCheckedChange={() => togglePrayer(dateStr, "isha")}
                            disabled={!!blocked}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          {isFriday && dayAvail?.jumuah !== null ? (
                            <Switch
                              checked={dayAvail?.jumuah || false}
                              onCheckedChange={() => togglePrayer(dateStr, "jumuah")}
                              disabled={!!blocked}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          {blocked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnblockDay(blocked.id)}
                              title={`Reden: ${blocked.reason}`}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          ) : (
                            <Dialog open={dialogOpen && blockDate === dateStr} onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (open) setBlockDate(dateStr);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  Blokkeren
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Dag blokkeren (overmacht)</DialogTitle>
                                  <DialogDescription>
                                    Blokkeer deze dag voor alle gebeden. Reden is verplicht.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm font-medium mb-2">
                                      Dag: {format(day, "EEEE d MMMM", { locale: nl })}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                      Reden (min. 8 tekens)
                                    </label>
                                    <Textarea
                                      value={blockReason}
                                      onChange={(e) => setBlockReason(e.target.value)}
                                      placeholder="Bijvoorbeeld: Overmacht (brandalarm), Sluiting Eid-gebed, Renovatie..."
                                      rows={3}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleBlockDay}
                                    className="w-full"
                                    disabled={blockReason.trim().length < 8}
                                  >
                                    Bevestig blokkade
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Uitleg:</strong> Vink aan bij welke gebeden janāza kan plaatsvinden. "Dag
                blokkeren" = overmacht (reden wordt gevraagd). Geblokkeerde dagen tonen alle gebeden
                als niet beschikbaar.
              </p>
            </div>

            {dayBlocks.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                  🚫 Geblokkeerde dagen deze week:
                </p>
                <ul className="space-y-1">
                  {dayBlocks.map((block) => (
                    <li key={block.id} className="text-sm text-red-600 dark:text-red-400">
                      • {format(new Date(block.date), "EEEE d MMMM", { locale: nl })}:{" "}
                      {block.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
