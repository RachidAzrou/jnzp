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
  const { roles, loading } = useUserRole();
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

      // Check ALL user roles to find one with an organization
      if (session.user && !loading) {
        try {
          // Get all professional roles for this user that have an organization
          const { data: userRoles, error } = await supabase
            .from('user_roles')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .not('organization_id', 'is', null);

          if (error) {
            console.error('[AppGate] Error fetching user roles:', error);
            setIsCheckingOrg(false);
            return;
          }

          // If user has any professional role with organization, check that org
          const professionalRole = userRoles?.[0];

          if (professionalRole?.organization_id) {
            const { data: org, error: orgError } = await supabase
              .from('organizations')
              .select('verification_status, name, rejection_reason')
              .eq('id', professionalRole.organization_id)
              .maybeSingle();

            if (orgError) {
              console.error('[AppGate] Error fetching org:', orgError);
              setIsCheckingOrg(false);
              return;
            }

            if (org) {
              // Only update state if it changed to prevent infinite loops
              if (orgStatus !== org.verification_status) {
                setOrgStatus(org.verification_status);
                setOrgName(org.name);
                setRejectionReason(org.rejection_reason || "");

                // If not ACTIVE, sign out (only once)
                if (org.verification_status !== 'ACTIVE') {
                  console.log('[AppGate] Organization not active, signing out');
                  await supabase.auth.signOut();
                  navigate('/auth');
                  return;
                }
              }
            }
          }
        } catch (err) {
          console.error('[AppGate] Exception:', err);
        }
      }

      setIsCheckingOrg(false);
    };

    // Only run if we haven't checked yet or roles changed
    if (loading) return;
    
    checkOrgStatus();
  }, [navigate, loading, roles, orgStatus]);

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
