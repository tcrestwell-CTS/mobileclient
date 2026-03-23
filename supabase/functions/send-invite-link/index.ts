import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SITE_URL = 'https://crestwellgetaways.com';
const FROM_EMAIL = 'noreply@crestwellgetaways.com';
const FROM_NAME = 'Crestwell Travel Services';

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      link_type,
      client_name,
      client_email,
      booking_ref,
      trip_name,
      amount,
      notes,
      expires_hours = 72,
      single_use = true,
    } = await req.json();

    if (!link_type || !client_name || !client_email) {
      return new Response(JSON.stringify({ error: 'link_type, client_name, client_email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = generateToken();
    const expires_at = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();

    const requestedLinkType = String(link_type).toLowerCase();
    const isFinancing = requestedLinkType === 'financing';
    const normalizedLinkType = isFinancing ? 'financing' : 'payment';

    const { error: dbError } = await supabase.from('secure_links').insert({
      token,
      link_type: normalizedLinkType,
      client_name,
      client_email,
      booking_ref: booking_ref || null,
      trip_name: trip_name || null,
      amount: amount || null,
      notes: notes || null,
      expires_at,
      single_use,
      active: true,
    });

    if (dbError) throw new Error(dbError.message);

    const pageUrl = isFinancing ? '/financing' : '/payment';
    const secureUrl = `${SITE_URL}${pageUrl}?token=${token}`;

    const isPayment = !isFinancing;
    const pageLabel = isPayment ? 'Secure Payment' : 'Financing Application';
    const actionLabel = isPayment ? 'Make Your Payment' : 'Start Your Application';

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1b2a 0%,#1b3a5c 100%);padding:32px 30px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td>
                    <img src="https://zbtnulzvwreqzbmxulpv.supabase.co/storage/v1/object/public/email-assets/logo.png?v=1" alt="Crestwell Travel Services" width="160" style="display:block;margin:0 auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 30px 28px;">
              <p style="font-size:16px;color:#1a1a1a;margin:0 0 18px;line-height:1.6;">
                Dear ${client_name},
              </p>
              <p style="font-size:15px;color:#4c5562;margin:0 0 24px;line-height:1.6;">
                ${isPayment
                  ? `Your secure payment link from Crestwell Travel Services is ready.${trip_name ? ` This link is for your <strong>${trip_name}</strong> booking.` : ''}`
                  : `You've been invited to complete a travel financing application with Crestwell Travel Services.${trip_name ? ` This is for your <strong>${trip_name}</strong> trip.` : ''}`
                }
              </p>

              ${amount ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="font-size:13px;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;">${isPayment ? 'Amount Due' : 'Estimated Loan Amount'}</p>
                    <p style="font-size:28px;font-weight:bold;color:#0d1b2a;margin:0;">$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </td>
                </tr>
              </table>` : ''}

              ${booking_ref ? `
              <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Booking Reference: <strong>${booking_ref}</strong></p>` : ''}

              <!-- CTA Button (Outlook-safe) -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${secureUrl}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="23%" strokecolor="#173b75" fillcolor="#173b75">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:600;">${actionLabel}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${secureUrl}" style="display:inline-block;background-color:#173b75;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 36px;border-radius:12px;mso-hide:all;">
                      ${actionLabel}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef9e7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;margin:0 0 24px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="font-size:13px;color:#92400e;margin:0;line-height:1.5;">
                      &#128274; <strong>Secure Link:</strong> This link is private and intended only for ${client_name}. 
                      It expires in ${expires_hours} hours${single_use ? ' and can only be used once' : ''}.
                      Do not share this link with others.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size:12px;color:#173b75;word-break:break-all;margin:0 0 24px;">
                ${secureUrl}
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

              <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.6;">
                Questions? Call us at <strong>888.508.6893</strong> or reply to this email.<br/>
                <a href="mailto:info@crestwellgetaways.com" style="color:#0d1b2a;">info@crestwellgetaways.com</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="font-size:11px;color:#9ca3af;margin:0;">&copy; ${new Date().getFullYear()} Crestwell Travel Services &middot; Georgia &middot; Tennessee &middot; Alabama</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: client_email,
        subject: isPayment
          ? `Your Secure Payment Link — Crestwell Travel Services${trip_name ? ` (${trip_name})` : ''}`
          : `Your Financing Application Invite — Crestwell Travel Services`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json();
      throw new Error(`Resend error: ${err.message}`);
    }

    return new Response(JSON.stringify({ success: true, token, expires_at, link: secureUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
