import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Integration {
  id: string;
  organization_id: string;
  provider: string;
  status: string;
  error_message: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export default function AdminIntegrations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("integration_refs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon integraties niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from("integration_refs")
        .update({ 
          status: "ACTIVE",
          error_message: null,
        })
        .eq("id", integrationId);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "INTEGRATION_RETRY",
        p_target_type: "Integration",
        p_target_id: integrationId,
      });

      toast({
        title: "Opnieuw geprobeerd",
        description: "Integratie status is gereset",
      });

      fetchIntegrations();
    } catch (error) {
      console.error("Error retrying integration:", error);
      toast({
        title: "Fout",
        description: "Kon integratie niet opnieuw proberen",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("status.active")}
          </Badge>
        );
      case "ERROR":
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs">
            <AlertCircle className="mr-1 h-3 w-3" />
            {t("common.error")}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      mawaqit: "Mawaqit API",
      insurer_api: "Verzekeraar API",
    };
    return labels[provider] || provider;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Activity className="h-6 w-6" />
          {t("admin.integrations.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("admin.integrations.description")}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.integrations.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.provider")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.status")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.lastSync")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.errorMessage")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    {t("admin.integrations.noIntegrations")}
                  </TableCell>
                </TableRow>
              ) : (
                integrations.map((integration) => (
                  <TableRow key={integration.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">
                      {getProviderLabel(integration.provider)}
                    </TableCell>
                    <TableCell>{getStatusBadge(integration.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {integration.last_sync_at
                        ? new Date(integration.last_sync_at).toLocaleString("nl-NL")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {integration.error_message || "—"}
                    </TableCell>
                    <TableCell>
                      {integration.status === "ERROR" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(integration.id)}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          {t("admin.integrations.retry")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
