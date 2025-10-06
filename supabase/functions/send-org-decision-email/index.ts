import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  email: string;
  firstName: string;
  organizationName: string;
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, organizationName, decision, rejectionReason }: EmailRequest = await req.json();

    console.log(`Sending ${decision} email to ${email} for org ${organizationName}`);

    // TODO: Integrate with actual email service (e.g., Resend)
    // For now, we'll just log the email that would be sent
    
    const emailContent = decision === 'approved' 
      ? {
          subject: `✅ Uw aanvraag voor ${organizationName} is goedgekeurd`,
          body: `
Beste ${firstName},

Goed nieuws! Uw aanvraag voor ${organizationName} is goedgekeurd.

U kunt nu inloggen op het platform met uw eerder geregistreerde e-mailadres en wachtwoord.

Bij uw eerste login wordt u door de onboarding wizard geleid om uw organisatie volledig in te richten.

Veel succes met het gebruik van JanazApp!

Met vriendelijke groet,
Het JanazApp Team
          `
        }
      : {
          subject: `❌ Uw aanvraag voor ${organizationName} is afgewezen`,
          body: `
Beste ${firstName},

Helaas moeten wij u meedelen dat uw aanvraag voor ${organizationName} is afgewezen.

Reden: ${rejectionReason || 'Niet opgegeven'}

Als u vragen heeft over deze beslissing of opnieuw wilt aanvragen, neem dan contact met ons op.

Met vriendelijke groet,
Het JanazApp Team
          `
        };

    console.log('Email that would be sent:', emailContent);

    // In production, this would send via email service:
    // await sendEmail({ to: email, ...emailContent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification queued',
        preview: emailContent // Remove in production
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-org-decision-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
