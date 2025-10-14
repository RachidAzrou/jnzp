import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, AlertCircle, CheckCircle2, Lock, ArrowRight, Circle, Shield, AlertTriangle, Clock } from "lucide-react";
import { AdvisoryDialog } from "./AdvisoryDialog";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DossierStatusHistory } from "./DossierStatusHistory";

interface StatusChangerProps {
  dossierId: string;
  currentStatus: string;
  onStatusChanged: () => void;
  isAdmin?: boolean;
}

// Vereenvoudigde statussen
const STATUSES = [
  "CREATED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "COMPLETED",
  "CLOSED"
] as const;

// Vereenvoudigde transities
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["IN_PROGRESS"],
  IN_PROGRESS: ["UNDER_REVIEW", "COMPLETED"],
  UNDER_REVIEW: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: ["CLOSED"],
  CLOSED: []
};

// Labels voor FD
export const STATUS_LABELS_FD = {
  CREATED: {
    label: "Nieuw dossier",
    color: "yellow",
    description: "Dossier aangemaakt, nog niet gestart",
  },
  IN_PROGRESS: {
    label: "In behandeling",
    color: "green",
    description: "Intake, documenten of planning bezig",
  },
  UNDER_REVIEW: {
    label: "In controle",
    color: "emerald",
    description: "Verzekeraar controleert de polis",
  },
  COMPLETED: {
    label: "Operationeel afgerond",
    color: "cyan",
    description: "Uitvoering afgerond, klaar voor afsluiting",
  },
  CLOSED: {
    label: "Gearchiveerd",
    color: "gray",
    description: "Financieel afgerond en afgesloten",
  }
};

// Labels voor admins (uitgebreider)
export const STATUS_LABELS_ADMIN = {
  CREATED: {
    label: "Nieuw dossier aangemaakt",
    color: "yellow",
    description: "Dossier is aangemaakt maar nog niet gestart",
  },
  IN_PROGRESS: {
    label: "In behandeling",
    color: "green",
    description: "Intake, documenten, planning of uitvoering bezig",
  },
  UNDER_REVIEW: {
    label: "In controle (API check)",
    color: "emerald",
    description: "Automatische poliscontrole bij verzekeraar loopt",
  },
  COMPLETED: {
    label: "Operationeel afgerond",
    color: "cyan",
    description: "Uitvoering afgerond, klaar voor financiële afsluiting",
  },
  CLOSED: {
    label: "Gearchiveerd",
    color: "gray",
    description: "Volledig afgesloten en gearchiveerd",
  }
};

export const STATUS_BADGES: Record<string, any> = {
  CREATED: "secondary",
  IN_PROGRESS: "default",
  UNDER_REVIEW: "default",
  COMPLETED: "default",
  CLOSED: "secondary",
};

// Helper function to get the right labels based on user role
export const getStatusLabels = (isAdmin: boolean) => {
  return isAdmin ? STATUS_LABELS_ADMIN : STATUS_LABELS_FD;
};

// Backward compatibility - simple label mapping
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_LABELS_FD).map(([key, value]) => [key, value.label])
);

