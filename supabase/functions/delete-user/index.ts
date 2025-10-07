import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return json({}, 200);
  }

  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasURL: !!SUPABASE_URL,
      hasSRK: !!SUPABASE_SERVICE_ROLE_KEY,
      url: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'missing'
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing critical environment variables');
      return json({ error: 'server_misconfig', detail: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }, 500);
    }

    // Create admin client with service role key
    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return json({ error: 'unauthorized', detail: 'Missing authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token received, length:', token.length);

    // Verify user authentication
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message);
      return json({ error: 'unauthorized', detail: 'Invalid or expired token' }, 401);
    }

    console.log('User authenticated:', user.id, user.email);

    // Check platform_admin role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'platform_admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError.message);
      return json({ error: 'role_check_failed', detail: roleError.message }, 500);
    }

    if (!roleData) {
      console.log('User does not have platform_admin role');
      return json({ error: 'forbidden', detail: 'Requires platform_admin role' }, 403);
    }

    console.log('Platform admin verified');

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return json({ error: 'invalid_json', detail: 'Request body must be valid JSON' }, 400);
    }

    const user_id = body?.user_id?.toString();
    if (!user_id) {
      console.log('Missing user_id in request');
      return json({ error: 'missing_user_id', detail: 'user_id is required in request body' }, 400);
    }

    console.log('Target user_id:', user_id);

    // Prevent self-deletion
    if (user_id === user.id) {
      console.log('Attempted self-deletion');
      return json({ error: 'forbidden_self_delete', detail: 'Cannot delete your own account' }, 400);
    }

    // Get user profile for audit log (before deletion)
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .maybeSingle();

    console.log('Profile data:', profileData ? `${profileData.email}` : 'not found');

    // Delete user via Admin API
    console.log('Calling auth.admin.deleteUser...');
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Delete user failed:', {
        code: deleteError.code,
        message: deleteError.message,
        status: deleteError.status
      });
      return json({ 
        error: 'delete_failed', 
        detail: deleteError.message,
        code: deleteError.code 
      }, 400);
    }

    console.log('User deleted successfully');

    // Log admin action
    try {
      await adminClient.rpc('log_admin_action', {
        p_action: 'USER_DELETED',
        p_target_type: 'User',
        p_target_id: user_id,
        p_reason: `User ${profileData?.email || user_id} deleted by platform admin`,
        p_metadata: {
          deleted_email: profileData?.email,
          deleted_by: user.email
        }
      });
      console.log('Admin action logged');
    } catch (logError) {
      console.error('Failed to log admin action (non-critical):', logError);
    }

    console.log(`✅ User ${user_id} deleted successfully by ${user.email}`);

    return json({ 
      ok: true,
      success: true,
      message: 'User deleted successfully',
      deleted_user_id: user_id
    }, 200);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return json({ 
      error: 'unexpected', 
      detail: errorMessage 
    }, 500);
  }
});
