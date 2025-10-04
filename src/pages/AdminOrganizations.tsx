import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Organization {
  id: string;
  name: string;
  type: string;
  verification_status: string;
  registration_number: string;
  address: string;
  city: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
  requested_at: string;
}

const AdminOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: "Fout bij laden",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrg) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          verification_status: "ACTIVE",
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "ORG_APPROVED",
        p_target_type: "Organization",
        p_target_id: selectedOrg.id,
        p_metadata: { org_name: selectedOrg.name },
      });

      toast({
        title: "Organisatie goedgekeurd",
        description: `${selectedOrg.name} is geactiveerd.`,
      });

      fetchOrganizations();
      setSelectedOrg(null);
      setActionType(null);
    } catch (error: any) {
      toast({
        title: "Fout bij goedkeuren",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrg || !rejectionReason.trim()) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor afwijzing",
        variant: "destructive",
      });
      return;
    }
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          verification_status: "REJECTED",
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "ORG_REJECTED",
        p_target_type: "Organization",
        p_target_id: selectedOrg.id,
        p_reason: rejectionReason,
        p_metadata: { org_name: selectedOrg.name },
      });

      toast({
        title: "Organisatie afgewezen",
        description: `${selectedOrg.name} is afgewezen.`,
      });

      fetchOrganizations();
      setSelectedOrg(null);
      setActionType(null);
      setRejectionReason("");
    } catch (error: any) {
      toast({
        title: "Fout bij afwijzen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ verification_status: "INACTIVE" })
        .eq("id", org.id);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "ORG_DEACTIVATED",
        p_target_type: "Organization",
        p_target_id: org.id,
        p_metadata: { org_name: org.name },
      });

      toast({
        title: "Organisatie gedeactiveerd",
        description: `${org.name} is gedeactiveerd.`,
      });

      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_VERIFICATION":
        return <Badge variant="outline" className="bg-yellow-50">In afwachting</Badge>;
      case "ACTIVE":
        return <Badge variant="outline" className="bg-green-50">Actief</Badge>;
      case "INACTIVE":
        return <Badge variant="outline" className="bg-gray-50">Inactief</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-50">Afgewezen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Organisatiebeheer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Beheer en controleer organisatieaanvragen</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Organisaties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">Organisatie</TableHead>
                <TableHead className="font-medium text-sm">Type</TableHead>
                <TableHead className="font-medium text-sm">Contact</TableHead>
                <TableHead className="font-medium text-sm">Status</TableHead>
                <TableHead className="font-medium text-sm">Aangevraagd</TableHead>
                <TableHead className="font-medium text-sm">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{org.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {org.registration_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{org.type}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{org.contact_email}</div>
                      <div className="text-xs text-muted-foreground">{org.contact_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(org.verification_status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(org.requested_at).toLocaleDateString("nl-NL")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {org.verification_status === "PENDING_VERIFICATION" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrg(org);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Goedkeuren
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrg(org);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Afwijzen
                          </Button>
                        </>
                      )}
                      {org.verification_status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(org)}
                        >
                          Deactiveren
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={actionType !== null}
        onOpenChange={() => {
          setActionType(null);
          setSelectedOrg(null);
          setRejectionReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Organisatie goedkeuren" : "Organisatie afwijzen"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reden voor afwijzing</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Geef een duidelijke reden op..."
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null);
                setSelectedOrg(null);
                setRejectionReason("");
              }}
            >
              Annuleren
            </Button>
            <Button
              onClick={actionType === "approve" ? handleApprove : handleReject}
              disabled={processing}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrganizations;
