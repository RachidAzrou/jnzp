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

    const { action, request_id, user_id, reason } = await req.json();

    if (!["accept", "decline"].includes(action)) {
      throw new Error("Invalid action");
    }

    if (!request_id || !user_id) {
      throw new Error("Missing required parameters");
    }

    let result;
    if (action === "accept") {
      const { data, error } = await supabaseClient.rpc("accept_fd_request", {
        p_request_id: request_id,
        p_user_id: user_id,
      });

      if (error) throw error;
      result = data;

      // Notify family via WhatsApp
      if (result?.success && result?.dossier_id) {
        await notifyFamilyAcceptance(supabaseClient, result.dossier_id, result.fd_org_id);
      }
    } else {
      const { data, error } = await supabaseClient.rpc("decline_fd_request", {
        p_request_id: request_id,
        p_user_id: user_id,
        p_reason: reason || "Geen reden opgegeven",
      });

      if (error) throw error;
      result = data;

      // Notify family via WhatsApp
      if (result?.success && result?.dossier_id) {
        await notifyFamilyDecline(supabaseClient, result.dossier_id);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling FD request:", error);
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

async function notifyFamilyAcceptance(supabaseClient: any, dossierId: string, fdOrgId: string) {
  try {
    // Get FD organization name
    const { data: fdOrg } = await supabaseClient
      .from("organizations")
      .select("name")
      .eq("id", fdOrgId)
      .single();

    // Get family WhatsApp number
    const { data: commPrefs } = await supabaseClient
      .from("dossier_communication_preferences")
      .select("whatsapp_phone")
      .eq("dossier_id", dossierId)
      .single();

    if (!commPrefs?.whatsapp_phone) {
      console.log("No WhatsApp number found for dossier", dossierId);
      return;
    }

    const message = `Goed nieuws — ${fdOrg?.name || "De uitvaartondernemer"} heeft uw dossier aanvaard.\nZe nemen vandaag nog contact met u op.\nUw dossier is nu actief in Janazapp.\n🕊️ Moge Allah de overledene genadig zijn.`;

    // Send WhatsApp message (implementation depends on your WhatsApp provider)
    console.log("Would send WhatsApp message to", commPrefs.whatsapp_phone, ":", message);

    // Insert notification in chat_messages
    await supabaseClient.from("chat_messages").insert({
      dossier_id: dossierId,
      sender_role: "funeral_director",
      sender_user_id: "00000000-0000-0000-0000-000000000000", // System user
      message,
      channel: "WHATSAPP",
    });
  } catch (error) {
    console.error("Error notifying family of acceptance:", error);
  }
}

async function notifyFamilyDecline(supabaseClient: any, dossierId: string) {
  try {
    // Get family WhatsApp number
    const { data: commPrefs } = await supabaseClient
      .from("dossier_communication_preferences")
      .select("whatsapp_phone")
      .eq("dossier_id", dossierId)
      .single();

    if (!commPrefs?.whatsapp_phone) {
      console.log("No WhatsApp number found for dossier", dossierId);
      return;
    }

    const message = `De uitvaartondernemer is momenteel niet beschikbaar.\nWilt u een andere uitvaartondernemer kiezen?\n\nStuur "Ja" om de lijst opnieuw te zien.`;

    // Send WhatsApp message
    console.log("Would send WhatsApp message to", commPrefs.whatsapp_phone, ":", message);

    // Insert notification in chat_messages
    await supabaseClient.from("chat_messages").insert({
      dossier_id: dossierId,
      sender_role: "funeral_director",
      sender_user_id: "00000000-0000-0000-0000-000000000000", // System user
      message,
      channel: "WHATSAPP",
    });
  } catch (error) {
    console.error("Error notifying family of decline:", error);
  }
}
