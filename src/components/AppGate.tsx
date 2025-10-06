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

      // Only check org status for professional roles
      if (session.user && !loading && role) {
        const professionalRoles = ['funeral_director', 'org_admin', 'wasplaats', 'mosque', 'insurer'];
        
        // Skip org check for platform_admin
        if (role === 'platform_admin') {
          setIsCheckingOrg(false);
          return;
        }
        
        if (professionalRoles.includes(role)) {
          try {
            const { data: userRoles, error } = await supabase
              .from('user_roles')
              .select('organization_id')
              .eq('user_id', session.user.id)
              .eq('role', role)
              .not('organization_id', 'is', null)
              .limit(1);

            if (error) {
              console.error('[AppGate] Error fetching user roles:', error);
              setIsCheckingOrg(false);
              return;
            }

            const userRole = userRoles?.[0];

            if (userRole?.organization_id) {
              const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('verification_status, name, rejection_reason')
                .eq('id', userRole.organization_id)
                .single();

              if (orgError) {
                console.error('[AppGate] Error fetching org:', orgError);
                setIsCheckingOrg(false);
                return;
              }

              if (org) {
                setOrgStatus(org.verification_status);
                setOrgName(org.name);
                setRejectionReason(org.rejection_reason || "");

                // If not ACTIVE, sign out
                if (org.verification_status !== 'ACTIVE') {
                  await supabase.auth.signOut();
                }
              }
            }
          } catch (err) {
            console.error('[AppGate] Exception:', err);
          }
        }
      }

      setIsCheckingOrg(false);
    };

    checkOrgStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkOrgStatus();
    });

    return () => subscription.unsubscribe();
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
