import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TwoFAStatus {
  requires2FA: boolean;
  has2FAEnabled: boolean;
  mustSetup2FA: boolean;
  loading: boolean;
}

/**
 * Hook to enforce 2FA for professional users
 * Redirects to 2FA setup if required but not configured
 */
export const use2FAEnforcement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<TwoFAStatus>({
    requires2FA: false,
    has2FAEnabled: false,
    mustSetup2FA: false,
    loading: true,
  });

  useEffect(() => {
    checkAndEnforce2FA();
  }, []);

  const checkAndEnforce2FA = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus({ ...status, loading: false });
        return;
      }

      // ===== GRACE MODE CHECK (SERVER-SIDE) =====
      const { data: graceCheck } = await supabase.rpc('is_within_2fa_grace_period', {
        p_user_id: user.id
      });
      
      if (graceCheck === true) {
        // Get expiration time for user feedback
        const { data: profile } = await supabase
          .from('profiles')
          .select('two_fa_grace_expires_at')
          .eq('id', user.id)
          .single();
        
        if (profile?.two_fa_grace_expires_at) {
          const expiresAt = new Date(profile.two_fa_grace_expires_at).getTime();
          const now = Date.now();
          const timeLeft = expiresAt - now;
          
          console.log('[2FA Enforcement] Grace mode active (server-side)');
          console.log('[2FA Enforcement] Time left:', Math.round(timeLeft / 1000 / 60), 'minutes');
          
          // ✅ Grace period ACTIVE → Restrict to /instellingen only
          const currentPath = window.location.pathname;
          const allowedPaths = ['/instellingen'];
          
          if (!allowedPaths.includes(currentPath)) {
            console.log('[2FA Enforcement] Grace mode - redirecting to settings from:', currentPath);
            
            // Calculate hours left for user feedback
            const hoursLeft = Math.ceil(timeLeft / 1000 / 60 / 60);
            
            toast({
              title: '⚠️ Beperkte Toegang',
              description: `U heeft nog ${hoursLeft} uur om 2FA in te stellen. Toegang tot andere pagina's is tijdelijk beperkt.`,
              variant: 'default',
              duration: 5000,
            });
            navigate('/instellingen?setup2fa=true');
            setStatus({ ...status, loading: false });
            return;
          }
          
          // User is on allowed path during grace period
          console.log('[2FA Enforcement] Grace mode - allowing access to:', currentPath);
          setStatus({
            requires2FA: true,
            has2FAEnabled: false,
            mustSetup2FA: true,
            loading: false,
          });
          return;
        }
      }

      // ===== NORMAL 2FA CHECK (outside grace period) =====
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('organization_id, scope, role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isPlatformAdmin = userRoles?.role === 'platform_admin' || userRoles?.scope === 'PLATFORM';

      // Skip check for users without organization (pending approval)
      if (!isPlatformAdmin && !userRoles?.organization_id) {
        console.log('[2FA Enforcement] User has no organization - skipping');
        setStatus({ ...status, loading: false });
        return;
      }

      // Check 2FA status via RPC
      const { data, error } = await supabase.rpc('user_2fa_status', {
        p_user_id: user.id
      });

      if (error) {
        console.error('[2FA Enforcement] RPC error:', error);
        setStatus({ ...status, loading: false });
        return;
      }

      const twoFAStatus = data as any;
      
      setStatus({
        requires2FA: twoFAStatus.requires_2fa,
        has2FAEnabled: twoFAStatus.has_2fa_enabled,
        mustSetup2FA: twoFAStatus.must_setup_2fa,
        loading: false,
      });

      // If 2FA required but not setup, user should have been caught by Auth.tsx
      // This is a safety net - should never happen
      if (twoFAStatus.must_setup_2fa) {
        console.error('[2FA Enforcement] User bypassed Auth.tsx grace mode check!');
        await supabase.auth.signOut();
        toast({
          title: '🔒 Beveiligingsfout',
          description: 'Er is een beveiligingsprobleem gedetecteerd. Log opnieuw in.',
          variant: 'destructive',
        });
        navigate('/auth');
      }
    } catch (error) {
      console.error('[2FA Enforcement] Error:', error);
      setStatus({ ...status, loading: false });
    }
  };

  return {
    ...status,
    recheck: checkAndEnforce2FA,
  };
};
