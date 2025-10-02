import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'funeral_director' | 'family' | 'insurer' | 'wasplaats' | 'mosque' | null;

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
          // If user has multiple roles, prioritize non-family roles
          const roles = data.map(d => d.role as UserRole);
          const primaryRole = roles.find(r => r !== 'family') || roles[0];
          setRole(primaryRole);
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
    case 'admin':
      return 'Administrator';
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
    default:
      return 'Gebruiker';
  }
};