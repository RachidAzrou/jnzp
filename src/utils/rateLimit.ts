import { supabase } from '@/integrations/supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  retry_after?: number;
  current_count?: number;
  max_requests?: number;
}

export const checkRateLimit = async (
  identifier: string,
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 60
): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return { allowed: true };
    }

    return data as unknown as RateLimitResult;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if rate limit check fails
    return { allowed: true };
  }
};

export const getLoginDelay = async (email: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_login_delay', {
      p_email: email
    });

    if (error) {
      console.error('Login delay calculation error:', error);
      return 0;
    }

    return (data as number) || 0;
  } catch (error) {
    console.error('Login delay calculation error:', error);
    return 0;
  }
};

export const formatRetryAfter = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} seconden`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`;
};
