import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutoProgressionAlertProps {
  dossierId: string;
  currentStatus: string;
}

export function AutoProgressionAlert({ dossierId, currentStatus }: AutoProgressionAlertProps) {
  const [canProgress, setCanProgress] = useState(false);
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [openTasks, setOpenTasks] = useState(0);
  const [isProgressing, setIsProgressing] = useState(false);

  useEffect(() => {
    checkProgressStatus();

    // Realtime subscription voor task changes
    const channel = supabase
      .channel(`dossier-progress-${dossierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_tasks',
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => {
          checkProgressStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossierId, currentStatus]);

  const checkProgressStatus = async () => {
    try {
      // Check blokkades
      const { data: blocked } = await supabase.rpc("is_dossier_blocked", {
        p_dossier_id: dossierId,
      });
      const blockData = blocked as { blocked?: boolean } | null;
      setBlockInfo(blockData);

      // Tel open taken
      const { count } = await supabase
        .from("kanban_tasks")
        .select("*", { count: "exact", head: true })
        .eq("dossier_id", dossierId)
        .neq("status", "DONE");

      setOpenTasks(count || 0);
      setCanProgress(count === 0 && !blockData?.blocked && currentStatus !== "CLOSED");
    } catch (error) {
      console.error("Error checking progress status:", error);
    }
  };

  const handleManualProgress = async () => {
    setIsProgressing(true);
    try {
      const { data, error } = await supabase.rpc("check_and_progress_dossier", {
        p_dossier_id: dossierId,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string; progressed?: boolean };
      
      if (result?.progressed) {
        window.location.reload(); // Reload om nieuwe status te tonen
      }
    } catch (error) {
      console.error("Error progressing dossier:", error);
    } finally {
      setIsProgressing(false);
    }
  };

  // Niet tonen als dossier al afgesloten is
  if (currentStatus === "CLOSED") {
    return null;
  }

  // Geblokkeerd
  if (blockInfo?.blocked) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dossier voldoet aan voorwaarden maar is geblokkeerd</strong>
          <br />
          Type: {blockInfo.type === "LEGAL_HOLD" ? "Juridisch" : "Verzekeraar"}
          <br />
          {blockInfo.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Open taken
  if (openTasks > 0) {
    return (
      <Alert className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Er zijn nog <strong>{openTasks} open taken</strong> voor de huidige status.
          Rond deze eerst af voordat het dossier naar de volgende fase kan.
        </AlertDescription>
      </Alert>
    );
  }

  // Kan progresseren
  if (canProgress) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong className="text-green-700 dark:text-green-400">Alle taken zijn afgerond!</strong>
            <br />
            <span className="text-sm text-muted-foreground">
              Het dossier kan automatisch naar de volgende fase.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleManualProgress}
            disabled={isProgressing}
            className="ml-4"
          >
            {isProgressing ? "Bezig..." : "Naar volgende fase"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
