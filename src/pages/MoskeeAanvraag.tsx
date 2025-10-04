import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MosqueServiceDetails = {
  id: string;
  dossier_id: string;
  requested_date: string | null;
  prayer: string | null;
  status: string;
  note: string | null;
  decline_reason: string | null;
  dossiers: {
    ref_number: string;
    display_id: string | null;
    deceased_name: string;
    date_of_death: string | null;
    legal_hold: boolean;
  };
};

const prayerLabels: Record<string, string> = {
  FAJR: "Fajr",
  DHUHR: "Dhuhr",
  ASR: "Asr",
  MAGHRIB: "Maghrib",
  ISHA: "Isha",
  JUMUAH: "Jumu'ah",
};

export default function MoskeeAanvraag() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<MosqueServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [declineReason, setDeclineReason] = useState("");
  const [proposedPrayer, setProposedPrayer] = useState<string>("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    if (id) fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from("mosque_services")
        .select("*, dossiers(ref_number, display_id, deceased_name, date_of_death, legal_hold)")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) setService(data as any);
    } catch (error) {
      console.error("Error fetching service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("mosque_services")
        .update({ status: "CONFIRMED" })
        .eq("id", id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.confirm",
        user_id: session.user.id,
        dossier_id: service?.dossier_id,
        description: `Moskee bevestigde janāza-gebed voor ${service?.dossiers.deceased_name}`,
        metadata: {
          mosque_service_id: id,
          prayer: service?.prayer,
          requested_date: service?.requested_date,
        },
      });

      toast({
        title: "✅ Bevestigd",
        description: "Aanvraag is bevestigd",
      });

      navigate("/moskee");
    } catch (error) {
      console.error("Error confirming service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet bevestigen",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async () => {
    if (!declineReason || declineReason.trim().length < 8) {
      toast({
        title: "Fout",
        description: "Reden is verplicht (minimaal 8 tekens)",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("mosque_services")
        .update({
          status: "DECLINED",
          decline_reason: declineReason.trim(),
        })
        .eq("id", id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.decline",
        user_id: session.user.id,
        dossier_id: service?.dossier_id,
        description: `Moskee wees janāza-gebed af voor ${service?.dossiers.deceased_name}`,
        metadata: {
          mosque_service_id: id,
          decline_reason: declineReason.trim(),
          prayer: service?.prayer,
          requested_date: service?.requested_date,
        },
      });

      toast({
        title: "❌ Niet mogelijk",
        description: "Aanvraag is afgewezen met reden",
      });

      navigate("/moskee");
    } catch (error) {
      console.error("Error declining service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet afwijzen",
        variant: "destructive",
      });
    }
  };

  const handleProposal = async () => {
    if (!proposedPrayer) {
      toast({
        title: "Fout",
        description: "Selecteer een alternatief gebed",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("mosque_services")
        .update({
          status: "PROPOSED" as any,
          proposed_prayer: proposedPrayer as any,
          proposed_date: service?.requested_date || new Date().toISOString().split('T')[0],
        })
        .eq("id", id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.propose",
        user_id: session.user.id,
        dossier_id: service?.dossier_id,
        description: `Moskee stelde alternatief gebed voor aan ${service?.dossiers.deceased_name}`,
        metadata: {
          mosque_service_id: id,
          original_prayer: service?.prayer,
          proposed_prayer: proposedPrayer,
          requested_date: service?.requested_date,
        },
      });

      toast({
        title: "🔄 Voorstel verzonden",
        description: `Alternatief gebed voorgesteld: ${prayerLabels[proposedPrayer]}`,
      });

      navigate("/moskee");
    } catch (error) {
      console.error("Error proposing alternative:", error);
      toast({
        title: "Fout",
        description: "Kon voorstel niet verzenden",
        variant: "destructive",
      });
    }
  };

  const getNextAvailablePrayer = () => {
    const currentPrayer = service?.prayer;
    const prayers = ["FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA"];
    const currentIndex = currentPrayer ? prayers.indexOf(currentPrayer) : -1;
    
    if (currentIndex >= 0 && currentIndex < prayers.length - 1) {
      return prayers[currentIndex + 1];
    }
    return "DHUHR"; // Default fallback
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  if (!service) {
    return <div className="p-6">Aanvraag niet gevonden</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/moskee")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Aanvraag — Dossier {service.dossiers.display_id || service.dossiers.ref_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Janāza-gebed (informeren/plannen)
          </p>
        </div>
      </div>

      {/* Context Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Overledene & Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Naam</p>
              <p className="font-medium text-sm">{service.dossiers.deceased_name || "—"}</p>
            </div>
            {service.dossiers.date_of_death && (
              <div>
                <p className="text-sm text-muted-foreground">Overlijdensdatum</p>
                <p className="font-medium text-sm">
                  {format(new Date(service.dossiers.date_of_death), "d MMMM yyyy", { locale: nl })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Dossier-ID</p>
              <p className="font-medium font-mono text-sm">
                {service.dossiers.display_id || service.dossiers.ref_number}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline" className="text-xs">Janāza-gebed (informeren/plannen)</Badge>
            </div>
            {service.dossiers.legal_hold && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  ⚠️ Legal Hold
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Dossier onder legal hold
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Gevraagd</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Dag</p>
              <p className="font-medium text-sm">
                {service.requested_date
                  ? format(new Date(service.requested_date), "EEEE d MMMM", { locale: nl })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gebed</p>
              <p className="font-medium text-sm">
                {service.prayer ? prayerLabels[service.prayer] : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="text-xs">
                {service.status === "OPEN"
                  ? "Open"
                  : service.status === "CONFIRMED"
                  ? "Bevestigd"
                  : service.status === "DECLINED"
                  ? "Niet mogelijk"
                  : service.status}
              </Badge>
            </div>
            {service.note && (
              <div>
                <p className="text-sm text-muted-foreground">Notitie</p>
                <p className="text-sm">{service.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {service.status === "OPEN" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Acties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConfirm} size="sm" className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-2" />
                Bevestigen
              </Button>
              <Button
                onClick={() => setShowDeclineForm(!showDeclineForm)}
                variant="destructive"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Niet mogelijk
              </Button>
              <Button
                onClick={() => setShowProposalForm(!showProposalForm)}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Ander gebed voorstellen
              </Button>
            </div>

            {/* Decline Form */}
            {showDeclineForm && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-300">
                    Niet mogelijk (reden verplicht)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Reden (minimaal 8 tekens)
                    </label>
                    <Textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Bijvoorbeeld: Overmacht (brandalarm), Sluiting i.v.m. Eid-gebed, Geen imam beschikbaar..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {declineReason.length}/8 tekens minimaal
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      💡 Systeemvoorstel
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Eerstvolgende open gebed: {prayerLabels[getNextAvailablePrayer()]}
                    </p>
                  </div>
                  <Button
                    onClick={handleDecline}
                    variant="destructive"
                    className="w-full"
                    disabled={declineReason.trim().length < 8}
                  >
                    Bevestig afwijzing met reden
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Proposal Form */}
            {showProposalForm && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-700 dark:text-amber-300">
                    Ander gebed voorstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alternatief gebed</label>
                    <Select value={proposedPrayer} onValueChange={setProposedPrayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een gebed" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FAJR">Fajr</SelectItem>
                        <SelectItem value="DHUHR">Dhuhr</SelectItem>
                        <SelectItem value="ASR">Asr</SelectItem>
                        <SelectItem value="MAGHRIB">Maghrib</SelectItem>
                        <SelectItem value="ISHA">Isha</SelectItem>
                        <SelectItem value="JUMUAH">Jumu'ah (vrijdag)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleProposal} variant="outline" className="w-full">
                    Stuur voorstel
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
        <p>
          💡 <strong>Hint:</strong> Aanvragen zijn informeel — bevestigen is standaard. Alleen weigeren
          bij overmacht (met reden). Het systeem stelt automatisch een alternatief voor.
        </p>
      </div>
    </div>
  );
}
