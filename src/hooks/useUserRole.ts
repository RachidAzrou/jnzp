import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export type UserRole = 'platform_admin' | 'admin' | 'org_admin' | 'funeral_director' | 'family' | 'insurer' | 'wasplaats' | 'mosque' | 'reviewer' | 'support' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else if (data && data.length > 0) {
          // Prioritize roles: platform_admin > admin > org_admin > other roles
          const roles = data.map(d => d.role as UserRole);
          const priorityOrder = ['platform_admin', 'admin', 'org_admin', 'funeral_director', 'reviewer', 'support', 'insurer', 'wasplaats', 'mosque', 'family'];
          const primaryRole = priorityOrder.find(r => roles.includes(r as UserRole)) || roles[0];
          setRole(primaryRole as UserRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole(null);
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

  return { role, loading };
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
    case 'admin':
      return t('roles.admin');
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
    case 'reviewer':
      return t('roles.reviewer');
    case 'support':
      return t('roles.support');
    default:
      return t('roles.user');
  }
};