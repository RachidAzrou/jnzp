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

      // CRITICAL: Check if user has organization_id before enforcing 2FA
      // Users without approved organizations cannot use the app yet
      // EXCEPT: platform_admin users (scope=PLATFORM) don't need organization_id
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('organization_id, scope, role')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if this is a platform admin (they don't need organization_id)
      const isPlatformAdmin = userRoles?.role === 'platform_admin' || userRoles?.scope === 'PLATFORM';

      // If user has professional role but NO organization, they're pending approval
      // Don't enforce 2FA setup - let AppGate handle this
      // EXCEPT for platform_admin who don't need an organization
      if (!isPlatformAdmin && !userRoles?.organization_id) {
        console.log('[use2FAEnforcement] User has no organization - skipping 2FA enforcement');
        setStatus({ ...status, loading: false });
        return;
      }

      // Check 2FA status
      const { data, error } = await supabase.rpc('user_2fa_status', {
        p_user_id: user.id
      });

      if (error) {
        console.error('2FA status check error:', error);
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

      // Enforce 2FA setup for professionals - but DON'T logout
      // Just redirect to settings page
      if (twoFAStatus.must_setup_2fa) {
        toast({
          title: '2FA vereist',
          description: 'U moet twee-factor authenticatie instellen om verder te kunnen',
          variant: 'default',
        });
        navigate('/instellingen?setup2fa=true');
      }
    } catch (error) {
      console.error('2FA enforcement error:', error);
      setStatus({ ...status, loading: false });
    }
  };

  return {
    ...status,
    recheck: checkAndEnforce2FA,
  };
};
