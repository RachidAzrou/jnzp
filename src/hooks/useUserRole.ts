import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export type UserRole = 'platform_admin' | 'org_admin' | 'funeral_director' | 'family' | 'insurer' | 'wasplaats' | 'mosque' | null;

export interface UserRoleContext {
  role: UserRole;
  organizationType: 'FUNERAL_DIRECTOR' | 'MOSQUE' | 'WASPLAATS' | 'INSURER' | null;
  organizationId: string | null;
}

export const useUserRole = () => {
  const [roleContext, setRoleContext] = useState<UserRoleContext>({
    role: null,
    organizationType: null,
    organizationId: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setRoleContext({ role: null, organizationType: null, organizationId: null });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select(`
            role, 
            organization_id,
            organizations (
              type
            )
          `)
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRoleContext({ role: null, organizationType: null, organizationId: null });
        } else if (data && data.length > 0) {
          // Prioritize roles: platform_admin > org_admin > other roles
          const priorityOrder = ['platform_admin', 'org_admin', 'funeral_director', 'insurer', 'wasplaats', 'mosque', 'family'];
          
          const sortedData = data.sort((a, b) => {
            const indexA = priorityOrder.indexOf(a.role);
            const indexB = priorityOrder.indexOf(b.role);
            return indexA - indexB;
          });
          
          const primaryRoleData = sortedData[0];
          const orgType = primaryRoleData.organizations?.[0]?.type || null;
          
          setRoleContext({
            role: primaryRoleData.role as UserRole,
            organizationType: orgType as 'FUNERAL_DIRECTOR' | 'MOSQUE' | 'WASPLAATS' | 'INSURER' | null,
            organizationId: primaryRoleData.organization_id
          });
        } else {
          setRoleContext({ role: null, organizationType: null, organizationId: null });
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRoleContext({ role: null, organizationType: null, organizationId: null });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role: roleContext.role, organizationType: roleContext.organizationType, organizationId: roleContext.organizationId, loading };
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
    case 'family':
      return t('roles.family');
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
    case 'family':
      return t('rolePortals.family');
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
