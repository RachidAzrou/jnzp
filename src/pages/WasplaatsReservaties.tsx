import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function WasplaatsReservaties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dossierId, setDossierId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
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
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reservaties</h1>
        <p className="text-sm text-muted-foreground mt-1">Bekijk alle koelcel reservaties</p>
      </div>

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
              <Label htmlFor="start">Start Datum & Tijd</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">Einde Datum & Tijd (verplicht)</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
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
                {loading ? "Opslaan..." : "Reservering Opslaan"}
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
  );
}
