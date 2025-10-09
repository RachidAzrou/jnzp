import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Building2,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Organization {
  id: string;
  name: string;
  type: string;
  verification_status: string;
  provisional: boolean;
  created_at: string;
  contact_email?: string;
  contact_phone?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  business_number?: string;
  address_street?: string;
  address_city?: string;
  address_postcode?: string;
}

interface OrganizationVerificationCardProps {
  organization: Organization;
}

type ActionType = "verify" | "reject" | "more_info" | "migrate" | null;

export function OrganizationVerificationCard({ organization }: OrganizationVerificationCardProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [reason, setReason] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_admin_verify_org' as any, {
        p_org_id: organization.id,
        p_reason: reason || null,
        p_seed_defaults: true
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Organisatie geactiveerd en defaults klaargezet");
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Fout bij activeren: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Reden is verplicht");
      const { data, error } = await supabase.rpc('fn_admin_reject_org' as any, {
        p_org_id: organization.id,
        p_reason: reason
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Organisatie afgewezen");
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Fout bij afwijzen: " + error.message);
    },
  });

  const moreInfoMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Notitie is verplicht");
      const { data, error } = await supabase.rpc('fn_admin_request_more_info' as any, {
        p_org_id: organization.id,
        p_note: reason
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Extra info gevraagd");
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Fout bij info verzoek: " + error.message);
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_admin_migrate_adhoc_dossiers_to_fd' as any, {
        p_fd_org_id: organization.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data.migrated} ad-hoc dossiers gemigreerd`);
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Fout bij migratie: " + error.message);
    },
  });

  const handleOpenDialog = (type: ActionType) => {
    setActionType(type);
    setReason("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setActionType(null);
    setReason("");
  };

  const handleSubmit = () => {
    switch (actionType) {
      case "verify":
        verifyMutation.mutate();
        break;
      case "reject":
        rejectMutation.mutate();
        break;
      case "more_info":
        moreInfoMutation.mutate();
        break;
      case "migrate":
        migrateMutation.mutate();
        break;
    }
  };

  const isPending = verifyMutation.isPending || rejectMutation.isPending || 
                    moreInfoMutation.isPending || migrateMutation.isPending;

  const getStatusBadge = () => {
    switch (organization.verification_status) {
      case "ACTIVE":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Actief</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Afgewezen</Badge>;
      case "REVIEW_REQUIRED":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Extra info</Badge>;
      case "PENDING":
      default:
        return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />In afwachting</Badge>;
    }
  };

  const getTypeLabel = () => {
    switch (organization.type) {
      case "FD":
      case "FUNERAL_DIRECTOR":
        return "Uitvaartondernemer";
      case "MORTUARIUM":
        return "Mortuarium";
      case "MOSQUE":
        return "Moskee";
      case "INSURER":
        return "Verzekeraar";
      default:
        return organization.type;
    }
  };

  const canShowActions = organization.verification_status === "PENDING" || 
                         organization.verification_status === "REVIEW_REQUIRED";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {organization.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {getTypeLabel()}
                {organization.provisional && <span className="text-xs">(Voorlopig)</span>}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            {organization.contact_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{organization.contact_email}</span>
              </div>
            )}
            {organization.contact_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{organization.contact_phone}</span>
              </div>
            )}
            {(organization.address_street || organization.address_city) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {organization.address_street && <>{organization.address_street}, </>}
                  {organization.address_postcode} {organization.address_city}
                </span>
              </div>
            )}
            {organization.business_number && (
              <div className="text-xs text-muted-foreground">
                KVK: {organization.business_number}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Aangemeld: {format(new Date(organization.created_at), "PPP", { locale: nl })}
            </div>
          </div>

          {canShowActions && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleOpenDialog("verify")}
                disabled={isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Activeren
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDialog("more_info")}
                disabled={isPending}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Meer info
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleOpenDialog("reject")}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Afwijzen
              </Button>
            </div>
          )}

          {organization.verification_status === "ACTIVE" && 
           (organization.type === "FD" || organization.type === "FUNERAL_DIRECTOR") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDialog("migrate")}
              disabled={isPending}
              className="w-full"
            >
              Migreer ad-hoc dossiers
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "verify" && "Organisatie activeren"}
              {actionType === "reject" && "Organisatie afwijzen"}
              {actionType === "more_info" && "Extra informatie vragen"}
              {actionType === "migrate" && "Ad-hoc dossiers migreren"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "verify" && "Activeer deze organisatie en zet standaard defaults klaar."}
              {actionType === "reject" && "Wijs deze organisatie definitief af."}
              {actionType === "more_info" && "Vraag aanvullende informatie aan bij deze organisatie."}
              {actionType === "migrate" && "Migreer alle ad-hoc dossiers naar deze FD organisatie."}
            </DialogDescription>
          </DialogHeader>

          {actionType !== "migrate" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="reason">
                {actionType === "verify" && "Notitie (optioneel)"}
                {actionType === "reject" && "Reden (verplicht)"}
                {actionType === "more_info" && "Vraag / Notitie (verplicht)"}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  actionType === "verify" 
                    ? "Eventuele opmerkingen..." 
                    : actionType === "reject"
                    ? "Waarom wordt deze organisatie afgewezen?"
                    : "Welke extra informatie is nodig?"
                }
                rows={4}
              />
            </div>
          )}

          {actionType === "migrate" && (
            <div className="py-4 text-sm text-muted-foreground">
              <p>
                Dit zal alle ad-hoc dossiers die aan deze FD zijn toegewezen, 
                volledig migreren en toegankelijk maken voor de FD.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isPending}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending || (actionType !== "verify" && actionType !== "migrate" && !reason.trim())}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "verify" && "Activeren"}
              {actionType === "reject" && "Afwijzen"}
              {actionType === "more_info" && "Versturen"}
              {actionType === "migrate" && "Migreren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
