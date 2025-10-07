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

    // WhatsApp notifications removed - feedback link must be shared manually via the portal

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
