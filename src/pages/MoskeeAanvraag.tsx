import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

type MosqueServiceDetails = {
  id: string;
  dossier_id: string;
  requested_slot: string | null;
  status: string;
  note: string | null;
  dossiers: {
    ref_number: string;
    deceased_name: string;
    legal_hold: boolean;
  };
};

export default function MoskeeAanvraag() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<MosqueServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmedDate, setConfirmedDate] = useState<Date>();
  const [confirmedTime, setConfirmedTime] = useState("");
  const [confirmNote, setConfirmNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [proposalDate, setProposalDate] = useState<Date>();
  const [proposalTime, setProposalTime] = useState("");
  const [proposalNote, setProposalNote] = useState("");

  useEffect(() => {
    if (id) fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from("mosque_services")
        .select("*, dossiers(ref_number, deceased_name, legal_hold)")
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
    if (!confirmedDate || !confirmedTime) {
      toast({
        title: "Fout",
        description: "Datum en tijd zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const [hours, minutes] = confirmedTime.split(":");
      const confirmedSlot = new Date(confirmedDate);
      confirmedSlot.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from("mosque_services")
        .update({
          status: "CONFIRMED",
          confirmed_slot: confirmedSlot.toISOString(),
          note: confirmNote || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Bevestigd",
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
    if (!declineReason || declineReason.length < 8) {
      toast({
        title: "Fout",
        description: "Reden is verplicht (min. 8 tekens)",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("mosque_services")
        .update({
          status: "DECLINED",
          decline_reason: declineReason,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Afgewezen",
        description: "Aanvraag is afgewezen",
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
    if (!proposalDate || !proposalTime) {
      toast({
        title: "Fout",
        description: "Datum en tijd zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const [hours, minutes] = proposalTime.split(":");
      const proposedSlot = new Date(proposalDate);
      proposedSlot.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from("mosque_services")
        .update({
          requested_slot: proposedSlot.toISOString(),
          note: `Voorstel: ${proposalNote || "Alternatief tijdstip"}`,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Voorstel verzonden",
        description: "Alternatief tijdstip is voorgesteld",
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

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  if (!service) {
    return <div className="p-6">Aanvraag niet gevonden</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aanvraag — Dossier {service.dossiers.ref_number}</h1>
        <p className="text-muted-foreground mt-1">Beheer inkomende aanvragen voor janazah diensten</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verzoek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">Janāza-gebed</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Voorgesteld door FD</p>
              <p className="font-medium">
                {service.requested_slot
                  ? format(new Date(service.requested_slot), "EEEE d MMMM HH:mm", { locale: nl })
                  : "ASAP"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{service.status}</p>
            </div>
            {service.dossiers.legal_hold && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm font-medium text-destructive">⚠️ Legal Hold</p>
                <p className="text-xs text-destructive/80">Dossier onder legal hold</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dossier & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Dossier</p>
              <p className="font-medium">{service.dossiers.ref_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overledene</p>
              <p className="font-medium">{service.dossiers.deceased_name}</p>
            </div>
            {service.note && (
              <div>
                <p className="text-sm text-muted-foreground">Notitie FD</p>
                <p className="font-medium">{service.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {service.status === "PENDING" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Bevestigen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !confirmedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {confirmedDate ? format(confirmedDate, "PPP", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={confirmedDate}
                      onSelect={setConfirmedDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Tijd</Label>
                <Input
                  type="time"
                  value={confirmedTime}
                  onChange={(e) => setConfirmedTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Opmerking (optioneel)</Label>
                <Textarea
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="Extra informatie"
                />
              </div>
              <Button onClick={handleConfirm} className="w-full">
                Bevestigen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Afwijzen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reden (verplicht, min. 8 tekens)</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Waarom kan deze aanvraag niet worden geaccepteerd?"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleDecline}
                variant="destructive"
                className="w-full"
                disabled={declineReason.length < 8}
              >
                Afwijzen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voorstel Doen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Alternatief Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !proposalDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {proposalDate ? format(proposalDate, "PPP", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={proposalDate}
                      onSelect={setProposalDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Tijd</Label>
                <Input
                  type="time"
                  value={proposalTime}
                  onChange={(e) => setProposalTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Opmerking (optioneel)</Label>
                <Textarea
                  value={proposalNote}
                  onChange={(e) => setProposalNote(e.target.value)}
                  placeholder="Toelichting bij voorstel"
                />
              </div>
              <Button onClick={handleProposal} variant="outline" className="w-full">
                Opslaan Voorstel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
