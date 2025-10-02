import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type MosqueService = {
  id: string;
  dossier_id: string;
  requested_at: string;
  requested_slot: string | null;
  status: string;
  dossiers: {
    ref_number: string;
    deceased_name: string;
  };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-warning text-warning-foreground",
  CONFIRMED: "bg-success text-success-foreground",
  DECLINED: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  PENDING: "Openstaand",
  CONFIRMED: "Bevestigd",
  DECLINED: "Afgewezen",
};

export default function MoskeeDashboard() {
  const navigate = useNavigate();
  const [services, setServices] = useState<MosqueService[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
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
        query = query.eq("status", statusFilter as "PENDING" | "CONFIRMED" | "DECLINED");
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

  const filteredServices = services.filter(
    (service) =>
      service.dossiers.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Moskee — Aanvragen</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/moskee/beschikbaarheid")}>
            Beschikbaarheid
          </Button>
          <Button onClick={() => navigate("/moskee/notificaties")} variant="outline">
            Notificaties
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
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
              <option value="PENDING">Openstaand</option>
              <option value="CONFIRMED">Bevestigd</option>
              <option value="DECLINED">Afgewezen</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Ontvangen</th>
                  <th className="text-left p-3">Dossier</th>
                  <th className="text-left p-3">Overledene</th>
                  <th className="text-left p-3">Voorgesteld</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actie</th>
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
                      {service.requested_slot
                        ? format(new Date(service.requested_slot), "EEE dd MMM HH:mm", {
                            locale: nl,
                          })
                        : "ASAP"}
                    </td>
                    <td className="p-3">
                      <Badge className={statusColors[service.status]}>
                        {statusLabels[service.status] || service.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/moskee/aanvraag/${service.id}`)}
                      >
                        Openen
                      </Button>
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
  );
}
