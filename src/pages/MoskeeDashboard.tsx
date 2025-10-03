import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type MosqueService = {
  id: string;
  dossier_id: string;
  requested_at: string;
  requested_date: string | null;
  prayer: string | null;
  status: string;
  dossiers: {
    ref_number: string;
    deceased_name: string;
  };
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500 text-white",
  CONFIRMED: "bg-green-500 text-white",
  DECLINED: "bg-red-500 text-white",
  PROPOSED: "bg-amber-500 text-white",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  CONFIRMED: "Bevestigd",
  DECLINED: "Niet mogelijk",
  PROPOSED: "Voorstel gedaan",
};

const prayerLabels: Record<string, string> = {
  FAJR: "Fajr",
  DHUHR: "Dhuhr",
  ASR: "Asr",
  MAGHRIB: "Maghrib",
  ISHA: "Isha",
  JUMUAH: "Jumu'ah",
};

export default function MoskeeDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<MosqueService[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, [statusFilter]);

  const fetchServices = async () => {
    try {
      let query = supabase
        .from("mosque_services")
        .select("*, dossiers(ref_number, deceased_name)")
        .order("requested_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setServices(data as any);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickConfirm = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get service details for audit
      const service = services.find(s => s.id === serviceId);

      const { error } = await supabase
        .from("mosque_services")
        .update({ status: "CONFIRMED" })
        .eq("id", serviceId);

      if (error) throw error;

      // Audit log
      if (service) {
        await supabase.from("audit_events").insert({
          event_type: "mosque.confirm",
          user_id: session.user.id,
          dossier_id: service.dossier_id,
          description: `Moskee bevestigde janāza-gebed (snelbevestiging) voor ${service.dossiers.deceased_name}`,
          metadata: {
            mosque_service_id: serviceId,
            prayer: service.prayer,
            requested_date: service.requested_date,
            quick_confirm: true,
          },
        });
      }

      toast({
        title: "Bevestigd",
        description: "Aanvraag is bevestigd",
      });

      fetchServices();
    } catch (error) {
      console.error("Error confirming service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet bevestigen",
        variant: "destructive",
      });
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.dossiers.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Moskee — Aanvragen
            </h1>
            <p className="text-lg text-muted-foreground">Beheer en bevestig janāza-gebed aanvragen</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/moskee/beschikbaarheid")}>
              Beschikbaarheid
            </Button>
          <Button onClick={() => navigate("/moskee/notificaties")} variant="outline">
            Notificaties
          </Button>
          </div>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent pb-5">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Alle</option>
              <option value="OPEN">Open</option>
              <option value="CONFIRMED">Bevestigd</option>
              <option value="DECLINED">Niet mogelijk</option>
              <option value="PROPOSED">Voorstel gedaan</option>
            </select>
          </div>
          </CardHeader>
          <CardContent className="pt-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Ontvangen</th>
                  <th className="text-left p-3">Dossier</th>
                  <th className="text-left p-3">Overledene</th>
                  <th className="text-left p-3">Gevraagd</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      {format(new Date(service.requested_at), "dd MMM HH:mm", { locale: nl })}
                    </td>
                    <td className="p-3 font-medium">{service.dossiers.ref_number}</td>
                    <td className="p-3">{service.dossiers.deceased_name}</td>
                    <td className="p-3">
                      {service.requested_date && service.prayer
                        ? `${format(new Date(service.requested_date), "EEE dd MMM", { locale: nl })} • ${prayerLabels[service.prayer] || service.prayer}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        Informeel
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={statusColors[service.status]}>
                        {statusLabels[service.status] || service.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {service.status === "OPEN" && (
                          <Button
                            size="sm"
                            onClick={(e) => handleQuickConfirm(service.id, e)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Bevestigen
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/moskee/aanvraag/${service.id}`)}
                        >
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Geen aanvragen gevonden
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
