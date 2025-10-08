import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X } from "lucide-react";

type MosqueService = {
  id: string;
  dossier_id: string;
  mosque_org_id: string;
  scheduled_at: string;
  location: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
  cancel_reason: string | null;
  dossier?: {
    display_id: string;
    deceased_name: string;
    assigned_fd_org_id: string;
    organizations?: {
      name: string;
    };
  };
};

export default function MoskeePlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<MosqueService | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch user's mosque org
  const { data: userOrgs } = useQuery({
    queryKey: ["user-mosque-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mosque")
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch mosque services (temporary placeholder until types are regenerated)
  const { data: services, isLoading } = useQuery({
    queryKey: ["mosque-services", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mosque_services" as any)
        .select(`
          *,
          dossier:dossiers (
            display_id,
            deceased_name,
            assigned_fd_org_id,
            organizations:assigned_fd_org_id (name)
          )
        `)
        .eq("mosque_org_id", userOrgs!.organization_id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any as MosqueService[];
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: string; reason: string }) => {
      const { error } = await supabase.rpc("fn_cancel_mosque_service" as any, {
        p_service_id: serviceId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mosque-services"] });
      toast({ title: "Janazah geannuleerd" });
      setCancelDialogOpen(false);
      setSelectedService(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast({ title: "Fout bij annuleren", description: String(error), variant: "destructive" });
    },
  });

  const handleCancelClick = (service: MosqueService) => {
    setSelectedService(service);
    setCancelDialogOpen(true);
  };

  const handleCancelSubmit = () => {
    if (!selectedService) return;
    if (!cancelReason.trim()) {
      toast({ title: "Reden verplicht", variant: "destructive" });
      return;
    }
    cancelMutation.mutate({ serviceId: selectedService.id, reason: cancelReason });
  };

  const filteredServices = services?.filter((s) =>
    s.dossier?.deceased_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.dossier?.display_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Planning</h1>
        <p className="text-muted-foreground">Overzicht geplande janazah-diensten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Geplande diensten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Zoek op naam of dossier-ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : !filteredServices?.length ? (
            <div className="text-center py-8 text-muted-foreground">Geen diensten gevonden</div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{service.dossier?.deceased_name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {service.dossier?.display_id}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          service.status === "CONFIRMED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {service.status === "CONFIRMED" ? "Bevestigd" : "Geannuleerd"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Tijd:</strong>{" "}
                        {format(new Date(service.scheduled_at), "EEEE d MMMM yyyy 'om' HH:mm", {
                          locale: nl,
                        })}
                      </p>
                      {service.location && (
                        <p>
                          <strong>Locatie:</strong> {service.location}
                        </p>
                      )}
                      <p>
                        <strong>Uitvaartondernemer:</strong> {service.dossier?.organizations?.name}
                      </p>
                      {service.cancel_reason && (
                        <p className="text-red-600">
                          <strong>Reden annulering:</strong> {service.cancel_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {service.status === "CONFIRMED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelClick(service)}
                    >
                      Annuleren
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Janazah annuleren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Janazah voor <strong>{selectedService?.dossier?.deceased_name}</strong> op{" "}
                {selectedService &&
                  format(new Date(selectedService.scheduled_at), "EEEE d MMMM yyyy 'om' HH:mm", {
                    locale: nl,
                  })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reden annulering (verplicht)</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Bijv. onverwachte omstandigheden, dubbelboeking..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Terug
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubmit}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Bezig..." : "Annuleren"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
