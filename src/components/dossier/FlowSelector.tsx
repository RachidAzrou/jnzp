import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Plane, MapPin } from "lucide-react";

interface FlowSelectorProps {
  dossierId: string;
  currentFlow: string;
  onFlowChanged: () => void;
}

export function FlowSelector({ dossierId, currentFlow, onFlowChanged }: FlowSelectorProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFlowChange = async (newFlow: string) => {
    // Update flow - status and tasks will be updated automatically by database triggers
    const { error } = await supabase
      .from("dossiers")
      .update({ flow: newFlow as "LOC" | "REP" | "UNSET" })
      .eq("id", dossierId);

    if (error) {
      toast({
        title: t("common.error"),
        description: t("flow.flowError"),
        variant: "destructive",
      });
      return;
    }

    const flowType = newFlow === 'REP' ? t("flow.repatriation") : t("flow.local");
    toast({
      title: t("flow.flowChanged"),
      description: t("flow.flowChangedDesc", { flowType }),
    });

    onFlowChanged();
  };

  return (
    <Select value={currentFlow} onValueChange={handleFlowChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t("flow.selectPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UNSET">
          <span className="text-muted-foreground">{t("flow.notSet")}</span>
        </SelectItem>
        <SelectItem value="LOC">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{t("flow.local")}</span>
          </div>
        </SelectItem>
        <SelectItem value="REP">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            <span>{t("flow.repatriation")}</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
