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

    const { flow, city } = await req.json();

    // Get available FD organizations
    const { data: fdOrgs, error } = await supabaseClient
      .from("available_fd_organizations")
      .select("*")
      .order("active_dossiers", { ascending: true })
      .limit(5);

    if (error) throw error;

    // Format for WhatsApp display
    const fdList = fdOrgs.map((fd, index) => ({
      number: index + 1,
      id: fd.id,
      name: fd.name,
      city: fd.city,
      active_dossiers: fd.active_dossiers,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        funeral_directors: fdList,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting available FDs:", error);
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
