import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackLinkRequest {
  dossierId: string;
  sendWhatsApp?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dossierId, sendWhatsApp = true }: FeedbackLinkRequest = await req.json();

    // Generate feedback token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "generate_feedback_token"
    );

    if (tokenError) throw tokenError;

    const token = tokenData as string;

    // Insert token record
    const { error: insertError } = await supabase
      .from("feedback_tokens")
      .insert({
        dossier_id: dossierId,
        token,
      });

    if (insertError) throw insertError;

    // Create feedback URL
    const appUrl = Deno.env.get("APP_URL") || "https://janazapp.lovable.app";
    const feedbackUrl = `${appUrl}/feedback/${token}`;

    if (sendWhatsApp) {
      // Get dossier and family contact info
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("*, assigned_fd_org_id")
        .eq("id", dossierId)
        .single();

      const { data: familyContact } = await supabase
        .from("family_contacts")
        .select("*")
        .eq("dossier_id", dossierId)
        .limit(1)
        .single();

      const { data: commPrefs } = await supabase
        .from("dossier_communication_preferences")
        .select("*")
        .eq("dossier_id", dossierId)
        .single();

      const { data: fdOrg } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", dossier?.assigned_fd_org_id)
        .single();

      if (familyContact && commPrefs?.whatsapp_phone) {
        // Send feedback request notification using supabase.functions.invoke
        const { error: notifError } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              dossierId,
              triggerEvent: "FEEDBACK_REQUEST",
              recipientType: "FAMILY",
              customData: {
                feedback_url: feedbackUrl,
                family_name: familyContact.name || "Familie",
                deceased_name: dossier?.deceased_name || "",
                fd_name: fdOrg?.name || "",
              },
            },
          }
        );

        if (notifError) {
          console.error("Error sending notification:", notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedbackUrl,
        token 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-feedback-link function:", error);
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
