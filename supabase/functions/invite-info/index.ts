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
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: inv, error } = await supabase
      .from("organization_invitations")
      .select("status, expires_at, invited_role, organization_id, organizations(name)")
      .eq("token", token)
      .maybeSingle();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: "Uitnodiging niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
    const status = expired ? "EXPIRED" : inv.status;

    // Update status if expired
    if (expired && inv.status === "PENDING") {
      await supabase
        .from("organization_invitations")
        .update({ status: "EXPIRED" })
        .eq("token", token);
    }

    const roleLabel = inv.invited_role === "org_admin" ? "Admin" : "Medewerker";

    return new Response(
      JSON.stringify({
        organization_name: (inv.organizations as any)?.name ?? "Onbekend",
        role_label: roleLabel,
        status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-info:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
