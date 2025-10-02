import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const demoAccounts = [
      'admin@janazapp.nl',
      'uitvaart@janazapp.nl',
      'verzekeraar@janazapp.nl',
      'wasplaats@janazapp.nl',
      'moskee@janazapp.nl',
      'familie@janazapp.nl'
    ];

    const newPassword = 'Demo2025!';
    const results = [];

    console.log('Starting password reset for demo accounts...');

    for (const email of demoAccounts) {
      try {
        // Get user by email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (userError) {
          console.error(`Error listing users for ${email}:`, userError);
          results.push({ email, success: false, error: userError.message });
          continue;
        }

        const user = userData.users.find(u => u.email === email);
        
        if (!user) {
          console.error(`User not found: ${email}`);
          results.push({ email, success: false, error: 'User not found' });
          continue;
        }

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) {
          console.error(`Error updating password for ${email}:`, updateError);
          results.push({ email, success: false, error: updateError.message });
        } else {
          console.log(`Successfully updated password for ${email}`);
          results.push({ email, success: true });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Exception for ${email}:`, error);
        results.push({ email, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Password reset complete. ${successCount}/${demoAccounts.length} successful.`);

    return new Response(
      JSON.stringify({ 
        message: 'Password reset completed',
        results,
        summary: {
          total: demoAccounts.length,
          successful: successCount,
          failed: demoAccounts.length - successCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in reset-demo-passwords function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
