import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  mortuariumName: string;
  dossierRef: string;
  tempPassword: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      firstName,
      lastName,
      mortuariumName,
      dossierRef,
      tempPassword,
      appUrl,
    }: InvitationRequest = await req.json();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "JanAzapp <onboarding@resend.dev>",
        to: [email],
        subject: `Welkom bij JanAzapp – toegang tot dossier ${dossierRef}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welkom bij JanAzapp</h2>
            <p>Dag ${firstName} ${lastName},</p>
            <p>Het mortuarium <strong>${mortuariumName}</strong> heeft u toegang gegeven tot dossier <strong>${dossierRef}</strong> in JanAzapp.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Login e-mail:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Tijdelijk wachtwoord:</strong> <code style="background-color: #fff; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
              <p style="margin: 5px 0;"><strong>Login link:</strong> <a href="${appUrl}">${appUrl}</a></p>
            </div>

            <p style="color: #d97706; font-weight: 500;">⚠️ Bij eerste login vragen we u een nieuw wachtwoord te kiezen.</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Beveiliging:</strong></p>
              <ul style="font-size: 14px; margin: 10px 0;">
                <li>Dit tijdelijke wachtwoord verloopt binnen 24 uur</li>
                <li>Na 5 mislukte inlogpogingen wordt uw account 15 minuten vergrendeld</li>
              </ul>
            </div>

            <p>Vragen? Antwoord op deze mail of contacteer onze support.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Deze e-mail is verzonden door JanAzapp</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${emailResponse.statusText}`);
    }

    const emailData = await emailResponse.json();

    console.log("FD invitation email sent:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-fd-invitation function:", error);
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
