import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // WhatsApp verification (webhook setup)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'janazapp_verify';

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WhatsApp webhook verified');
        return new Response(challenge, { status: 200 });
      }

      return new Response('Verification failed', { status: 403 });
    }

    // Handle incoming WhatsApp messages
    const body = await req.json();
    console.log('Incoming WhatsApp webhook:', JSON.stringify(body, null, 2));

    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return new Response(JSON.stringify({ status: 'no_messages' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from; // WhatsApp phone number
    const messageId = message.id;
    const messageType = message.type;

    let messageBody = '';
    let attachmentUrl = null;
    let attachmentName = null;
    let attachmentType = null;

    // Extract message content based on type
    if (messageType === 'text') {
      messageBody = message.text.body;
    } else if (messageType === 'image') {
      attachmentType = 'image';
      attachmentUrl = message.image.id; // Will need to fetch from WhatsApp API
      attachmentName = message.image.caption || 'WhatsApp Image';
      messageBody = message.image.caption || '[Afbeelding verzonden]';
    } else if (messageType === 'document') {
      attachmentType = 'document';
      attachmentUrl = message.document.id;
      attachmentName = message.document.filename || 'WhatsApp Document';
      messageBody = message.document.caption || '[Document verzonden]';
    } else if (messageType === 'audio') {
      attachmentType = 'audio';
      attachmentUrl = message.audio.id;
      attachmentName = 'WhatsApp Audio';
      messageBody = '[Audio verzonden]';
    }

    // Extract dossier_id from message context or use a lookup
    // For MVP, we can check if there's a dossier linked to this phone number
    const { data: prefData } = await supabase
      .from('dossier_communication_preferences')
      .select('dossier_id')
      .eq('whatsapp_phone', from)
      .maybeSingle();

    if (!prefData?.dossier_id) {
      console.log('No dossier found for WhatsApp number:', from);
      // Send a WhatsApp message back explaining they need to use the portal first
      return new Response(JSON.stringify({ status: 'no_dossier_linked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dossierId = prefData.dossier_id;

    // Insert message into chat_messages
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        dossier_id: dossierId,
        sender_user_id: from, // Use phone number as identifier for WhatsApp
        sender_role: 'family',
        channel: 'WHATSAPP',
        message: messageBody,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        whatsapp_message_id: messageId,
      });

    if (insertError) {
      console.error('Error inserting message:', insertError);
      throw insertError;
    }

    // Update last channel used
    await supabase
      .from('dossier_communication_preferences')
      .upsert({
        dossier_id: dossierId,
        last_channel_used: 'WHATSAPP',
        whatsapp_phone: from,
      }, {
        onConflict: 'dossier_id'
      });

    // Audit log
    await supabase.from('audit_events').insert({
      event_type: 'chat.message.received',
      description: `WhatsApp bericht ontvangen van ${from}`,
      dossier_id: dossierId,
      metadata: {
        channel: 'WHATSAPP',
        message_type: messageType,
        from: from,
      },
    });

    console.log('WhatsApp message processed successfully');

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