export function StatusChanger({ dossierId, currentStatus, onStatusChanged, isAdmin = false }: StatusChangerProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [openTasks, setOpenTasks] = useState(0);
  const [canProgress, setCanProgress] = useState(false);

  const statusLabels = getStatusLabels(isAdmin);
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

  // Check blokkades en open taken bij openen
  useEffect(() => {
    if (open) {
      checkDossierStatus();
    }
  }, [open, dossierId]);

  const checkDossierStatus = async () => {
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
      setCanProgress(count === 0 && !blockData?.blocked);
    } catch (error) {
      console.error("Error checking dossier status:", error);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === currentStatus) {
      toast({
        title: t("errors.noChange"),
        description: t("errors.selectDifferentStatus"),
        variant: "destructive",
      });
      return;
    }

    // Check blokkades
    if (blockInfo?.blocked) {
      toast({
        variant: "destructive",
        title: t("errors.dossierBlocked"),
        description: blockInfo.message || t("errors.dossierBlockedDescription"),
      });
      return;
    }

    // Check open taken (tenzij admin override)
    if (openTasks > 0 && !isAdmin) {
      toast({
        variant: "destructive",
        title: t("errors.tasksNotCompleted"),
        description: t("errors.tasksNotCompletedDescription", { count: openTasks }),
      });
      return;
    }

    // Check if admin override is needed for restricted transitions
    if (!isAdmin && !allowedNextStatuses.includes(newStatus)) {
      toast({
        title: t("errors.notAllowed"),
        description: t("errors.notAllowedDescription"),
        variant: "destructive",
      });
      return;
    }

    await performStatusChange();
  };

  const performStatusChange = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Update dossier status
      const { error: updateError } = await supabase
        .from("dossiers")
        .update({ status: newStatus as any })
        .eq("id", dossierId);

      if (updateError) throw updateError;

      // Log status change event
      const { error: eventError } = await supabase
        .from("dossier_events")
        .insert({
          dossier_id: dossierId,
          event_type: "STATUS_CHANGED",
          event_description: `Status gewijzigd: ${statusLabels[currentStatus]?.label} → ${statusLabels[newStatus]?.label}`,
          created_by: userId,
          metadata: {
            from: currentStatus,
            to: newStatus,
            reason: reason || null,
            changed_by_admin: isAdmin,
          },
        });

      if (eventError) throw eventError;

      // Log audit event
      await supabase.from("audit_events").insert({
        user_id: userId,
        event_type: "DOSSIER_STATUS_CHANGED",
        target_type: "Dossier",
        target_id: dossierId,
        description: `Status changed from ${currentStatus} to ${newStatus}`,
        metadata: {
          from: currentStatus,
          to: newStatus,
          reason: reason || null,
        },
      });

      toast({
        title: t("errors.statusUpdated"),
        description: t("errors.statusUpdatedDescription", { status: statusLabels[newStatus]?.label }),
      });

      setOpen(false);
      setReason("");
      onStatusChanged();
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({
        title: t("errors.error"),
        description: error.message || t("errors.couldNotChangeStatus"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Status wijzigen
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Status wijzigen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Blokkade waarschuwing */}
            {blockInfo?.blocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{blockInfo.message}</strong>
                  <br />
                  {blockInfo.reason && <span className="text-sm">Reden: {blockInfo.reason}</span>}
                  {blockInfo.authority && (
                    <span className="text-sm block">Autoriteit: {blockInfo.authority}</span>
                  )}
                  {blockInfo.contact && (
                    <span className="text-sm block">Contact: {blockInfo.contact}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Open taken waarschuwing */}
            {openTasks > 0 && !isAdmin && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Er zijn nog <strong>{openTasks} open taken</strong> voor deze status.
                  Rond deze eerst af voordat u de status wijzigt.
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-progressie hint */}
            {canProgress && openTasks === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Alle taken zijn afgerond. Het dossier kan automatisch naar de volgende fase.
                </AlertDescription>
              </Alert>
            )}

            {/* Current Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Huidig:</span>
              <Badge variant={STATUS_BADGES[currentStatus] as any}>
                {statusLabels[currentStatus]?.label}
              </Badge>
            </div>

            {/* Status History */}
            <DossierStatusHistory 
              dossierId={dossierId}
              currentStatus={currentStatus}
            />

            {/* New Status Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nieuwe status</Label>
              
              {allowedNextStatuses.length === 0 && !isAdmin ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Geen statuswijzigingen mogelijk.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1.5">
                  {(isAdmin ? STATUSES : allowedNextStatuses).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      disabled={status === currentStatus}
                      className={`
                        w-full px-3 py-2 rounded-md border transition-all text-left text-sm
                        ${newStatus === status 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        }
                        ${status === currentStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {newStatus === status && (
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className="font-medium">{statusLabels[status]?.label}</span>
                        {!allowedNextStatuses.includes(status) && isAdmin && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-sm">Reden (optioneel)</Label>
              <Textarea
                id="reason"
                placeholder="Waarom wordt de status gewijzigd?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={!newStatus || newStatus === currentStatus}
            >
              Status wijzigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
