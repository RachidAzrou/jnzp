import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackSubmission {
  token: string;
  rating: number;
  comment?: string;
  familyName?: string;
  whatsappPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, rating, comment, familyName, whatsappPhone }: FeedbackSubmission = await req.json();

    // Validate input
    if (!token || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify token
    const { data: feedbackToken, error: tokenError } = await supabase
      .from("feedback_tokens")
      .select("*, dossiers!inner(assigned_fd_org_id)")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (tokenError || !feedbackToken) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired feedback token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (new Date(feedbackToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Feedback token has expired" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from("fd_reviews")
      .insert({
        dossier_id: feedbackToken.dossier_id,
        fd_org_id: feedbackToken.dossiers.assigned_fd_org_id,
        rating,
        comment,
        family_name: familyName,
        whatsapp_phone: whatsappPhone,
      });

    if (feedbackError) throw feedbackError;

    // Mark token as used
    const { error: updateError } = await supabase
      .from("feedback_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", feedbackToken.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Bedankt voor uw feedback!" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in submit-feedback function:", error);
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
