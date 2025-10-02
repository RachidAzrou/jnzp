import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type DayAvailability = {
  date: string;
  morning_open: boolean;
  afternoon_open: boolean;
  evening_open: boolean;
};

export default function MoskeeBeschikbaarheid() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));

      const { data, error } = await supabase
        .from("mosque_availability")
        .select("*")
        .in("date", weekDates);

      if (error) throw error;

      const availMap: Record<string, DayAvailability> = {};
      weekDates.forEach((date) => {
        const existing = data?.find((a) => a.date === date);
        availMap[date] = existing || {
          date,
          morning_open: true,
          afternoon_open: true,
          evening_open: true,
        };
      });

      setAvailability(availMap);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast({
        title: "Fout",
        description: "Kon beschikbaarheid niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (date: string, slot: "morning_open" | "afternoon_open" | "evening_open") => {
    setAvailability((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [slot]: !prev[date][slot],
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
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      if (!orgData) {
        throw new Error("Geen moskee organisatie gevonden");
      }

      const updates = Object.values(availability).map((day) => ({
        mosque_org_id: orgData.id,
        date: day.date,
        morning_open: day.morning_open,
        afternoon_open: day.afternoon_open,
        evening_open: day.evening_open,
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

  const getWeekDays = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/moskee")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Beschikbaarheid</h1>
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
                  <th className="text-center p-3">Ochtend</th>
                  <th className="text-center p-3">Middag</th>
                  <th className="text-center p-3">Avond</th>
                </tr>
              </thead>
              <tbody>
                {getWeekDays().map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayAvail = availability[dateStr];

                  return (
                    <tr key={dateStr} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        {format(day, "EEEE d MMM", { locale: nl })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.morning_open}
                            onCheckedChange={() => toggleSlot(dateStr, "morning_open")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.afternoon_open}
                            onCheckedChange={() => toggleSlot(dateStr, "afternoon_open")}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dayAvail?.evening_open}
                            onCheckedChange={() => toggleSlot(dateStr, "evening_open")}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Uitleg:</strong> Schakel dagdelen uit om aan te geven dat de moskee niet beschikbaar is.
              Blokkeer een hele dag via de "Dag blokkeren" functie.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
