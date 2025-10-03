import { supabase } from '@/integrations/supabase/client';

export interface PasswordBreachResult {
  breached: boolean;
  count: number;
  warning: string | null;
}

/**
 * Check if password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model (only sends first 5 chars of SHA-1 hash)
 */
export const checkPasswordBreach = async (password: string): Promise<PasswordBreachResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-breached-password', {
      body: { password }
    });

    if (error) {
      console.error('Breached password check error:', error);
      // Fail open - allow password if check fails
      return { breached: false, count: 0, warning: null };
    }

    return data as PasswordBreachResult;
  } catch (error) {
    console.error('Breached password check error:', error);
    // Fail open - allow password if check fails
    return { breached: false, count: 0, warning: null };
  }
};
