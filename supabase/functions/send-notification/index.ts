import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  dossierId: string;
  triggerEvent: string;
  recipientType: string;
  customData?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dossierId, triggerEvent, recipientType, customData = {} }: NotificationRequest = await req.json();

    // Get dossier information
    const { data: dossier, error: dossierError } = await supabase
      .from("dossiers")
      .select("*, assigned_fd_org_id")
      .eq("id", dossierId)
      .single();

    if (dossierError || !dossier) {
      throw new Error("Dossier not found");
    }

    // Get family contact information
    const { data: familyContact } = await supabase
      .from("family_contacts")
      .select("*")
      .eq("dossier_id", dossierId)
      .limit(1)
      .single();

    // Get communication preferences
    const { data: commPrefs } = await supabase
      .from("dossier_communication_preferences")
      .select("*")
      .eq("dossier_id", dossierId)
      .single();

    // Get FD organization name
    const { data: fdOrg } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", dossier.assigned_fd_org_id)
      .single();

    // Get notification template
    const { data: template } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("trigger_event", triggerEvent)
      .eq("recipient_type", recipientType)
      .eq("is_active", true)
      .single();

    if (!template || !familyContact) {
      console.log("No template or family contact found");
      return new Response(
        JSON.stringify({ success: false, message: "No template or contact found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Choose language based on family preference
    const language = familyContact.preferred_language || "nl";
    let message = template[`template_${language}`] || template.template_nl;

    // Replace placeholders
    const replacements = {
      family_name: familyContact.name || "Familie",
      deceased_name: dossier.deceased_name || "",
      fd_name: fdOrg?.name || "",
      ...customData,
    };

    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(`{${key}}`, "g"), value);
    }

    // Only EMAIL channel is supported
    const channel = "EMAIL";
    const recipientContact = familyContact.email || "";

    if (!recipientContact) {
      console.log("No recipient contact available");
      return new Response(
        JSON.stringify({ success: false, message: "No recipient contact" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Log the notification
    const { error: logError } = await supabase
      .from("notification_log")
      .insert({
        dossier_id: dossierId,
        template_id: template.id,
        recipient_type: recipientType,
        recipient_contact: recipientContact,
        channel,
        status: "SENT",
        sent_at: new Date().toISOString(),
        metadata: { trigger_event: triggerEvent, message },
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    // In a real implementation, you would send the actual email notification here
    // For Email: use Resend or similar service

    console.log(`Notification logged for ${recipientContact} via ${channel}`);
    console.log(`Message: ${message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        channel, 
        recipient: recipientContact,
        message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
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
