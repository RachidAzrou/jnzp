import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify token and get mosque org
    const { data: feed, error: feedError } = await supabase
      .from("public_feeds")
      .select("mosque_org_id, theme")
      .eq("token", token)
      .single();

    if (feedError || !feed) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active announcements
    const { data: announcements, error: annError } = await supabase
      .from("public_announcements")
      .select("*")
      .eq("mosque_org_id", feed.mosque_org_id)
      .or(`visible_until.is.null,visible_until.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (annError) throw annError;

    // Get mosque info
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, address, contact_phone")
      .eq("id", feed.mosque_org_id)
      .single();

    if (orgError) throw orgError;

    return new Response(
      JSON.stringify({
        mosque: {
          name: org.name,
          address: org.address,
          contact: org.contact_phone,
        },
        announcements: announcements || [],
        theme: feed.theme || {},
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in public-mosque-feed:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
