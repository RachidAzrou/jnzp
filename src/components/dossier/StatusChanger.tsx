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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";
import { AdvisoryDialog } from "./AdvisoryDialog";
import { useTranslation } from "react-i18next";

interface StatusChangerProps {
  dossierId: string;
  currentStatus: string;
  onStatusChanged: () => void;
  isAdmin?: boolean;
}

const STATUSES = [
  "CREATED",
  "INTAKE_IN_PROGRESS",
  "DOCS_PENDING",
  "FD_ASSIGNED",
  "DOCS_VERIFIED",
  "APPROVED",
  "LEGAL_HOLD",
  "PLANNING",
  "READY_FOR_TRANSPORT",
  "IN_TRANSIT",
  "ARCHIVED",
];

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Aangemaakt",
  INTAKE_IN_PROGRESS: "Intake lopend",
  DOCS_PENDING: "Documenten vereist",
  FD_ASSIGNED: "FD toegewezen",
  DOCS_VERIFIED: "Docs geverifieerd",
  APPROVED: "Goedgekeurd",
  LEGAL_HOLD: "Legal Hold",
  PLANNING: "Planning",
  READY_FOR_TRANSPORT: "Klaar voor transport",
  IN_TRANSIT: "In transit",
  ARCHIVED: "Gearchiveerd",
};

export function StatusChanger({ dossierId, currentStatus, onStatusChanged, isAdmin = false }: StatusChangerProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [advisoryConfig, setAdvisoryConfig] = useState<{
    title: string;
    message: string;
    checklistItems: string[];
  } | null>(null);

  const getAdvisoryForStatus = (status: string) => {
    const advisories: Record<string, { title: string; message: string; checklistItems: string[] }> = {
      DOCS_VERIFIED: {
        title: t("advisory.docsVerified.title"),
        message: t("advisory.docsVerified.message"),
        checklistItems: t("advisory.docsVerified.checklist", { returnObjects: true }) as string[]
      },
      PLANNING: {
        title: t("advisory.planningReady.title"),
        message: t("advisory.planningReady.message"),
        checklistItems: t("advisory.planningReady.checklist", { returnObjects: true }) as string[]
      },
      READY_FOR_TRANSPORT: {
        title: t("advisory.readyForTransport.title"),
        message: t("advisory.readyForTransport.message"),
        checklistItems: t("advisory.readyForTransport.checklist", { returnObjects: true }) as string[]
      },
      ARCHIVED: {
        title: t("advisory.archiveDossier.title"),
        message: t("advisory.archiveDossier.message"),
        checklistItems: t("advisory.archiveDossier.checklist", { returnObjects: true }) as string[]
      }
    };
    
    return advisories[status] || null;
  };

  const handleStatusChange = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden voor de statuswijziging",
        variant: "destructive",
      });
      return;
    }

    // Check if advisory is needed
    const advisory = getAdvisoryForStatus(newStatus);
    if (advisory && !isAdmin) {
      setAdvisoryConfig(advisory);
      setShowAdvisory(true);
      return;
    }

    await performStatusChange();
  };

  const performStatusChange = async () => {

    const { error } = await supabase
      .from("dossiers")
      .update({ 
        status: newStatus as "CREATED" | "INTAKE_IN_PROGRESS" | "DOCS_PENDING" | "FD_ASSIGNED" | "DOCS_VERIFIED" | "APPROVED" | "LEGAL_HOLD" | "PLANNING" | "READY_FOR_TRANSPORT" | "IN_TRANSIT" | "ARCHIVED"
      })
      .eq("id", dossierId);

    if (error) {
      toast({
        title: "Fout",
        description: "Status kon niet worden gewijzigd",
        variant: "destructive",
      });
      return;
    }

    // Send notification to family if status changed to specific states
    const notifiableStatuses = ["DOCS_VERIFIED", "PLANNING", "READY_FOR_TRANSPORT", "ARCHIVED"];
    if (notifiableStatuses.includes(newStatus)) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              dossierId,
              triggerEvent: `STATUS_${newStatus}`,
              recipientType: "FAMILY",
            }),
          }
        );
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
        // Don't block the status change if notification fails
      }
    }

    // Log action with organization context
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Get user's organization and role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .single();

    await supabase.from("audit_events").insert({
      user_id: userId,
      organization_id: userRole?.organization_id,
      actor_role: userRole?.role,
      event_type: "DOSSIER_STATUS_OVERRIDE",
      target_type: "Dossier",
      target_id: dossierId,
      dossier_id: dossierId,
      description: `Status gewijzigd van ${currentStatus} naar ${newStatus}`,
      reason,
      metadata: { from_status: currentStatus, to_status: newStatus },
    });

    await supabase.from("dossier_events").insert({
      dossier_id: dossierId,
      event_type: "STATUS_CHANGED",
      event_description: `Status gewijzigd: ${STATUS_LABELS[currentStatus]} → ${STATUS_LABELS[newStatus]}`,
      created_by: userId,
      metadata: { reason },
    });

    toast({
      title: "Status gewijzigd",
      description: `Status is nu: ${STATUS_LABELS[newStatus]}`,
    });

    setOpen(false);
    setShowAdvisory(false);
    setReason("");
    onStatusChanged();
  };

  const handleAdvisoryConfirm = async () => {
    await performStatusChange();
  };

  return (
    <>
      <AdvisoryDialog
        open={showAdvisory}
        onOpenChange={setShowAdvisory}
        title={advisoryConfig?.title || ""}
        message={advisoryConfig?.message || ""}
        checklistItems={advisoryConfig?.checklistItems || []}
        onConfirm={handleAdvisoryConfirm}
        onCancel={() => setShowAdvisory(false)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Status wijzigen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Status wijzigen</DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? "Als admin kun je elke status instellen. Deze actie wordt gelogd."
              : "Wijzig de dossier status volgens de workflow."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nieuwe status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reden voor wijziging *</Label>
            <Textarea
              placeholder="Bijv. 'Documenten ontvangen van familie'"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button onClick={handleStatusChange}>
            Status wijzigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
