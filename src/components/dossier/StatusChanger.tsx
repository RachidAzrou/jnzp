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
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");

  const handleStatusChange = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden voor de statuswijziging",
        variant: "destructive",
      });
      return;
    }

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

    // Log action
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from("audit_events").insert({
      user_id: userId,
      event_type: "DOSSIER_STATUS_OVERRIDE",
      target_type: "Dossier",
      target_id: dossierId,
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
    setReason("");
    onStatusChanged();
  };

  return (
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
  );
}
