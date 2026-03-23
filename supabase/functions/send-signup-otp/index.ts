import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, action, code } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailLower = email.toLowerCase().trim();

    if (action === "verify") {
      if (!code || code.length !== 6) {
        return new Response(JSON.stringify({ error: "Valid 6-digit code is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: codeRecord } = await supabase
        .from("signup_verification_codes")
        .select("id, expires_at, verified")
        .eq("email", emailLower)
        .eq("code", code)
        .maybeSingle();

      if (!codeRecord) {
        return new Response(JSON.stringify({ error: "Invalid verification code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(codeRecord.expires_at) <= new Date()) {
        return new Response(JSON.stringify({ error: "Verification code has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabase
        .from("signup_verification_codes")
        .update({ verified: true })
        .eq("id", codeRecord.id);

      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that there's a valid invitation for this email
    const { data: invitation } = await supabase
      .from("invitations")
      .select("id, token, status, expires_at")
      .eq("email", emailLower)
      .eq("status", "pending")
      .maybeSingle();

    if (!invitation || new Date(invitation.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "No valid invitation found for this email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete any existing codes for this email
    await supabase
      .from("signup_verification_codes")
      .delete()
      .eq("email", emailLower);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store the code
    const { error: insertError } = await supabase
      .from("signup_verification_codes")
      .insert({
        email: emailLower,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error storing code:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Send the code via Resend
    const resend = new Resend(RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: "Crestwell Travel Services <send@crestwellgetaways.com>",
      to: emailLower,
      subject: "Your Verification Code - Crestwell Travel Services",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0D7377; margin: 0;">Crestwell Travel Services</h1>
          </div>
          <h2 style="color: #1f2937;">Your Verification Code</h2>
          <p style="color: #4b5563; line-height: 1.6;">Use the following code to verify your email and complete your account setup:</p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background-color: #f3f4f6; padding: 16px 40px; border-radius: 8px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #0D7377;">
              ${code}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">Crestwell Travel Services</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send verification code");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent", invitation_token: invitation.token }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-signup-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
