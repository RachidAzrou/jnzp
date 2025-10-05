import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_type, dossier_id, organization_id, metadata } = await req.json();

    console.log('Triggering webhooks for event:', event_type, 'org:', organization_id);

    // Get active webhooks for this organization and event
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for this event');
      return new Response(
        JSON.stringify({ message: 'No webhooks configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Trigger each webhook
    const deliveries = await Promise.all(
      webhooks.map(async (webhook) => {
        const payload = {
          event_type,
          dossier_id,
          organization_id,
          metadata,
          timestamp: new Date().toISOString(),
        };

        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': webhook.secret,
              'User-Agent': 'JanazApp-Webhook/1.0',
            },
            body: JSON.stringify(payload),
          });

          const responseBody = await response.text();

          // Log delivery
          await supabase.from('webhook_deliveries').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            response_status: response.status,
            response_body: responseBody.substring(0, 1000), // Limit size
            delivered_at: new Date().toISOString(),
          });

          return {
            webhook_id: webhook.id,
            success: response.ok,
            status: response.status,
          };
        } catch (error: any) {
          console.error(`Error delivering webhook ${webhook.id}:`, error);

          // Log failed delivery
          await supabase.from('webhook_deliveries').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            error_message: error.message || String(error),
          });

          return {
            webhook_id: webhook.id,
            success: false,
            error: error.message || String(error),
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ deliveries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in trigger-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
