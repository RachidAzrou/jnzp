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
    let cancelled = false;

    const checkOrgStatus = async () => {
      // CRITICAL: Wait for auth to finish loading first
      if (loading) {
        console.log('[AppGate] Still loading roles, waiting...');
        return;
      }

      console.log('[AppGate] Loading complete, proceeding with org check');

      // If already checked this session, skip
      if (checkedRef.current) {
        console.log('[AppGate] Already checked this session, skipping');
        if (!cancelled) setIsCheckingOrg(false);
        return;
      }

      // ⚠️ CRITICAL: Set flag IMMEDIATELY to prevent re-runs
      checkedRef.current = true;
      console.log('[AppGate] Starting org check (flag set to prevent re-runs)');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[AppGate] No session found - allowing access');
        if (!cancelled) setIsCheckingOrg(false);
        return;
      }

      console.log('[AppGate] Session found for user:', session.user.id);

      try {
        // Get all professional roles for this user that have an organization
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .not('organization_id', 'is', null);

        if (error) {
          console.error('[AppGate] Error fetching user roles:', error);
          if (!cancelled) setIsCheckingOrg(false);
          return;
        }

        console.log('[AppGate] Found roles with org:', userRoles?.length || 0);

        // If user has any professional role with organization, check that org
        const professionalRole = userRoles?.[0];

        if (!professionalRole?.organization_id) {
          console.log('[AppGate] No professional role with org - allowing access');
          if (!cancelled) setIsCheckingOrg(false);
          return;
        }

        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('verification_status, name, rejection_reason')
          .eq('id', professionalRole.organization_id)
          .maybeSingle();

        if (cancelled) return; // Stop if component unmounted

        if (orgError) {
          console.error('[AppGate] Error fetching org:', orgError);
          setIsCheckingOrg(false);
          return;
        }

        // ⚠️ CRITICAL: If org data is incomplete/null → wait, don't sign out
        if (!org) {
          console.log('[AppGate] ⚠️ Org data still loading - waiting (not signing out)');
          // Reset flag to allow retry, keep loading state
          checkedRef.current = false;
          setIsCheckingOrg(true);
          return;
        }

        console.log('[AppGate] Org found:', org.name, 'Status:', org.verification_status);
        
        // Set org info
        setOrgStatus(org.verification_status);
        setOrgName(org.name);
        setRejectionReason(org.rejection_reason || "");

        // ⚠️ CRITICAL: Only show pending screen if org is definitively not ACTIVE
        // Do NOT sign out - just show the PendingApprovalScreen
        if (org.verification_status !== 'ACTIVE') {
          console.log('[AppGate] ❌ Org is NOT ACTIVE (status:', org.verification_status, ') - showing pending screen (no signout)');
          if (!cancelled) setIsCheckingOrg(false);
          return;
        }

        console.log('[AppGate] ✅ Org is ACTIVE - allowing access');
        setIsCheckingOrg(false);
      } catch (err) {
        console.error('[AppGate] Exception during org check:', err);
        if (!cancelled) setIsCheckingOrg(false);
      }
    };

    checkOrgStatus();

    return () => {
      cancelled = true;
    };
  }, [navigate, loading]); // Must include loading to re-run when it becomes false

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
