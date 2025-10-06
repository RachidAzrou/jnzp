import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { PendingApprovalScreen } from "./PendingApprovalScreen";

interface AppGateProps {
  children: React.ReactNode;
}

export const AppGate = ({ children }: AppGateProps) => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isCheckingOrg, setIsCheckingOrg] = useState(true);

  useEffect(() => {
    const checkOrgStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsCheckingOrg(false);
        return;
      }

      // Check organization status for professional roles
      if (session.user && !loading && role) {
        const professionalRoles = ['funeral_director', 'org_admin', 'wasplaats', 'mosque', 'insurer'];
        
        if (professionalRoles.includes(role)) {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .not('organization_id', 'is', null)
            .maybeSingle();

          if (userRole?.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('verification_status, name, rejection_reason')
              .eq('id', userRole.organization_id)
              .single();

            if (org) {
              setOrgStatus(org.verification_status);
              setOrgName(org.name);
              setRejectionReason(org.rejection_reason || "");

              // If not ACTIVE, sign out as failsafe
              if (org.verification_status !== 'ACTIVE') {
                await supabase.auth.signOut();
              }
            }
          } else {
            // Professional user without organization - sign them out
            await supabase.auth.signOut();
            navigate("/auth");
          }
        }
      }

      setIsCheckingOrg(false);
    };

    checkOrgStatus();
  }, [navigate, role, loading]);

  // Show loading while checking
  if (loading || isCheckingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show pending/rejected screen if org not approved
  if (orgStatus && orgStatus !== 'ACTIVE') {
    return (
      <PendingApprovalScreen 
        status={orgStatus as "PENDING_VERIFICATION" | "REJECTED"}
        organizationName={orgName}
        rejectionReason={rejectionReason}
      />
    );
  }

  // Render app if all checks passed
  return <>{children}</>;
};
