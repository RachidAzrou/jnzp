import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
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
};

type DayBlock = {
  id: string;
  date: string;
  reason: string;
};

export default function MoskeeBeschikbaarheid() {
  const { t } = useTranslation();
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
        throw new Error(t("mosque.errors.noOrganization"));
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

        availMap[dayOfWeek] = existing || {
          day_of_week: dayOfWeek,
          fajr: true,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
        };
      }

      setAvailability(availMap);
      setDayBlocks(blocksData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t("mosque.availability.loadError"),
        description: t("mosque.availability.loadErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePrayer = (
    dayOfWeek: number,
    prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
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
        throw new Error(t("mosque.errors.noOrganization"));
      }

      const updates = Object.values(availability).map((day) => ({
        mosque_org_id: roleData.organization_id,
        day_of_week: day.day_of_week,
        fajr: day.fajr,
        dhuhr: day.dhuhr,
        asr: day.asr,
        maghrib: day.maghrib,
        isha: day.isha,
        jumuah: day.day_of_week === 5 ? day.dhuhr : null, // Friday Dhuhr = Jumu'ah
      }));

      const { error } = await supabase
        .from("mosque_weekly_availability")
        .upsert(updates, { onConflict: "mosque_org_id,day_of_week" });

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.availability.update",
        user_id: sessionData.session.user.id,
        description: t("mosque.audit.updatedAvailability"),
        metadata: {
          updates: updates.length,
          days: updates.map(u => u.day_of_week),
        },
      });

      toast({
        title: t("mosque.availability.saved"),
        description: t("mosque.availability.savedDesc"),
      });
    } catch (error: any) {
      console.error("Error saving availability:", error);
      toast({
        title: t("mosque.availability.saveError"),
        description: t("mosque.availability.saveErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleBlockDay = async () => {
    if (!blockDate || !blockReason || blockReason.trim().length < 8) {
      toast({
        title: t("mosque.availability.blockError"),
        description: t("mosque.availability.dateReasonRequired"),
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
        throw new Error(t("mosque.errors.noOrganization"));
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
        description: `${t("mosque.audit.blockedDay")}: ${format(new Date(blockDate), "d MMMM", { locale: nl })}`,
        metadata: {
          date: blockDate,
          reason: blockReason.trim(),
        },
      });

      toast({
        title: t("mosque.availability.dayBlocked"),
        description: `${format(new Date(blockDate), "d MMMM", { locale: nl })} ${t("mosque.availability.dayBlockedDesc")}`,
      });

      setBlockDate("");
      setBlockReason("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error blocking day:", error);
      toast({
        title: t("mosque.availability.blockError"),
        description: t("mosque.availability.blockErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleUnblockDay = async (blockId: string) => {
    try {
      const { error } = await supabase.from("mosque_day_blocks").delete().eq("id", blockId);

      if (error) throw error;

      toast({
        title: t("mosque.availability.blockRemoved"),
        description: t("mosque.availability.blockRemovedDesc"),
      });

      fetchData();
    } catch (error: any) {
      console.error("Error unblocking day:", error);
      toast({
        title: t("mosque.availability.unblockError"),
        description: t("mosque.availability.unblockErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const getDayNames = () => {
    // Returns array of day objects: Sunday (0) to Saturday (6)
    // But we want to display Monday-Sunday, so we rotate
    const dayNames = [
      t("mosque.availability.sunday"),
      t("mosque.availability.monday"),
      t("mosque.availability.tuesday"),
      t("mosque.availability.wednesday"),
      t("mosque.availability.thursday"),
      t("mosque.availability.friday"),
      t("mosque.availability.saturday")
    ];
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
                <p className="text-sm text-muted-foreground font-medium">{t("mosque.label")}</p>
                <h1 className="text-2xl font-bold tracking-tight">{t("mosque.availability.pageTitle")}</h1>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 pl-15">
            {t("mosque.availability.pageSubtitle")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">{t("mosque.availability.standardAvailability")}</CardTitle>
            <Button onClick={handleSave} size="sm">{t("common.save")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.dayCol")}</th>
                  <th className="text-center px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.prayers.fajr")}</th>
                  <th className="text-center px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.prayers.dhuhr")}</th>
                  <th className="text-center px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.prayers.asr")}</th>
                  <th className="text-center px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.prayers.maghrib")}</th>
                  <th className="text-center px-6 py-4 font-semibold text-sm text-foreground bg-muted/50">{t("mosque.availability.prayers.isha")}</th>
                </tr>
              </thead>
              <tbody>
                {getDayNames().map(({ dayOfWeek, name }) => {
                  const dayAvail = availability[dayOfWeek];

                  return (
                    <tr 
                      key={dayOfWeek} 
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-5 font-medium text-sm text-foreground">
                        {name}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dayAvail?.fajr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "fajr")}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dayAvail?.dhuhr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "dhuhr")}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dayAvail?.asr}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "asr")}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dayAvail?.maghrib}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "maghrib")}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={dayAvail?.isha}
                            onCheckedChange={() => togglePrayer(dayOfWeek, "isha")}
                            className="h-5 w-5"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              {t("mosque.availability.explanation")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Day Blocking Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">{t("mosque.availability.blockDaysTitle")}</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <X className="mr-2 h-4 w-4" />
                  {t("mosque.availability.blockDayBtn")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("mosque.availability.blockDialogTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("mosque.availability.blockDialogDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("mosque.availability.dateLabel")}</label>
                    <Input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t("mosque.availability.reasonLabel")}</label>
                    <Textarea
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder={t("placeholders.mosqueRenovation")}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleBlockDay}>{t("mosque.availability.blockDayBtn")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dayBlocks.length > 0 ? (
            <div className="space-y-2">
              {dayBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                >
                  <div>
                    <p className="font-medium text-sm text-red-700 dark:text-red-300">
                      {format(new Date(block.date), "EEEE d MMMM yyyy", { locale: nl })}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {block.reason}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnblockDay(block.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("mosque.availability.removeBtn")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Geen geblokkeerde dagen. Klik op "Dag Blokkeren" om een datum toe te voegen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
