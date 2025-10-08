import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObituaryRequest {
  dossier_id: string;
  service_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dossier_id, service_id }: ObituaryRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch dossier data
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select('deceased_last_name, deceased_gender')
      .eq('id', dossier_id)
      .single();

    if (dossierError || !dossier) {
      throw new Error('Dossier not found');
    }

    // Fetch service data
    const { data: service, error: serviceError } = await supabase
      .from('case_events')
      .select('scheduled_at, location_text')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      throw new Error('Service not found');
    }

    const lastName = dossier.deceased_last_name || 'Familie';
    const scheduledDate = service.scheduled_at 
      ? new Date(service.scheduled_at).toLocaleDateString('nl-NL', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'Nader te bepalen';
    const scheduledTime = service.scheduled_at
      ? new Date(service.scheduled_at).toLocaleTimeString('nl-NL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      : '';
    const location = service.location_text || 'Locatie nog te bevestigen';

    // Generate NL version
    const htmlNL = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overlijdensbericht</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      padding: 40px; 
      background: #f9f9f9; 
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { 
      font-size: 28px; 
      margin-bottom: 10px; 
      color: #333;
    }
    h2 { 
      font-size: 22px; 
      margin: 20px 0; 
      color: #555;
    }
    p { 
      font-size: 16px; 
      line-height: 1.8; 
      color: #666;
    }
    .family-name {
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</h1>
    <p>Wij zijn van Allah en tot Hem keren wij terug</p>
    <h2>In Memoriam</h2>
    <p class="family-name">Namens familie ${lastName}</p>
    <p>Het janazahgebed vindt plaats op:<br>
    ${scheduledDate} om ${scheduledTime}<br>
    ${location}</p>
  </div>
</body>
</html>`;

    // Generate AR version
    const htmlAR = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نعي</title>
  <style>
    body { 
      font-family: 'Traditional Arabic', Arial, sans-serif; 
      text-align: center; 
      padding: 40px; 
      background: #f9f9f9; 
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { 
      font-size: 28px; 
      margin-bottom: 10px; 
      color: #333;
    }
    h2 { 
      font-size: 22px; 
      margin: 20px 0; 
      color: #555;
    }
    p { 
      font-size: 18px; 
      line-height: 1.8; 
      color: #666;
    }
    .family-name {
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</h1>
    <h2>نعي</h2>
    <p class="family-name">نيابة عن عائلة ${lastName}</p>
    <p>ستقام صلاة الجنازة في:<br>
    ${scheduledDate} الساعة ${scheduledTime}<br>
    ${location}</p>
  </div>
</body>
</html>`;

    // Upload to storage
    const nlPath = `${dossier_id}/obituary_nl.html`;
    const arPath = `${dossier_id}/obituary_ar.html`;

    const { error: nlUploadError } = await supabase.storage
      .from('dossier-documents')
      .upload(nlPath, htmlNL, {
        contentType: 'text/html',
        upsert: true,
      });

    if (nlUploadError) throw nlUploadError;

    const { error: arUploadError } = await supabase.storage
      .from('dossier-documents')
      .upload(arPath, htmlAR, {
        contentType: 'text/html',
        upsert: true,
      });

    if (arUploadError) throw arUploadError;

    // Get public URLs
    const { data: nlUrl } = supabase.storage
      .from('dossier-documents')
      .getPublicUrl(nlPath);

    const { data: arUrl } = supabase.storage
      .from('dossier-documents')
      .getPublicUrl(arPath);

    // Create document records
    await supabase.from('documents').insert([
      {
        dossier_id,
        doc_type: 'OTHER',
        file_name: 'obituary_nl.html',
        file_url: nlUrl.publicUrl,
        status: 'APPROVED',
        language: 'NL',
      },
      {
        dossier_id,
        doc_type: 'OTHER',
        file_name: 'obituary_ar.html',
        file_url: arUrl.publicUrl,
        status: 'APPROVED',
        language: 'AR',
      },
    ]);

    // Find family thread
    const { data: thread } = await supabase
      .from('threads')
      .select('id')
      .eq('dossier_id', dossier_id)
      .eq('type', 'DOSSIER_FAMILY')
      .single();

    // Post message in family thread
    if (thread) {
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        dossier_id,
        sender_role: 'funeral_director',
        sender_user_id: '00000000-0000-0000-0000-000000000000', // System user
        channel: 'PORTAL',
        message: `Overlijdensbericht gegenereerd:\n\n📄 [Nederlands](${nlUrl.publicUrl})\n📄 [العربية](${arUrl.publicUrl})`,
      });
    }

    // Log event
    await supabase.from('dossier_events').insert({
      dossier_id,
      event_type: 'OBITUARY_GENERATED',
      event_description: 'Overlijdensbericht automatisch gegenereerd (NL + AR)',
      metadata: {
        service_id,
        nl_url: nlUrl.publicUrl,
        ar_url: arUrl.publicUrl,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        nl_url: nlUrl.publicUrl,
        ar_url: arUrl.publicUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating obituary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
