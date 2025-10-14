import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  scope: string;
}

export default function AdminConfig() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      toast({
        title: t("adminConfig.loadError"),
        description: t("adminConfig.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string, enabled: boolean) => {
    setFlags((prev) =>
      prev.map((flag) => (flag.key === key ? { ...flag, enabled } : flag))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const flag of flags) {
        const { error } = await supabase
          .from("feature_flags")
          .update({ enabled: flag.enabled })
          .eq("key", flag.key);

        if (error) throw error;
      }

      await supabase.rpc("log_admin_action", {
        p_action: "FEATURE_FLAGS_UPDATED",
        p_target_type: "Config",
        p_target_id: null,
      });

      toast({
        title: t("adminConfig.saved"),
        description: t("adminConfig.savedDesc"),
      });

      fetchFeatureFlags();
    } catch (error) {
      console.error("Error saving feature flags:", error);
      toast({
        title: t("common.error"),
        description: t("adminConfig.saveError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t("admin.config.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.config.description")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("admin.config.saving") : t("admin.config.save")}
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.config.featureFlags")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.feature")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.description")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.scope")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    {t("admin.config.noFeatureFlags")}
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => (
                  <TableRow key={flag.key} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{flag.key}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {flag.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{flag.scope}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                        />
                        <Label className="text-sm">
                          {flag.enabled ? t("common.on") : t("common.off")}
                        </Label>
                      </div>
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
