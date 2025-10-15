import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WasplaatsReservaties() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dossierId, setDossierId] = useState("");
  const [startAt, setStartAt] = useState<Date | undefined>(new Date());
  const [endAt, setEndAt] = useState<Date | undefined>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user.id) {
        throw new Error("Niet ingelogd");
      }

      // Get facility org (for now, use first org)
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();

      if (!orgData) {
        throw new Error("Geen mortuarium organisatie gevonden");
      }

      const { error } = await supabase.from("cool_cell_reservations").insert({
        dossier_id: dossierId,
        facility_org_id: orgData.id,
        start_at: startAt?.toISOString(),
        end_at: endAt?.toISOString(),
        created_by_user_id: sessionData.session.user.id,
        note: note || null,
        status: "PENDING",
      });

      if (error) throw error;

      toast({
        title: "Reservering aangemaakt",
        description: "De reservering is succesvol aangemaakt",
      });

      navigate("/wasplaats");
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon reservering niet aanmaken",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Boekingen</p>
                    <h1 className="text-2xl font-bold tracking-tight">Reservaties</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
                  Bekijk alle koelcel reservaties
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Reservering Aanmaken</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dossier">Dossier ID</Label>
              <Input
                id="dossier"
                value={dossierId}
                onChange={(e) => setDossierId(e.target.value)}
                required
                placeholder="Voer dossier ID in"
              />
            </div>

            <div className="space-y-2">
              <Label>Start Datum & Tijd</Label>
              <DateTimePicker
                date={startAt}
                onSelect={setStartAt}
                placeholder="Selecteer start"
              />
            </div>

            <div className="space-y-2">
              <Label>Einde Datum & Tijd</Label>
              <DateTimePicker
                date={endAt}
                onSelect={setEndAt}
                placeholder="Selecteer einde"
                disabled={(date) => startAt ? date < startAt : false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notitie (optioneel)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Extra informatie"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? t("common.loading") : t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/wasplaats")}
              >
                Annuleren
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
