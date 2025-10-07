import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export type UserRole = 'platform_admin' | 'org_admin' | 'funeral_director' | 'insurer' | 'wasplaats' | 'mosque' | null;

export interface UserRoleContext {
  role: UserRole; // Primary role for backwards compatibility
  roles: UserRole[]; // All roles of the user
  organizationType: 'FUNERAL_DIRECTOR' | 'MOSQUE' | 'WASPLAATS' | 'INSURER' | null;
  organizationId: string | null;
}

export const useUserRole = () => {
  const [roleContext, setRoleContext] = useState<UserRoleContext>({
    role: null,
    roles: [],
    organizationType: null,
    organizationId: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;
    let lastFetchTime = 0;
    const DEBOUNCE_MS = 1000; // Prevent multiple fetches within 1 second
    
    const fetchUserRole = async () => {
      // Debounce: skip if we just fetched
      const now = Date.now();
      if (now - lastFetchTime < DEBOUNCE_MS) {
        console.log('[useUserRole] Skipping fetch - too soon after last fetch');
        return;
      }
      lastFetchTime = now;

      try {
        console.log('[useUserRole] Fetching user role...');
        
        // Safety timeout - force loading to false after 5 seconds
        loadingTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn('[useUserRole] Loading timeout - forcing loading to false');
            setLoading(false);
          }
        }, 5000);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (sessionError) {
          console.error('[useUserRole] Session error:', sessionError);
          setRoleContext({ role: null, roles: [], organizationType: null, organizationId: null });
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        
        if (!session?.user) {
          console.log('[useUserRole] No session found');
          setRoleContext({ role: null, roles: [], organizationType: null, organizationId: null });
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        console.log('[useUserRole] Session found, fetching roles for user:', session.user.id);

        const { data, error } = await supabase
          .from('user_roles')
          .select(`
            role,
            organization_id,
            organizations (
              type
            )
          `)
          .eq('user_id', session.user.id)
          .eq('is_active', true);

        if (!isMounted) return;

        if (error) {
          console.error('[useUserRole] Error fetching user role:', error);
          setRoleContext({ role: null, roles: [], organizationType: null, organizationId: null });
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('[useUserRole] Roles found:', data.length);
          const allRoles = data.map(d => d.role as UserRole);
          
          const priorityOrder = ['platform_admin', 'org_admin', 'funeral_director', 'insurer', 'wasplaats', 'mosque'];
          
          const sortedData = data.sort((a, b) => {
            return priorityOrder.indexOf(a.role) - priorityOrder.indexOf(b.role);
          });
          
          const primaryRoleData = sortedData[0];
          const primaryRole = primaryRoleData.role as UserRole;
          
          let orgType: string | null = null;
          if (primaryRoleData.organizations && typeof primaryRoleData.organizations === 'object' && 'type' in primaryRoleData.organizations) {
            orgType = (primaryRoleData.organizations as { type: string }).type;
          }
          
          setRoleContext({
            role: primaryRole,
            roles: allRoles,
            organizationType: orgType as 'FUNERAL_DIRECTOR' | 'MOSQUE' | 'WASPLAATS' | 'INSURER' | null,
            organizationId: primaryRoleData.organization_id
          });
        } else {
          console.log('[useUserRole] No roles found');
          setRoleContext({ role: null, roles: [], organizationType: null, organizationId: null });
        }
        
        setLoading(false);
        clearTimeout(loadingTimeout);
        console.log('[useUserRole] Loading complete');
      } catch (error) {
        console.error('[useUserRole] Exception in fetchUserRole:', error);
        if (isMounted) {
          setRoleContext({ role: null, roles: [], organizationType: null, organizationId: null });
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[useUserRole] Auth state changed:', event);
      if (isMounted && event !== 'INITIAL_SESSION') {
        // Skip INITIAL_SESSION since we already fetched on mount
        fetchUserRole();
      }
    });

    return () => {
      isMounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return { 
    role: roleContext.role, 
    roles: roleContext.roles,
    organizationType: roleContext.organizationType, 
    organizationId: roleContext.organizationId, 
    loading,
    isOrgAdmin: roleContext.roles.includes('org_admin'),
    hasRole: (roleToCheck: UserRole) => roleContext.roles.includes(roleToCheck)
  };
};

export const getRoleDisplayName = (role: UserRole): string => {
  const roleKey = role || 'user';
  return roleKey;
};

export const useRoleDisplayName = (role: UserRole): string => {
  const { t } = useTranslation();
  
  switch (role) {
    case 'platform_admin':
      return t('roles.platform_admin');
    case 'org_admin':
      return t('roles.org_admin');
    case 'funeral_director':
      return t('roles.funeral_director');
    case 'insurer':
      return t('roles.insurer');
    case 'wasplaats':
      return t('roles.wasplaats');
    case 'mosque':
      return t('roles.mosque');
    default:
      return t('roles.user');
  }
};

export const useRolePortalName = (role: UserRole): string => {
  const { t } = useTranslation();
  
  switch (role) {
    case 'platform_admin':
      return t('rolePortals.platform_admin');
    case 'org_admin':
      return t('rolePortals.org_admin');
    case 'funeral_director':
      return t('rolePortals.funeral_director');
    case 'insurer':
      return t('rolePortals.insurer');
    case 'wasplaats':
      return t('rolePortals.wasplaats');
    case 'mosque':
      return t('rolePortals.mosque');
    default:
      return t('rolePortals.user');
  }
};
