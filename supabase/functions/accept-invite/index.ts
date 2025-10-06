import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const userId = userData?.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();

    // Fetch invitation
    const { data: inv, error } = await supabase
      .from("organization_invitations")
      .select("id, status, expires_at, invited_role, organization_id, email")
      .eq("token", token)
      .maybeSingle();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: "Uitnodiging niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.status !== "PENDING") {
      return new Response(
        JSON.stringify({ error: "Uitnodiging is niet meer geldig" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      await supabase
        .from("organization_invitations")
        .update({ status: "EXPIRED" })
        .eq("id", inv.id);

      return new Response(
        JSON.stringify({ error: "Uitnodiging is verlopen" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert user role (add or update)
    const { error: urErr } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        organization_id: inv.organization_id,
        role: inv.invited_role,
        is_active: true,
      },
      { onConflict: "user_id,role" }
    );

    if (urErr) {
      console.error("Failed to assign role:", urErr);
      return new Response(
        JSON.stringify({ error: "Kon rol niet toewijzen" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from("organization_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", inv.id);

    // Log audit event
    await supabase.from("audit_events").insert({
      user_id: userId,
      event_type: "TEAM_INVITED_ACCEPTED",
      target_type: "UserRole",
      target_id: inv.organization_id,
      description: `Uitnodiging geaccepteerd voor ${inv.invited_role}`,
      metadata: {
        email: inv.email,
        role: inv.invited_role,
      },
    });

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in accept-invite:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
