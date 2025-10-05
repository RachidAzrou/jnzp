import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { nl, fr, enUS } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, MapPin, User, Phone, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface FDRequest {
  id: string;
  dossier_id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  created_at: string;
  expires_at: string;
  dossier: {
    display_id: string;
    deceased_name: string;
    flow: string;
    date_of_death: string;
    family_contacts: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  };
}

export default function FDIncomingRequests() {
  const [requests, setRequests] = useState<FDRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FDRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const getDateLocale = () => {
    switch (i18n.language) {
      case "fr": return fr;
      case "en": return enUS;
      default: return nl;
    }
  };

  useEffect(() => {
    fetchRequests();
    setupRealtimeSubscription();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch FD requests with dossier and family contact information
      const { data, error } = await (supabase as any)
        .from("fd_requests")
        .select(`
          *,
          dossier:dossiers!inner(
            display_id,
            deceased_name,
            flow,
            date_of_death,
            family_contacts(
              name,
              phone,
              relationship
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({
        title: t("fdRequests.errors.error"),
        description: t("fdRequests.errors.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("fd_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fd_requests",
        },
        (payload) => {
          console.log("FD request change:", payload);
          fetchRequests();
          
          if (payload.eventType === "INSERT") {
            toast({
              title: t("fdRequests.notifications.newRequest"),
              description: t("fdRequests.notifications.newRequestDescription"),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAccept = async (requestId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("accept_fd_request" as any, {
        p_request_id: requestId,
        p_user_id: user.id,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: t("fdRequests.notifications.accepted"),
          description: t("fdRequests.notifications.acceptedDescription"),
        });
        fetchRequests();
      } else {
        throw new Error((data as any)?.error || "Acceptatie mislukt");
      }
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast({
        title: t("fdRequests.errors.error"),
        description: error.message || t("fdRequests.errors.acceptFailed"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest || !declineReason.trim()) {
      toast({
        title: t("fdRequests.notifications.reasonRequired"),
        description: t("fdRequests.notifications.reasonRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("decline_fd_request" as any, {
        p_request_id: selectedRequest.id,
        p_user_id: user.id,
        p_reason: declineReason,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: t("fdRequests.notifications.declined"),
          description: t("fdRequests.notifications.declinedDescription"),
        });
        setShowDeclineDialog(false);
        setDeclineReason("");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        throw new Error((data as any)?.error || "Weigering mislukt");
      }
    } catch (error: any) {
      console.error("Error declining request:", error);
      toast({
        title: t("fdRequests.errors.error"),
        description: error.message || t("fdRequests.errors.declineFailed"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; labelKey: string; icon: any }> = {
      PENDING: { variant: "default", labelKey: "fdRequests.status.pending", icon: Clock },
      ACCEPTED: { variant: "success", labelKey: "fdRequests.status.accepted", icon: CheckCircle },
      DECLINED: { variant: "destructive", labelKey: "fdRequests.status.declined", icon: XCircle },
      EXPIRED: { variant: "secondary", labelKey: "fdRequests.status.expired", icon: Clock },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(config.labelKey)}
      </Badge>
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const processedRequests = requests.filter((r) => r.status !== "PENDING");

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {t("fdRequests.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("fdRequests.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          {t("fdRequests.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {pendingRequests.length} {t("fdRequests.newRequests")}{pendingRequests.length === 1 ? t("fdRequests.newRequest") : t("fdRequests.newRequestsPlural")}
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">{t("fdRequests.newRequestsSection")}</h2>
          {pendingRequests.map((request) => (
            <Card
              key={request.id}
              className="border-primary/20 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg">
                      {request.dossier.deceased_name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {t("fdRequests.dossier")} {request.dossier.display_id}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {request.dossier.flow === "LOC" ? t("fdRequests.local") : t("fdRequests.repatriation")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {request.dossier.date_of_death
                        ? format(new Date(request.dossier.date_of_death), "d MMM yyyy", { locale: getDateLocale() })
                        : t("fdRequests.unknown")}
                    </span>
                  </div>
                  {request.dossier.family_contacts?.[0] && (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {request.dossier.family_contacts[0].name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {request.dossier.family_contacts[0].phone}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {t("fdRequests.expiresAt")}{" "}
                    {format(new Date(request.expires_at), "HH:mm", { locale: getDateLocale() })}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => handleAccept(request.id)}
                    disabled={processing}
                    className="flex-1 min-h-[44px]"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("fdRequests.acceptButton")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDeclineDialog(true);
                    }}
                    disabled={processing}
                    className="flex-1 min-h-[44px]"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t("fdRequests.declineButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">{t("fdRequests.processedRequestsSection")}</h2>
          {processedRequests.map((request) => (
            <Card key={request.id} className="opacity-60">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      {request.dossier.deceased_name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {t("fdRequests.dossier")} {request.dossier.display_id}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p className="text-sm sm:text-base">{t("fdRequests.noRequests")}</p>
          </CardContent>
        </Card>
      )}

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("fdRequests.declineDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("fdRequests.declineDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">{t("fdRequests.declineDialog.reasonLabel")}</Label>
              <Textarea
                id="reason"
                placeholder={t("fdRequests.declineDialog.reasonPlaceholder")}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setDeclineReason("");
                setSelectedRequest(null);
              }}
              className="min-h-[44px]"
            >
              {t("fdRequests.declineDialog.cancelButton")}
            </Button>
            <Button
              onClick={handleDecline}
              disabled={processing || !declineReason.trim()}
              variant="destructive"
              className="min-h-[44px]"
            >
              {t("fdRequests.declineDialog.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
