import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from './deviceFingerprint';

export interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  user_agent_hash: string | null;
  ip_prefix: string | null;
  risk_score: number;
  revoked: boolean;
  revoke_reason: string | null;
  created_at: string;
  last_used_at: string;
  last_rotated_at: string;
  expires_at: string;
  token_hash: string;
}

/**
 * Check if current device is trusted (via HttpOnly cookie + edge function)
 */
export const checkDeviceTrust = async (userId: string): Promise<boolean> => {
  try {
    const fingerprint = generateDeviceFingerprint();
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return false;
    }

    // Call edge function to verify cookie
    const { data, error } = await supabase.functions.invoke('device-trust', {
      body: {
        action: 'verify',
        deviceFingerprint: fingerprint
      }
    });

    if (error || !data?.valid) {
      console.error('Device trust check failed:', error);
      return false;
    }

    // Check risk score
    if (data.requires_2fa || data.risk_score >= 50) {
      console.log('Device trust check: high risk, 2FA required');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Device trust check error:', error);
    return false;
  }
};

/**
 * Trust the current device (creates HttpOnly cookie via edge function)
 */
export const trustDevice = async (userId: string): Promise<boolean> => {
  try {
    const fingerprint = generateDeviceFingerprint();
    const deviceName = getDeviceName();

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return false;
    }

    const { data, error } = await supabase.functions.invoke('device-trust', {
      body: {
        action: 'trust',
        deviceFingerprint: fingerprint,
        deviceName: deviceName
      }
    });

    if (error || !data?.success) {
      console.error('Trust device error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Trust device error:', error);
    return false;
  }
};

/**
 * Get list of all trusted devices for current user
 */
export const getTrustedDevices = async (): Promise<TrustedDevice[]> => {
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('revoked', false)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Get trusted devices error:', error);
      return [];
    }

    return data as TrustedDevice[];
  } catch (error) {
    console.error('Get trusted devices error:', error);
    return [];
  }
};

/**
 * Revoke a trusted device (removes HttpOnly cookie if current device)
 */
export const removeTrustedDevice = async (deviceId: string): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return false;
    }

    const { data, error } = await supabase.functions.invoke('device-trust', {
      body: {
        action: 'revoke',
        deviceId: deviceId
      }
    });

    if (error || !data?.success) {
      console.error('Remove trusted device error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Remove trusted device error:', error);
    return false;
  }
};

export const getCurrentDeviceFingerprint = (): string => {
  return generateDeviceFingerprint();
};
