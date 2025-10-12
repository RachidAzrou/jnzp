import { useState } from "react";
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
import { Edit, AlertCircle, CheckCircle2, Lock, ArrowRight, Circle, Shield } from "lucide-react";
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

  const statusLabels = getStatusLabels(isAdmin);
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === currentStatus) {
      toast({
        title: "Geen wijziging",
        description: "Selecteer een andere status",
        variant: "destructive",
      });
      return;
    }

    // Check if admin override is needed for restricted transitions
    if (!isAdmin && !allowedNextStatuses.includes(newStatus)) {
      toast({
        title: "Niet toegestaan",
        description: "Deze statuswijziging vereist admin rechten",
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
        title: "Status bijgewerkt",
        description: `Status gewijzigd naar: ${statusLabels[newStatus]?.label}`,
      });

      setOpen(false);
      setReason("");
      onStatusChanged();
    } catch (error: any) {
      console.error("Error changing status:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon status niet wijzigen",
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Status wijzigen</DialogTitle>
            <DialogDescription>
              Wijzig de status van dit dossier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Huidige status
              </Label>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={STATUS_BADGES[currentStatus] as any}
                    className="text-sm px-3 py-1"
                  >
                    {statusLabels[currentStatus]?.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {statusLabels[currentStatus]?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Status History */}
            <DossierStatusHistory 
              dossierId={dossierId}
              currentStatus={currentStatus}
            />

            {/* New Status Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Nieuwe status
              </Label>
              
              {allowedNextStatuses.length === 0 && !isAdmin ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Geen statuswijzigingen mogelijk vanuit de huidige status.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-2">
                  {(isAdmin ? STATUSES : allowedNextStatuses).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      disabled={status === currentStatus}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all text-left
                        ${newStatus === status 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${status === currentStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {newStatus === status && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        <Badge 
                          variant={STATUS_BADGES[status] as any}
                          className="text-sm"
                        >
                          {statusLabels[status]?.label}
                        </Badge>
                        {!allowedNextStatuses.includes(status) && isAdmin && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground pl-8">
                        {statusLabels[status]?.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason (optional) */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm">
                Reden (optioneel)
              </Label>
              <Textarea
                id="reason"
                placeholder="Waarom wordt de status gewijzigd?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
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
