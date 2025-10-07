import { useEffect, useState, useRef } from "react";
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
  
  // Prevent multiple checks per session
  const checkedRef = useRef(false);

  useEffect(() => {
    const checkOrgStatus = async () => {
      // If already checked this session, skip
      if (checkedRef.current) {
        console.log('[AppGate] Already checked this session, skipping');
        return;
      }

      // Wait for auth to finish loading
      if (loading) {
        console.log('[AppGate] Still loading roles, waiting...');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[AppGate] No session found');
        checkedRef.current = true;
        setIsCheckingOrg(false);
        return;
      }

      console.log('[AppGate] Starting org check for user:', session.user.id);

      try {
        // Get all professional roles for this user that have an organization
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .not('organization_id', 'is', null);

        if (error) {
          console.error('[AppGate] Error fetching user roles:', error);
          checkedRef.current = true;
          setIsCheckingOrg(false);
          return;
        }

        console.log('[AppGate] Found roles with org:', userRoles?.length || 0);

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
            checkedRef.current = true;
            setIsCheckingOrg(false);
            return;
          }

          // ⚠️ CRITICAL: Only proceed if we actually got org data
          if (!org) {
            console.log('[AppGate] No org data found, allowing access');
            checkedRef.current = true;
            setIsCheckingOrg(false);
            return;
          }

          console.log('[AppGate] Org found:', org.name, 'Status:', org.verification_status);
          
          // Set org info
          setOrgStatus(org.verification_status);
          setOrgName(org.name);
          setRejectionReason(org.rejection_reason || "");

          // ⚠️ ONLY sign out if we KNOW FOR SURE the org is not ACTIVE
          if (org.verification_status !== 'ACTIVE') {
            console.log('[AppGate] Org status is', org.verification_status, '- signing out');
            checkedRef.current = true;
            await supabase.auth.signOut();
            navigate('/auth');
            return;
          }

          console.log('[AppGate] Org is ACTIVE - allowing access');
        } else {
          console.log('[AppGate] No professional role with org found, allowing access');
        }
      } catch (err) {
        console.error('[AppGate] Exception during org check:', err);
      }

      checkedRef.current = true;
      setIsCheckingOrg(false);
    };

    checkOrgStatus();
  }, [navigate, loading]);

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
