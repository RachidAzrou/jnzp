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
  "DOCS_VERIFIED",
  "APPROVED",
  "LEGAL_HOLD",
  "PLANNING",
  "READY_FOR_TRANSPORT",
  "IN_TRANSIT",
  "SETTLEMENT",
  "ARCHIVED",
];

export const STATUS_LABELS_FD = {
  CREATED: {
    label: "Nieuw",
    color: "yellow",
    description: "Dossier is aangemaakt maar nog niet gestart."
  },
  INTAKE_IN_PROGRESS: {
    label: "Intake",
    color: "green",
    description: "De intake loopt: gegevens van de overledene en familie worden verzameld."
  },
  DOCS_PENDING: {
    label: "Documenten in behandeling",
    color: "orange",
    description: "Nog niet alle vereiste documenten zijn toegevoegd of goedgekeurd."
  },
  DOCS_VERIFIED: {
    label: "Documenten volledig",
    color: "green",
    description: "Alle documenten zijn ontvangen en gecontroleerd."
  },
  APPROVED: {
    label: "Goedgekeurd",
    color: "emerald",
    description: "Het dossier is administratief goedgekeurd en klaar voor planning."
  },
  LEGAL_HOLD: {
    label: "Juridisch geblokkeerd",
    color: "red",
    description: "Dossier tijdelijk vastgehouden door parket of gerechtelijk onderzoek."
  },
  PLANNING: {
    label: "Planning",
    color: "blue",
    description: "Mortuarium, moskee en begraafplaats worden ingepland."
  },
  READY_FOR_TRANSPORT: {
    label: "Klaar voor uitvoering",
    color: "cyan",
    description: "Alle afspraken liggen vast, klaar voor uitvaart of transport."
  },
  IN_TRANSIT: {
    label: "Uitvoering",
    color: "purple",
    description: "De overledene is onderweg of de ceremonie is bezig."
  },
  SETTLEMENT: {
    label: "Facturatie",
    color: "brown",
    description: "De uitvaart is afgerond; facturen en betalingen worden verwerkt."
  },
  ARCHIVED: {
    label: "Afgerond",
    color: "gray",
    description: "Dossier is volledig afgesloten en gearchiveerd."
  },
};

export const STATUS_LABELS_ADMIN = {
  CREATED: {
    label: "Nieuw dossier aangemaakt",
    color: "yellow",
    description: "Dossier is geregistreerd maar nog niet in behandeling."
  },
  INTAKE_IN_PROGRESS: {
    label: "Intake lopend",
    color: "green",
    description: "De uitvaartondernemer voert de intake uit: gegevens en eerste documenten worden verzameld."
  },
  DOCS_PENDING: {
    label: "Documenten in behandeling",
    color: "orange",
    description: "Er ontbreken nog vereiste documenten of ze wachten op goedkeuring."
  },
  DOCS_VERIFIED: {
    label: "Documenten gecontroleerd",
    color: "green",
    description: "Alle documenten zijn gecontroleerd door de uitvaartondernemer of admin."
  },
  APPROVED: {
    label: "Goedgekeurd door verzekeraar",
    color: "emerald",
    description: "De verzekeraar heeft het dossier goedgekeurd; verdere planning mag starten."
  },
  LEGAL_HOLD: {
    label: "Juridische blokkade (parket)",
    color: "red",
    description: "Het dossier is tijdelijk geblokkeerd door een parket- of politieonderzoek."
  },
  PLANNING: {
    label: "Planningfase gestart",
    color: "blue",
    description: "Mortuarium, moskee en begraafplaats worden ingepland."
  },
  READY_FOR_TRANSPORT: {
    label: "Klaar voor uitvoering",
    color: "cyan",
    description: "Alle voorbereidingen zijn afgerond; het dossier is gereed voor uitvoering of transport."
  },
  IN_TRANSIT: {
    label: "In uitvoering",
    color: "purple",
    description: "De uitvaart of repatriëring is momenteel in uitvoering."
  },
  SETTLEMENT: {
    label: "Financiële afhandeling",
    color: "brown",
    description: "Facturen zijn in behandeling of wachten op betaling / goedkeuring."
  },
  ARCHIVED: {
    label: "Afgerond & gearchiveerd",
    color: "gray",
    description: "Dossier volledig afgesloten; enkel-lezen archiefstatus."
  },
};

