import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: "Admin" | "Medewerker";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role }: InvitationRequest = await req.json();

    // Get user's organization and determine role
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("organization_id, organizations(name, type)")
      .eq("user_id", user.id)
      .eq("role", "org_admin")
      .not("organization_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!userRole?.organization_id) {
      return new Response(
        JSON.stringify({ error: "Geen organisatie gevonden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orgName = (userRole.organizations as any)?.name || "Onbekend";
    const orgType = (userRole.organizations as any)?.type;

    // Determine invited_role based on organization type and selected role
    let invitedRole: string;
    if (role === "Admin") {
      invitedRole = "org_admin";
    } else {
      // Medewerker - map to operational role based on org type
      switch (orgType) {
        case "FUNERAL_DIRECTOR":
          invitedRole = "funeral_director";
          break;
        case "MOSQUE":
          invitedRole = "mosque";
          break;
        case "WASPLAATS":
          invitedRole = "wasplaats";
          break;
        case "INSURER":
          invitedRole = "insurer";
          break;
        default:
          invitedRole = "funeral_director"; // fallback
      }
    }

    // Check if user already exists with this role in this org
    const { data: existingRole } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("organization_id", userRole.organization_id)
      .eq("role", invitedRole)
      .limit(1)
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "Deze gebruiker is al lid van deze organisatie" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for pending invitation
    const { data: existingInvite } = await supabaseClient
      .from("organization_invitations")
      .select("id")
      .eq("organization_id", userRole.organization_id)
      .eq("email", email)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Er is al een actieve uitnodiging voor dit e-mailadres" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate token
    const { data: token } = await supabaseClient.rpc("generate_invitation_token");

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("organization_invitations")
      .insert({
        organization_id: userRole.organization_id,
        email,
        invited_role: invitedRole,
        token,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Kon uitnodiging niet aanmaken" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email
    const acceptUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}/invite/accept?token=${token}`;

    const emailResponse = await resend.emails.send({
      from: "JanazApp <noreply@janazapp.com>",
      to: [email],
      subject: `Uitnodiging voor JanazApp – ${orgName}`,
      html: `
        <!doctype html>
        <html lang="nl">
          <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#f7f7f7; margin:0; padding:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 8px;">
                  <h1 style="margin:0;font-size:20px;">Uitnodiging voor JanazApp</h1>
                  <p style="color:#555;margin:8px 0 0;">Je bent uitgenodigd om lid te worden van <strong>${orgName}</strong> als <strong>${role}</strong>.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 24px;">
                  <p style="color:#555;margin:0;">Klik op onderstaande knop om je uitnodiging te accepteren. De link is <strong>48 uur</strong> geldig.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <a href="${acceptUrl}"
                     style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;">
                    Uitnodiging accepteren
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 24px 24px;">
                  <p style="color:#777;margin:0;font-size:12px;">
                    Werkt de knop niet? Plak deze link in je browser:<br>
                    <span style="word-break:break-all;color:#0f766e;">${acceptUrl}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f2f4f7;color:#6b7280;font-size:12px;padding:16px 24px;">
                  JanazApp • Veilig & AVG-proof • Vragen? support@janazapp.com
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
Je bent uitgenodigd om lid te worden van ${orgName} als ${role}.
Accepteer via deze link (48u geldig):

${acceptUrl}

Werkt de link niet? Kopieer en plak in je browser.
Vragen? support@janazapp.com
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, invitation }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-team-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
