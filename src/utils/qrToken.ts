import { supabase } from '@/integrations/supabase/client';

export interface QRTokenData {
  id: string;
  token: string;
  dossier_id: string;
  expires_at: string;
  revoked: boolean;
  scopes: {
    basic_info?: boolean;
    documents?: boolean;
    status?: boolean;
  };
  max_scans?: number;
  scan_count: number;
}

export interface CreateQRTokenParams {
  dossierId: string;
  expiresInHours?: number;
  scopes?: {
    basic_info?: boolean;
    documents?: boolean;
    status?: boolean;
  };
  maxScans?: number;
}

export interface VerifyQRTokenResult {
  success: boolean;
  error?: string;
  dossier_id?: string;
  display_id?: string;
  dossier_info?: {
    deceased_name?: string;
    status?: string;
    flow?: string;
  };
  scopes?: Record<string, boolean>;
}

/**
 * Generate a new QR token for a dossier
 */
export const createQRToken = async ({
  dossierId,
  expiresInHours = 24,
  scopes = { basic_info: true },
  maxScans,
}: CreateQRTokenParams): Promise<QRTokenData | null> => {
  try {
    // Generate unique token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_qr_token'
    );

    if (tokenError) {
      console.error('Error generating token:', tokenError);
      return null;
    }

    // Verify token was generated
    if (!tokenData || typeof tokenData !== 'string') {
      console.error('Invalid token data received:', tokenData);
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }

    // Insert token
    const { data, error } = await supabase
      .from('qr_tokens')
      .insert({
        token: tokenData,
        dossier_id: dossierId,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        scopes: scopes as any,
        max_scans: maxScans,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating QR token:', error);
      return null;
    }

    return data as QRTokenData;
  } catch (error) {
    console.error('Error creating QR token:', error);
    return null;
  }
};

/**
 * Verify a QR token and log the scan event
 */
export const verifyQRToken = async (
  token: string
): Promise<VerifyQRTokenResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.rpc('verify_qr_token', {
      p_token: token,
      p_scanned_by: user?.id || null,
      p_ip: null,
      p_user_agent: navigator.userAgent,
    });

    if (error) {
      console.error('Error verifying token:', error);
      return { success: false, error: 'Failed to verify token' };
    }

    return data as unknown as VerifyQRTokenResult;
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, error: 'Failed to verify token' };
  }
};

/**
 * Revoke a QR token
 */
export const revokeQRToken = async (
  tokenId: string,
  reason: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('revoke_qr_token', {
      p_token_id: tokenId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error revoking token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error revoking token:', error);
    return false;
  }
};

/**
 * Get all QR tokens for a dossier
 */
export const getQRTokensForDossier = async (
  dossierId: string
): Promise<QRTokenData[]> => {
  try {
    const { data, error } = await supabase
      .from('qr_tokens')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching QR tokens:', error);
      return [];
    }

    return (data as QRTokenData[]) || [];
  } catch (error) {
    console.error('Error fetching QR tokens:', error);
    return [];
  }
};

/**
 * Get scan events for a token
 */
export const getTokenScanEvents = async (tokenId: string) => {
  try {
    const { data, error } = await supabase
      .from('qr_scan_events')
      .select('*')
      .eq('qr_token_id', tokenId)
      .order('scanned_at', { ascending: false });

    if (error) {
      console.error('Error fetching scan events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching scan events:', error);
    return [];
  }
};

/**
 * Generate QR code URL for scanning
 */
export const generateQRCodeURL = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/qr-scan/${token}`;
};
