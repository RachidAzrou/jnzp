import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, UserMinus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FDManagementCardProps {
  dossierId: string;
  assignedFdOrgId: string | null;
  assignmentStatus: string;
}

export default function FDManagementCard({
  dossierId,
  assignedFdOrgId,
  assignmentStatus,
}: FDManagementCardProps) {
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [approvingClaim, setApprovingClaim] = useState<string | null>(null);

  const { data: fdOrg } = useQuery({
    queryKey: ["fd-org", assignedFdOrgId],
    queryFn: async () => {
      if (!assignedFdOrgId) return null;
      const { data } = await supabase
        .from("organizations")
        .select("name, type")
        .eq("id", assignedFdOrgId)
        .single();
      return data;
    },
    enabled: !!assignedFdOrgId,
  });

  const { data: pendingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ["pending-claims", dossierId],
    queryFn: async () => {
      const { data } = await supabase
        .from("dossier_claims")
        .select(`
          id,
          reason,
          created_at,
          requesting_org_id,
          organizations (name)
        `)
        .eq("dossier_id", dossierId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: assignmentStatus === "PENDING_CLAIM",
  });

  const handleReleaseFD = async () => {
    setReleasing(true);
    try {
      const { data, error } = await supabase.rpc("release_dossier", {
        p_dossier_id: dossierId,
        p_action: "FAMILY_RELEASE",
        p_reason: null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success("Uitvaartonderneming ontkoppeld");
        setReleaseDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result?.error || "Fout bij ontkoppelen");
      }
    } catch (err: any) {
      console.error("Release error:", err);
      toast.error("Fout bij ontkoppelen: " + err.message);
    } finally {
      setReleasing(false);
    }
  };

  const handleApproveClaim = async (claimId: string, approved: boolean) => {
    setApprovingClaim(claimId);
    try {
      const { data, error } = await supabase.rpc("approve_dossier_claim", {
        p_claim_id: claimId,
        p_approved: approved,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success(approved ? "Overname goedgekeurd" : "Overname afgewezen");
        refetchClaims();
        window.location.reload();
      } else {
        toast.error(result?.error || "Fout bij verwerken");
      }
    } catch (err: any) {
      console.error("Approval error:", err);
      toast.error("Fout bij verwerken: " + err.message);
    } finally {
      setApprovingClaim(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Uitvaartonderneming
          </CardTitle>
          <CardDescription>Beheer de koppeling met uw uitvaartonderneming</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentStatus === "ASSIGNED" && fdOrg && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Huidige uitvaartonderneming</p>
                <p className="font-medium">{fdOrg.name}</p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setReleaseDialogOpen(true)}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Uitvaartonderneming ontkoppelen
              </Button>
            </>
          )}

          {assignmentStatus === "UNASSIGNED" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dit dossier is momenteel niet gekoppeld aan een uitvaartonderneming.
                U kunt wachten tot een uitvaartonderneming contact met u opneemt.
              </AlertDescription>
            </Alert>
          )}

          {assignmentStatus === "PENDING_CLAIM" && pendingClaims && pendingClaims.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Er is een overnameverzoek in behandeling
                </AlertDescription>
              </Alert>
              
              {pendingClaims.map((claim: any) => (
                <Card key={claim.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {claim.organizations?.name}
                    </CardTitle>
                    {claim.reason && (
                      <CardDescription>{claim.reason}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleApproveClaim(claim.id, true)}
                      disabled={!!approvingClaim}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Goedkeuren
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleApproveClaim(claim.id, false)}
                      disabled={!!approvingClaim}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Afwijzen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uitvaartonderneming ontkoppelen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u de koppeling met {fdOrg?.name} wilt verbreken? 
              De uitvaartonderneming verliest toegang tot dit dossier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleReleaseFD} disabled={releasing}>
              {releasing ? "Ontkoppelen..." : "Ontkoppelen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
