import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { dossier_id, fd_org_id, whatsapp_phone } = await req.json();

    if (!dossier_id || !fd_org_id) {
      throw new Error("Missing required parameters");
    }

    // Create FD request
    const { data: request, error: requestError } = await supabaseClient
      .from("fd_requests")
      .insert({
        dossier_id,
        fd_org_id,
        status: "PENDING",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Get FD organization details
    const { data: fdOrg } = await supabaseClient
      .from("organizations")
      .select("name")
      .eq("id", fd_org_id)
      .single();

    // Send confirmation to family
    const confirmationMessage = `Dank u. Ik vraag even de beschikbaarheid van ${fdOrg?.name || "de uitvaartondernemer"}...`;

    // Insert message
    await supabaseClient.from("chat_messages").insert({
      dossier_id,
      sender_role: "funeral_director",
      sender_user_id: "00000000-0000-0000-0000-000000000000", // System user
      message: confirmationMessage,
      channel: "WHATSAPP",
    });

    console.log("FD request created:", request.id);
    console.log("Would send WhatsApp confirmation to", whatsapp_phone);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: request.id,
        message: confirmationMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating FD request:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
