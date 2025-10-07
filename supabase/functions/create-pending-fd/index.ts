import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateFDRequest {
  company_name: string;
  legal_name: string;
  business_number: string;
  email: string;
  phone: string;
  contact_first_name: string;
  contact_last_name: string;
  address_street: string;
  address_postcode: string;
  address_city: string;
  address_country: string;
  language: string;
  website?: string;
  billing_email?: string;
  iban?: string;
  mortuarium_org_id: string;
  mortuarium_name: string;
  dossier_ref: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData: CreateFDRequest = await req.json();

    // Check if business number already exists
    const { data: existingOrg } = await supabaseClient
      .from("organizations")
      .select("id, status")
      .eq("business_number", requestData.business_number)
      .single();

    if (existingOrg) {
      return new Response(
        JSON.stringify({
          error: "Deze onderneming is al geregistreerd",
          existing_status: existingOrg.status,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseClient
      .from("organizations")
      .select("id")
      .eq("email", requestData.email)
      .single();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: "Dit e-mailadres is al in gebruik" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate temporary password
    const generateTempPassword = (): string => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const tempPassword = generateTempPassword();

    // Create FD organization with pending status
    const { data: newOrg, error: orgError } = await supabaseClient
      .from("organizations")
      .insert({
        name: requestData.company_name,
        type: "FUNERAL_DIRECTOR",
        company_name: requestData.company_name,
        legal_name: requestData.legal_name,
        business_number: requestData.business_number,
        email: requestData.email,
        phone: requestData.phone,
        contact_first_name: requestData.contact_first_name,
        contact_last_name: requestData.contact_last_name,
        address_street: requestData.address_street,
        address_postcode: requestData.address_postcode,
        address_city: requestData.address_city,
        address_country: requestData.address_country,
        language: requestData.language,
        website: requestData.website,
        billing_email: requestData.billing_email,
        iban: requestData.iban,
        created_by_role: "wasplaats",
        status: "pending",
        verification_status: "PENDING",
        is_verified: false,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create user account
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: requestData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: requestData.contact_first_name,
        last_name: requestData.contact_last_name,
        force_password_reset: true,
      },
    });

    if (authError) throw authError;

    // Assign org_admin and funeral_director roles
    await supabaseClient.from("user_roles").insert([
      {
        user_id: authData.user.id,
        organization_id: newOrg.id,
        role: "org_admin",
      },
      {
        user_id: authData.user.id,
        organization_id: newOrg.id,
        role: "funeral_director",
      },
    ]);

    // Send notification to platform admins
    await supabaseClient.from("admin_notifications").insert({
      type: "NEW_FD_REGISTRATION",
      title: "Nieuwe FD-registratie via mortuarium",
      message: `${requestData.company_name} is geregistreerd via ${requestData.mortuarium_name} en wacht op goedkeuring`,
      related_id: newOrg.id,
      related_type: "organization",
      metadata: {
        dossier_ref: requestData.dossier_ref,
        mortuarium_org_id: requestData.mortuarium_org_id,
      },
    });

    // Send invitation email
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://janazapp.com";
    
    await supabaseClient.functions.invoke("send-fd-invitation", {
      body: {
        email: requestData.email,
        firstName: requestData.contact_first_name,
        lastName: requestData.contact_last_name,
        mortuariumName: requestData.mortuarium_name,
        dossierRef: requestData.dossier_ref,
        tempPassword,
        appUrl,
      },
    });

    console.log("Pending FD created:", newOrg.id);

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: newOrg.id,
        user_id: authData.user.id,
        status: "pending",
        activation_link_sent: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-pending-fd function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
