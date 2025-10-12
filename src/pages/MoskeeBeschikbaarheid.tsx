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
import { X, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type WeeklyAvailability = {
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
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
  const [availability, setAvailability] = useState<Record<number, WeeklyAvailability>>({});
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

      // Fetch weekly availability
      const { data: availData, error: availError } = await supabase
        .from("mosque_weekly_availability")
        .select("*")
        .eq("mosque_org_id", roleData.organization_id);

      if (availError) throw availError;

      // Fetch upcoming day blocks (next 7 days)
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
      
      const { data: blocksData, error: blocksError } = await supabase
        .from("mosque_day_blocks")
        .select("*")
        .in("date", weekDates);

      if (blocksError) throw blocksError;

      // Create availability map for all days of week (0-6)
      const availMap: Record<number, WeeklyAvailability> = {};
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        const existing = availData?.find((a) => a.day_of_week === dayOfWeek);
        const isFriday = dayOfWeek === 5;

        availMap[dayOfWeek] = existing || {
          day_of_week: dayOfWeek,
          fajr: true,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
          jumuah: isFriday ? true : null,
        };
      }

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
    dayOfWeek: number,
    prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "jumuah"
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [prayer]: !prev[dayOfWeek][prayer],
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
        day_of_week: day.day_of_week,
        fajr: day.fajr,
        dhuhr: day.dhuhr,
        asr: day.asr,
        maghrib: day.maghrib,
        isha: day.isha,
        jumuah: day.jumuah,
      }));

      const { error } = await supabase
        .from("mosque_weekly_availability")
        .upsert(updates, { onConflict: "mosque_org_id,day_of_week" });

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.availability.update",
        user_id: sessionData.session.user.id,
        description: "Moskee wekelijkse beschikbaarheid bijgewerkt",
        metadata: {
          updates: updates.length,
          days: updates.map(u => u.day_of_week),
        },
      });

      toast({
        title: "Opgeslagen",
        description: "Wekelijkse beschikbaarheid is bijgewerkt",
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

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.dayclosure.create",
        user_id: sessionData.session.user.id,
        description: `Moskee dag geblokkeerd: ${format(new Date(blockDate), "d MMMM", { locale: nl })}`,
        metadata: {
          date: blockDate,
          reason: blockReason.trim(),
        },
      });

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

  const getDayNames = () => {
    // Returns array of day objects: Sunday (0) to Saturday (6)
    // But we want to display Monday-Sunday, so we rotate
    const dayNames = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
      dayOfWeek,
      name: dayNames[dayOfWeek],
    }));
  };

  const isDateBlocked = (date: string) => {
    return dayBlocks.find((block) => block.date === date);
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Moskee</p>
                <h1 className="text-2xl font-bold tracking-tight">Wekelijkse beschikbaarheid per gebed</h1>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 pl-15">
            Stel de standaard beschikbaarheid per dag van de week in. Dit geldt voor alle weken.
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Standaard beschikbaarheid</CardTitle>
            <Button onClick={handleSave} size="sm">Opslaan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-sm">Dag</th>
                  <th className="text-center p-3 font-medium text-sm">Fajr</th>
                  <th className="text-center p-3 font-medium text-sm">Dhuhr</th>
                  <th className="text-center p-3 font-medium text-sm">Asr</th>
                  <th className="text-center p-3 font-medium text-sm">Maghrib</th>
                  <th className="text-center p-3 font-medium text-sm">Isha</th>
                  <th className="text-center p-3 font-medium text-sm">Jumu'ah</th>
                  <th className="text-center p-3 font-medium text-sm">Overmacht</th>
                </tr>
              </thead>
              <tbody>
                {getDayNames().map(({ dayOfWeek, name }) => {
                  const dayAvail = availability[dayOfWeek];
                  const isFriday = dayOfWeek === 5;

                  return (
                    <tr key={dayOfWeek} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium text-sm">
                        {name}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.fajr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "fajr")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.dhuhr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "dhuhr")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.asr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "asr")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.maghrib}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "maghrib")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.isha}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "isha")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          {isFriday && dayAvail?.jumuah !== null ? (
                            <Switch
                              checked={dayAvail?.jumuah || false}
                              onCheckedChange={() => togglePrayer(dayOfWeek, "jumuah")}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-muted-foreground">
                          Zie hieronder ↓
                        </span>
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
