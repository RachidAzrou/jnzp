import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Cookie options for HttpOnly security
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: '/',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { action, deviceFingerprint, deviceName, oldTokenHash } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get client IP and User-Agent
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'verify') {
      // Verify device token from cookie
      const cookieHeader = req.headers.get('cookie');
      const deviceToken = cookieHeader
        ?.split(';')
        .find(c => c.trim().startsWith('device_token='))
        ?.split('=')[1];

      if (!deviceToken) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No device token cookie' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(deviceToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Verify with database
      const { data: verifyResult, error: verifyError } = await supabaseClient
        .rpc('verify_device_token', {
          p_token_hash: tokenHash,
          p_current_ip: clientIP,
          p_current_user_agent: userAgent
        });

      if (verifyError) {
        console.error('Verify error:', verifyError);
        return new Response(
          JSON.stringify({ valid: false, error: 'Verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token needs rotation
      if (verifyResult.needs_rotation) {
        // Generate new token
        const newToken = crypto.randomUUID() + crypto.randomUUID();
        const newData = encoder.encode(newToken);
        const newHashBuffer = await crypto.subtle.digest('SHA-256', newData);
        const newHashArray = Array.from(new Uint8Array(newHashBuffer));
        const newTokenHash = newHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Register new token and revoke old
        await supabaseClient.rpc('register_device_token', {
          p_user_id: user.id,
          p_token_hash: newTokenHash,
          p_device_fingerprint: deviceFingerprint,
          p_device_name: deviceName,
          p_ip: clientIP,
          p_user_agent: userAgent,
          p_old_token_hash: tokenHash
        });

        // Set new cookie
        const cookieString = `device_token=${newToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_OPTIONS.maxAge}; Path=${COOKIE_OPTIONS.path}`;
        
        return new Response(
          JSON.stringify({ 
            ...verifyResult, 
            rotated: true 
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': cookieString
            } 
          }
        );
      }

      return new Response(
        JSON.stringify(verifyResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'trust') {
      // Create new device trust token
      const newToken = crypto.randomUUID() + crypto.randomUUID();
      
      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(newToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Register in database
      const { data: deviceId, error: registerError } = await supabaseClient
        .rpc('register_device_token', {
          p_user_id: user.id,
          p_token_hash: tokenHash,
          p_device_fingerprint: deviceFingerprint,
          p_device_name: deviceName,
          p_ip: clientIP,
          p_user_agent: userAgent,
          p_old_token_hash: oldTokenHash
        });

      if (registerError) {
        console.error('Register error:', registerError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to register device' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Set HttpOnly cookie
      const cookieString = `device_token=${newToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_OPTIONS.maxAge}; Path=${COOKIE_OPTIONS.path}`;

      return new Response(
        JSON.stringify({ 
          success: true, 
          deviceId,
          message: 'Device trusted for 30 days'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': cookieString
          } 
        }
      );

    } else if (action === 'revoke') {
      // Revoke device token
      const { deviceId } = await req.json();
      
      const { error: revokeError } = await supabaseClient
        .from('trusted_devices')
        .update({ 
          revoked: true, 
          revoke_reason: 'User revoked' 
        })
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (revokeError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to revoke device' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Clear cookie if revoking current device
      const cookieString = `device_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=${COOKIE_OPTIONS.path}`;

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': cookieString
          } 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error('Device trust error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
