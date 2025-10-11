import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get completed column ID
    const { data: completedColumn } = await supabase
      .from("task_board_columns")
      .select("id")
      .eq("label", "Afgesloten")
      .single();

    if (!completedColumn) {
      console.log("No 'Afgesloten' column found");
      return new Response(
        JSON.stringify({ message: "No completed column found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find tasks that are in "Afgesloten" column for more than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: tasksToDelete, error: fetchError } = await supabase
      .from("kanban_tasks")
      .select("id, title")
      .eq("column_id", completedColumn.id)
      .lt("updated_at", twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching tasks:", fetchError);
      throw fetchError;
    }

    if (!tasksToDelete || tasksToDelete.length === 0) {
      console.log("No tasks to cleanup");
      return new Response(
        JSON.stringify({ message: "No tasks to cleanup", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the tasks (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from("kanban_tasks")
      .delete()
      .in("id", tasksToDelete.map(t => t.id));

    if (deleteError) {
      console.error("Error deleting tasks:", deleteError);
      throw deleteError;
    }

    console.log(`Cleaned up ${tasksToDelete.length} completed tasks`);

    return new Response(
      JSON.stringify({
        message: "Cleanup completed successfully",
        count: tasksToDelete.length,
        tasks: tasksToDelete.map(t => ({ id: t.id, title: t.title }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cleanup function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
