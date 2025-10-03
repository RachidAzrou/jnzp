import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  switch (role) {
    case 'platform_admin':
      return 'Platform Administrator';
    case 'admin':
      return 'Administrator';
    case 'org_admin':
      return 'Organisatie Administrator';
    case 'funeral_director':
      return 'Uitvaartondernemer';
    case 'family':
      return 'Familie';
    case 'insurer':
      return 'Verzekeraar';
    case 'wasplaats':
      return 'Wasplaats';
    case 'mosque':
      return 'Moskee';
    case 'reviewer':
      return 'Reviewer';
    case 'support':
      return 'Support';
    default:
      return 'Gebruiker';
  }
};