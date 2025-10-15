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
export const getStatusLabelsFD = (t: any) => ({
  CREATED: {
    label: t("statusLabels.fd.created.label"),
    color: "yellow",
    description: t("statusLabels.fd.created.description"),
  },
  IN_PROGRESS: {
    label: t("statusLabels.fd.inProgress.label"),
    color: "green",
    description: t("statusLabels.fd.inProgress.description"),
  },
  UNDER_REVIEW: {
    label: t("statusLabels.fd.underReview.label"),
    color: "emerald",
    description: t("statusLabels.fd.underReview.description"),
  },
  COMPLETED: {
    label: t("statusLabels.fd.completed.label"),
    color: "cyan",
    description: t("statusLabels.fd.completed.description"),
  },
  CLOSED: {
    label: t("statusLabels.fd.closed.label"),
    color: "gray",
    description: t("statusLabels.fd.closed.description"),
  }
});


// Labels voor admins (uitgebreider)
export const getStatusLabelsAdmin = (t: any) => ({
  CREATED: {
    label: t("statusLabels.admin.created.label"),
    color: "yellow",
    description: t("statusLabels.admin.created.description"),
  },
  IN_PROGRESS: {
    label: t("statusLabels.admin.inProgress.label"),
    color: "green",
    description: t("statusLabels.admin.inProgress.description"),
  },
  UNDER_REVIEW: {
    label: t("statusLabels.admin.underReview.label"),
    color: "emerald",
    description: t("statusLabels.admin.underReview.description"),
  },
  COMPLETED: {
    label: t("statusLabels.admin.completed.label"),
    color: "cyan",
    description: t("statusLabels.admin.completed.description"),
  },
  CLOSED: {
    label: t("statusLabels.admin.closed.label"),
    color: "gray",
    description: t("statusLabels.admin.closed.description"),
  }
});

export const STATUS_BADGES: Record<string, any> = {
  CREATED: "secondary",
  IN_PROGRESS: "default",
  UNDER_REVIEW: "default",
  COMPLETED: "default",
  CLOSED: "secondary",
};

// Helper function to get the right labels based on user role
export const getStatusLabels = (isAdmin: boolean, t: any) => {
  return isAdmin ? getStatusLabelsAdmin(t) : getStatusLabelsFD(t);
};

// Backward compatibility - simple label mapping (for non-i18n usage)
export const STATUS_LABELS_FD_LEGACY: Record<string, string> = {
  CREATED: "Nieuw dossier",
  IN_PROGRESS: "In behandeling",
  UNDER_REVIEW: "In controle",
  COMPLETED: "Operationeel afgerond",
  CLOSED: "Gearchiveerd"
};

export function StatusChanger({ dossierId, currentStatus, onStatusChanged, isAdmin = false }: StatusChangerProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [openTasks, setOpenTasks] = useState(0);
  const [canProgress, setCanProgress] = useState(false);

  const statusLabels = getStatusLabels(isAdmin, t);
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
        title: t("toasts.success.statusUpdated"),
        description: t("toasts.success.statusUpdatedDesc", { status: statusLabels[newStatus]?.label }),
      });

      setOpen(false);
      setReason("");
      onStatusChanged();
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({
        title: t("toasts.errors.error"),
        description: t("toasts.errors.couldNotChangeStatus"),
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
            {t("statusChanger.title")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("statusChanger.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Blokkade waarschuwing */}
            {blockInfo?.blocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{blockInfo.message}</strong>
                  <br />
                  {blockInfo.reason && <span className="text-sm">{t("statusChanger.blockedReason")}: {blockInfo.reason}</span>}
                  {blockInfo.authority && (
                    <span className="text-sm block">{t("statusChanger.blockedAuthority")}: {blockInfo.authority}</span>
                  )}
                  {blockInfo.contact && (
                    <span className="text-sm block">{t("statusChanger.blockedContact")}: {blockInfo.contact}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Open taken waarschuwing */}
            {openTasks > 0 && !isAdmin && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {t("statusChanger.openTasksWarning", { count: openTasks })}
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-progressie hint */}
            {canProgress && openTasks === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t("statusChanger.allTasksComplete")}
                </AlertDescription>
              </Alert>
            )}

            {/* Current Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("statusChanger.currentStatus")}</span>
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
              <Label className="text-sm font-medium">{t("statusChanger.newStatus")}</Label>
              
              {allowedNextStatuses.length === 0 && !isAdmin ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("statusChanger.noChangesAllowed")}
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
              <Label htmlFor="reason" className="text-sm">{t("statusChanger.reasonLabel")}</Label>
            <Textarea
              id="reason"
              placeholder={t("forms.placeholders.statusChangeReason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={!newStatus || newStatus === currentStatus}
            >
              {t("common.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
