import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from './deviceFingerprint';

export interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  trusted_at: string;
  expires_at: string;
  last_used_at: string;
}

export const checkDeviceTrust = async (userId: string): Promise<boolean> => {
  try {
    const fingerprint = generateDeviceFingerprint();
    
    const { data, error } = await supabase.rpc('is_device_trusted', {
      p_user_id: userId,
      p_device_fingerprint: fingerprint
    });

    if (error) {
      console.error('Device trust check error:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Device trust check error:', error);
    return false;
  }
};

export const trustDevice = async (userId: string): Promise<boolean> => {
  try {
    const fingerprint = generateDeviceFingerprint();
    const deviceName = getDeviceName();

    const { error } = await supabase.rpc('trust_device', {
      p_user_id: userId,
      p_device_fingerprint: fingerprint,
      p_device_name: deviceName,
      p_ip: null, // Could be set server-side
      p_user_agent: navigator.userAgent
    });

    if (error) {
      console.error('Trust device error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Trust device error:', error);
    return false;
  }
};

export const getTrustedDevices = async (): Promise<TrustedDevice[]> => {
  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
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

export const removeTrustedDevice = async (deviceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
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