export const STATUS_BADGES = {
  CREATED: "yellow",
  INTAKE_IN_PROGRESS: "green",
  DOCS_PENDING: "orange",
  DOCS_VERIFIED: "green",
  APPROVED: "emerald",
  LEGAL_HOLD: "red",
  PLANNING: "blue",
  READY_FOR_TRANSPORT: "cyan",
  IN_TRANSIT: "purple",
  SETTLEMENT: "brown",
  ARCHIVED: "gray",
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
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [advisoryConfig, setAdvisoryConfig] = useState<{
    title: string;
    message: string;
    checklistItems: string[];
  } | null>(null);

  const getAdvisoryForStatus = (status: string) => {
    const advisories: Record<string, { title: string; message: string; checklistItems: string[] }> = {
      operational: {
        title: "Dossier Operationeel maken",
        message: "Bij het operationeel maken van een dossier worden automatisch taken gegenereerd.",
        checklistItems: [
          "Intakegegevens zijn compleet",
          "Flow type (LOC/REP) is ingesteld",
          "Familie contact is vastgelegd"
        ]
      },
      planning_in_progress: {
        title: "Planning starten",
        message: "Zorg dat de benodigde partijen beschikbaar zijn voor planning.",
        checklistItems: [
          "Wassing (mortuarium) beschikbaarheid gecheckt",
          "Moskee (Janāza) beschikbaarheid gecheckt",
          "Bij REP: Vlucht/cargo beschikbaarheid gecheckt"
        ]
      },
      execution_in_progress: {
        title: "Uitvoering starten",
        message: "De praktische uitvoering van de uitvaart begint.",
        checklistItems: [
          "Planning is bevestigd",
          "Familie is geïnformeerd",
          "Documenten zijn in orde"
        ]
      },
      archived: {
        title: "Dossier Archiveren",
        message: "Na archivering wordt het dossier alleen-lezen.",
        checklistItems: [
          "Alle facturen zijn verzameld en ingediend",
          "Uitvoering is afgerond",
          "Familie is geïnformeerd over afronding"
        ]
      }
    };
    
    return advisories[status] || null;
  };

  const handleStatusChange = async () => {
    // Special confirmation for archiving
    if (newStatus === "archived" && !isAdmin) {
      setAdvisoryConfig({
        title: "⚠️ Dossier Archiveren - Bevestiging Vereist",
        message: "Let op: Na archivering wordt het dossier alleen-lezen.",
        checklistItems: [
          "✅ Alle facturen zijn verzameld en ingediend",
          "✅ Uitvoering is volledig afgerond",
          "✅ Familie is geïnformeerd over afronding",
          "⚠️ Dit dossier wordt permanent alleen-lezen"
        ]
      });
      setShowAdvisory(true);
      return;
    }

    // Check if advisory is needed for other statuses
    const advisory = getAdvisoryForStatus(newStatus);
    if (advisory && !isAdmin && newStatus !== "archived") {
      setAdvisoryConfig(advisory);
      setShowAdvisory(true);
      return;
    }

    await performStatusChange();
  };

  const performStatusChange = async () => {
    // Check legal hold before status change
    const { data: dossier } = await supabase
      .from("dossiers")
      .select("legal_hold_active")
      .eq("id", dossierId)
      .single();

    if (dossier?.legal_hold_active && 
        ["PLANNING", "READY_FOR_TRANSPORT", "IN_TRANSIT"].includes(newStatus)) {
      toast({
        title: "Geblokkeerd door Legal Hold",
        description: "Status kan niet worden gewijzigd terwijl legal hold actief is. Hef de legal hold eerst op.",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }

    // Auto-close tasks when moving to settlement
    if (newStatus === "SETTLEMENT") {
      await supabase
        .from("kanban_tasks")
        .update({ column_id: (await getClosedColumnId()) })
        .eq("dossier_id", dossierId)
        .neq("column_id", (await getClosedColumnId()));
    }

    const { error } = await supabase
      .from("dossiers")
      .update({ 
        status: newStatus as any
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

    // Invoice reminder for settlement status
    if (newStatus === "settlement") {
      toast({
        title: "⚠️ Herinnering: Facturen uploaden",
        description: "Vergeet niet alle facturen (intern + extern) te uploaden voor archivering.",
        duration: 8000,
      });
    }

    // Send notification to family if status changed to specific states
    const notifiableStatuses = ["operational", "planning_in_progress", "execution_in_progress", "archived"];
    if (notifiableStatuses.includes(newStatus)) {
      try {
        const { error: notifError } = await supabase.functions.invoke("send-notification", {
          body: {
            dossierId,
            triggerEvent: `STATUS_${newStatus}`,
            recipientType: "FAMILY",
          },
        });
        
        if (notifError) {
          console.error("Error sending notification:", notifError);
        }
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

    // Trigger webhook for status change
    if (userRole?.organization_id) {
      try {
        await supabase.functions.invoke("trigger-webhook", {
          body: {
            event_type: "DOSSIER_STATUS_CHANGED",
            dossier_id: dossierId,
            organization_id: userRole.organization_id,
            metadata: {
              from_status: currentStatus,
              to_status: newStatus,
              reason,
              changed_by: userId,
            },
          },
        });
      } catch (webhookError) {
        console.error("Error triggering webhook:", webhookError);
        // Don't block status change if webhook fails
      }
    }

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

  const getClosedColumnId = async () => {
    const { data } = await supabase
      .from("task_board_columns")
      .select("id")
      .eq("label", "Afgesloten")
      .maybeSingle();
    return data?.id;
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
                {STATUSES.map((status) => {
                  const labels = isAdmin ? STATUS_LABELS_ADMIN : STATUS_LABELS_FD;
                  return (
                    <SelectItem key={status} value={status}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{labels[status as keyof typeof labels].label}</span>
                        <span className="text-xs text-muted-foreground">{labels[status as keyof typeof labels].description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reden voor wijziging (optioneel)</Label>
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
