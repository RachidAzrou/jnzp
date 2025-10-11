import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  orgType: 'FUNERAL_DIRECTOR' | 'MOSQUE' | 'MORTUARIUM' | 'INSURER';
  orgName: string;
  businessNumber?: string;
}

interface RegistrationResponse {
  success: boolean;
  userId?: string;
  organizationId?: string;
  error?: string;
  details?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin client with service_role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const body: RegistrationRequest = await req.json();
    console.log('Registration request received:', { 
      email: body.email, 
      orgType: body.orgType,
      orgName: body.orgName 
    });

    // Input validation
    if (!body.email || !body.password || !body.firstName || !body.lastName || 
        !body.phone || !body.orgType || !body.orgName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Alle verplichte velden moeten ingevuld zijn' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ongeldig e-mailadres' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Business number required for FUNERAL_DIRECTOR and INSURER
    if ((body.orgType === 'FUNERAL_DIRECTOR' || body.orgType === 'INSURER') && 
        (!body.businessNumber || body.businessNumber.trim() === '')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ondernemingsnummer is verplicht voor uitvaartondernemers en verzekeraars' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let userId: string | undefined;

    try {
      // STEP 1: Create auth user
      console.log('Creating auth user...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email.trim(),
        password: body.password,
        email_confirm: true, // Auto-confirm for non-production
        user_metadata: {
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim()
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Account aanmaken mislukt: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Geen user data ontvangen van auth');
      }

      userId = authData.user.id;
      console.log('Auth user created:', userId);

      // STEP 2: Create profile
      console.log('Creating profile...');
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: body.email.trim(),
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim(),
          phone: body.phone.trim()
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error(`Profiel aanmaken mislukt: ${profileError.message}`);
      }

      // STEP 3: Map org_type to enum value
      const orgTypeMap = {
        'FUNERAL_DIRECTOR': 'FUNERAL_DIRECTOR',
        'MOSQUE': 'MOSQUE',
        'MORTUARIUM': 'MORTUARIUM',
        'INSURER': 'INSURER'
      };
      const orgTypeEnum = orgTypeMap[body.orgType];

      // STEP 4: Create organization (with explicit enum casting)
      console.log('Creating organization...');
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: body.orgName.trim(),
          type: orgTypeEnum,
          business_number: body.businessNumber?.trim() || null,
          contact_email: body.email.trim(),
          contact_phone: body.phone.trim(),
          verification_status: 'PENDING_VERIFICATION'
        })
        .select('id')
        .single();

      if (orgError) {
        console.error('Organization error:', orgError);
        throw new Error(`Organisatie aanmaken mislukt: ${orgError.message}`);
      }

      const organizationId = orgData.id;
      console.log('Organization created:', organizationId);

      // STEP 5: Create contact
      console.log('Creating contact...');
      const { error: contactError } = await supabaseAdmin
        .from('contacts')
        .insert({
          organization_id: organizationId,
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim(),
          email: body.email.trim(),
          phone: body.phone.trim(),
          is_primary: true
        });

      if (contactError) {
        console.error('Contact error:', contactError);
        throw new Error(`Contact aanmaken mislukt: ${contactError.message}`);
      }

      // STEP 6: Map org_type to app_role
      const roleMap = {
        'FUNERAL_DIRECTOR': 'funeral_director',
        'MOSQUE': 'mosque',
        'MORTUARIUM': 'mortuarium',
        'INSURER': 'insurer'
      };
      const userRole = roleMap[body.orgType];

      // STEP 7: Create user_role
      console.log('Creating user role with:', { 
        user_id: userId, 
        organization_id: organizationId, 
        role: userRole 
      });
      
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role: userRole,
          is_admin: true // First user is always org admin
        })
        .select();
      
      console.log('User role created:', roleData);
      console.log('Role error if any:', roleError);

      if (roleError) {
        console.error('Role error:', roleError);
        throw new Error(`Gebruikersrol aanmaken mislukt: ${roleError.message}`);
      }

      // STEP 8: Create audit log
      console.log('Creating audit log...');
      await supabaseAdmin
        .from('audit_events')
        .insert({
          user_id: userId,
          event_type: 'USER_REGISTERED',
          target_type: 'Organization',
          target_id: organizationId,
          description: 'New professional user registered',
          metadata: {
            org_type: body.orgType,
            org_name: body.orgName,
            role: userRole
          }
        });

      console.log('Registration successful:', { userId, organizationId });

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId, 
          organizationId 
        } as RegistrationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (innerError) {
      // Rollback: delete auth user if created
      if (userId) {
        console.log('Rolling back auth user:', userId);
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log('Auth user deleted successfully');
        } catch (deleteError) {
          console.error('Failed to delete auth user during rollback:', deleteError);
        }
      }
      throw innerError;
    }

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout opgetreden',
        details: error instanceof Error ? error.stack : undefined
      } as RegistrationResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
