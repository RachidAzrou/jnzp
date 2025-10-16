import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X, Calendar, Clock } from "lucide-react";

// Prayer names remain as proper nouns (not translated)

type MosqueService = {
  id: string;
  dossier_id: string;
  scheduled_at: string;
  location_text: string | null;
  status: string;
  notes: string | null;
  metadata: any;
  dossiers: {
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
  const { t } = useTranslation();
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

  // Fetch mosque services from case_events
  const { data: services, isLoading } = useQuery({
    queryKey: ["mosque-services", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_events")
        .select(`
          *,
          dossiers (
            display_id,
            deceased_name,
            assigned_fd_org_id,
            organizations:assigned_fd_org_id (name)
          )
        `)
        .eq("event_type", "MOSQUE_SERVICE")
        .eq("metadata->>mosque_org_id", userOrgs!.organization_id)
        .in("status", ["PLANNED", "STARTED", "DONE"])
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any as MosqueService[];
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ serviceId, reason }: { serviceId: string; reason: string }) => {
      const { error } = await supabase
        .from("case_events")
        .update({ 
          status: "CANCELLED",
          notes: reason
        })
        .eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mosque-services"] });
      toast({ title: t("toast.mosque.janazah_cancelled") });
      setCancelDialogOpen(false);
      setSelectedService(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast({ title: t("toast.error.cancel_failed"), description: String(error), variant: "destructive" });
    },
  });

  const handleCancelClick = (service: MosqueService) => {
    setSelectedService(service);
    setCancelDialogOpen(true);
  };

  const handleCancelSubmit = () => {
    if (!selectedService) return;
    if (!cancelReason.trim()) {
      toast({ title: t("toast.error.reason_required"), variant: "destructive" });
      return;
    }
    cancelMutation.mutate({ serviceId: selectedService.id, reason: cancelReason });
  };

  const filteredServices = services?.filter((s) =>
    s.dossiers?.deceased_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.dossiers?.display_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{t("mosque.label")}</p>
              <h1 className="text-2xl font-bold tracking-tight">{t("mosque.planning.pageTitle")}</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 pl-15">{t("mosque.planning.pageSubtitle")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("mosque.planning.plannedServices")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder={t("placeholders.searchNameDossierID")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">{t("common.loading")}</div>
          ) : !filteredServices?.length ? (
            <div className="text-center py-8 text-muted-foreground">{t("mosque.planning.noServices")}</div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{service.dossiers?.deceased_name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {service.dossiers?.display_id}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          service.status === "PLANNED" || service.status === "STARTED"
                            ? "bg-green-100 text-green-800"
                            : service.status === "DONE"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {service.status === "PLANNED" ? t("mosque.planning.statusPlanned") : service.status === "STARTED" ? t("mosque.planning.statusStarted") : service.status === "DONE" ? t("mosque.planning.statusDone") : t("mosque.planning.statusCancelled")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>{t("mosque.planning.dateLabel")}:</strong>{" "}
                        {format(new Date(service.scheduled_at), "EEEE d MMMM yyyy", {
                          locale: nl,
                        })}
                      </p>
                      {(service.metadata as any)?.prayer_time && (
                        <p>
                          <strong>{t("mosque.planning.prayerLabel")}:</strong> {(service.metadata as any).prayer_time}
                        </p>
                      )}
                      {!(service.metadata as any)?.prayer_time && (
                        <p>
                          <strong>{t("mosque.planning.timeLabel")}:</strong>{" "}
                          {format(new Date(service.scheduled_at), "HH:mm", { locale: nl })}
                        </p>
                      )}
                      {service.location_text && (
                        <p>
                          <strong>{t("mosque.planning.locationLabel")}:</strong> {service.location_text}
                        </p>
                      )}
                      <p>
                        <strong>{t("mosque.planning.fdLabel")}:</strong> {service.dossiers?.organizations?.name}
                      </p>
                      {service.notes && service.status === "CANCELLED" && (
                        <p className="text-red-600">
                          <strong>{t("mosque.planning.cancelReasonLabel")}:</strong> {service.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {(service.status === "PLANNED" || service.status === "STARTED") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelClick(service)}
                    >
                      {t("common.cancel")}
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
            <DialogTitle>{t("mosque.planning.cancelDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {t("mosque.planning.cancelDialogJanazahFor")} <strong>{selectedService?.dossiers?.deceased_name}</strong> {t("mosque.planning.cancelDialogOn")}{" "}
                {selectedService &&
                  format(new Date(selectedService.scheduled_at), "EEEE d MMMM yyyy 'om' HH:mm", {
                    locale: nl,
                  })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t("mosque.planning.cancelDialogReason")}</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("placeholders.unexpectedCircumstances")}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubmit}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? t("common.loading") : t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
