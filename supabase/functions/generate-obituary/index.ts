import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObituaryRequest {
  dossierId: string;
  janazahEventId: string;
  newVersion: number;
  deceasedName: string;
  displayId: string;
  scheduledAt: string;
  location: string;
}

// Generate obituary text content
function generateObituaryContent(
  lang: 'NL' | 'AR',
  data: ObituaryRequest
): string {
  const date = new Date(data.scheduledAt);
  const dateStr = lang === 'NL' 
    ? date.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const timeStr = date.toLocaleTimeString(lang === 'NL' ? 'nl-NL' : 'ar-SA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Extract last name (simplified - takes last word)
  const lastName = data.deceasedName.split(' ').pop() || data.deceasedName;

  if (lang === 'NL') {
    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap');
    body {
      font-family: 'Noto Serif', serif;
      margin: 0;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 60px 50px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border-radius: 8px;
    }
    .arabic-header {
      font-size: 24px;
      text-align: center;
      color: #2c5282;
      margin-bottom: 30px;
      font-weight: 600;
      line-height: 1.6;
    }
    .title {
      font-size: 28px;
      font-weight: 600;
      text-align: center;
      color: #1a202c;
      margin-bottom: 30px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
    }
    .content {
      font-size: 16px;
      line-height: 1.8;
      color: #2d3748;
      margin-bottom: 20px;
    }
    .details {
      background: #f7fafc;
      padding: 20px;
      border-left: 4px solid #667eea;
      margin: 25px 0;
      font-size: 16px;
    }
    .details strong {
      color: #2c5282;
    }
    .family {
      font-style: italic;
      text-align: right;
      margin-top: 40px;
      font-size: 16px;
      color: #4a5568;
    }
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 14px;
      color: #718096;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="arabic-header">
      إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ<br>
      <small style="font-size: 14px; font-weight: normal;">Voorwaar, aan Allah behoren wij en tot Hem keren wij terug.</small>
    </div>
    
    <h1 class="title">Overlijdensbericht – Janazah</h1>
    
    <p class="content">
      Met droefenis delen wij het overlijden mee van <strong>${data.deceasedName}</strong>.
    </p>
    
    <div class="details">
      Het janazagebed zal plaatsvinden op:<br>
      <strong>${dateStr}</strong> om <strong>${timeStr}</strong><br>
      <strong>${data.location}</strong>
    </div>
    
    <p class="content">
      Wij vragen om duʿa voor de overledene en geduld en troost voor de nabestaanden.<br>
      Moge Allah hem/haar genadig zijn en hem/haar een plaats schenken in het Paradijs.
    </p>
    
    <p class="family">
      Namens de familie: <strong>Familie ${lastName}</strong>
    </p>
    
    <div class="footer">
      JanazApp • Dossier ${data.displayId}
    </div>
  </div>
</body>
</html>`;
  } else {
    // Arabic version
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&display=swap');
    body {
      font-family: 'Noto Naskh Arabic', serif;
      margin: 0;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      direction: rtl;
    }
    .container {
      background: white;
      padding: 60px 50px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border-radius: 8px;
    }
    .title {
      font-size: 32px;
      font-weight: 600;
      text-align: center;
      color: #1a202c;
      margin-bottom: 30px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
    }
    .content {
      font-size: 18px;
      line-height: 2;
      color: #2d3748;
      margin-bottom: 20px;
      text-align: right;
    }
    .details {
      background: #f7fafc;
      padding: 20px;
      border-right: 4px solid #667eea;
      margin: 25px 0;
      font-size: 18px;
      text-align: right;
    }
    .details strong {
      color: #2c5282;
    }
    .family {
      font-style: italic;
      text-align: left;
      margin-top: 40px;
      font-size: 18px;
      color: #4a5568;
    }
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 14px;
      color: #718096;
      direction: ltr;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">نعي – صلاة الجنازة</h1>
    
    <p class="content">
      ببالغ الحزن ننعى وفاة <strong>${data.deceasedName}</strong>.
    </p>
    
    <div class="details">
      ستقام صلاة الجنازة في:<br>
      <strong>${dateStr}</strong> عند الساعة <strong>${timeStr}</strong><br>
      <strong>${data.location}</strong>
    </div>
    
    <p class="content">
      نرجو الدعاء للفقيد/الفقيدة، وأن يلهم الله أهله وذويه الصبر والسلوان.<br>
      اللهم اغفر له/لها وارحمه/وارحمها واجعل مثواه/مثواها الجنة.
    </p>
    
    <p class="family">
      بالنيابة عن العائلة: <strong>عائلة ${lastName}</strong>
    </p>
    
    <div class="footer">
      JanazApp • ملف ${data.displayId}
    </div>
  </div>
</body>
</html>`;
  }
}

// Convert HTML to PNG using Puppeteer/Browserless
async function htmlToPng(html: string): Promise<Blob> {
  // Using a headless browser API service (you would need to set up)
  // For now, we'll create a simple canvas-based approach
  
  // This is a placeholder - in production, you'd use:
  // 1. Browserless.io API
  // 2. Puppeteer in Deno
  // 3. HTML to Image service
  
  // For MVP: we'll skip PNG generation and only do PDF
  throw new Error("PNG generation not yet implemented");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: ObituaryRequest = await req.json();
    console.log('Generating obituary for dossier:', requestData.dossierId);

    // Generate both language versions
    const languages: ('NL' | 'AR')[] = ['NL', 'AR'];
    const generatedDocs = [];

    for (const lang of languages) {
      const htmlContent = generateObituaryContent(lang, requestData);
      
      // For MVP: Store HTML as file (can be converted to PDF client-side)
      // In production: convert to PDF server-side
      const fileName = `obituary-${requestData.displayId}-v${requestData.newVersion}-${lang}.html`;
      const filePath = `obituaries/${requestData.dossierId}/${fileName}`;

      // Upload HTML to storage
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, htmlBlob, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          dossier_id: requestData.dossierId,
          doc_type: 'OBITUARY_JANAZAH',
          file_url: publicUrl,
          file_name: fileName,
          status: 'APPROVED',
          language: lang,
          version: requestData.newVersion,
          uploaded_by: null // System generated
        })
        .select()
        .single();

      if (docError) {
        console.error('Document insert error:', docError);
        throw docError;
      }

      generatedDocs.push({ lang, url: publicUrl, docId: docData.id });
    }

    // Find family thread for this dossier
    const { data: familyThread } = await supabase
      .from('threads')
      .select('id')
      .eq('dossier_id', requestData.dossierId)
      .eq('thread_type', 'DOSSIER_FAMILY')
      .single();

    if (familyThread) {
      // Send chat message with download links
      const nlDoc = generatedDocs.find(d => d.lang === 'NL');
      const arDoc = generatedDocs.find(d => d.lang === 'AR');

      const messageText = `We hebben het overlijdensbericht voor ${requestData.deceasedName} klaargezet met de details van het janazagebed.\nJe kunt het hieronder downloaden en delen met familie en vrienden.\n\n📄 Nederlands: ${nlDoc?.url}\n📄 العربية: ${arDoc?.url}`;

      await supabase.from('chat_messages').insert({
        thread_id: familyThread.id,
        dossier_id: requestData.dossierId,
        sender_user_id: null, // System message
        sender_role: 'funeral_director', // On behalf of FD
        message: messageText,
        channel: 'PORTAL'
      });
    }

    // Log event
    await supabase.from('dossier_events').insert({
      dossier_id: requestData.dossierId,
      event_type: 'OBITUARY_PUBLISHED',
      event_description: `Overlijdensbericht versie ${requestData.newVersion} gegenereerd`,
      metadata: {
        version: requestData.newVersion,
        languages: ['NL', 'AR'],
        scheduled_at: requestData.scheduledAt,
        location: requestData.location
      }
    });

    // Mark task as complete
    await supabase
      .from('kanban_tasks')
      .update({ status: 'DONE', completed_at: new Date().toISOString() })
      .eq('dossier_id', requestData.dossierId)
      .eq('task_type', 'PREP_MOSQUE')
      .eq('status', 'TODO');

    return new Response(
      JSON.stringify({ 
        success: true, 
        documents: generatedDocs,
        version: requestData.newVersion
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating obituary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});