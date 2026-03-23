import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { record } = await req.json();
    if (!record) {
      return new Response(JSON.stringify({ error: "No record provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tripId = record.id;
    const userId = record.user_id;
    const clientId = record.client_id;

    if (!clientId) {
      console.log("No client assigned to trip, skipping post-trip email");
      return new Response(JSON.stringify({ skipped: true, reason: "no_client" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, email, first_name, preferred_first_name")
      .eq("id", clientId)
      .single();

    if (clientError || !client?.email) {
      console.log("Client not found or no email:", clientError);
      // Mark as sent to avoid retries
      await supabase.from("trips").update({ post_trip_email_sent: true }).eq("id", tripId);
      return new Response(JSON.stringify({ skipped: true, reason: "no_client_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get branding settings
    const { data: branding } = await supabase
      .from("branding_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    const agencyName = branding?.agency_name || "Your Travel Agency";
    const tagline = branding?.tagline || "Your Journey, Our Passion";
    const primaryColor = branding?.primary_color || "#0D7377";
    const accentColor = branding?.accent_color || "#E8763A";
    const logoUrl = branding?.logo_url || "";
    const phone = branding?.phone || "";
    const website = branding?.website || "";
    const fromEmail = branding?.from_email || "send@crestwellgetaways.com";
    const fromName = branding?.from_name || agencyName;

    let portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.crestwelltravels.com";
    if (!/^https?:\/\//i.test(portalBaseUrl)) {
      portalBaseUrl = `https://${portalBaseUrl}`;
    }
    const portalUrlBase = portalBaseUrl.replace(/\/+$/, "");
    const hasClientPath = new URL(portalUrlBase).pathname.includes("/client");
    const clientPortalUrl = hasClientPath ? portalUrlBase : `${portalUrlBase}/client`;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 60px; margin-bottom: 16px;" />`
      : "";

    const footerHtml = `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">${agencyName}</p>
        ${tagline ? `<p style="margin: 4px 0; font-style: italic;">${tagline}</p>` : ""}
        ${phone ? `<p style="margin: 4px 0;">📞 ${phone}</p>` : ""}
        ${website ? `<p style="margin: 4px 0;"><a href="${website}" style="color: ${primaryColor};">${website}</a></p>` : ""}
        <p style="margin: 8px 0;"><a href="${clientPortalUrl}" style="color: ${primaryColor}; text-decoration: underline;">Access Your Client Portal</a></p>
      </div>
    `;

    const clientName = client.preferred_first_name || client.first_name || client.name;
    const tripName = record.trip_name || "your trip";
    const destination = record.destination || "your destination";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${logoHtml}
          <h1 style="color: ${primaryColor}; margin: 0;">${agencyName}</h1>
        </div>
        <h2 style="color: #1f2937;">Welcome Back! 🎉</h2>
        <p style="color: #4b5563; line-height: 1.6;">Dear ${clientName},</p>
        <p style="color: #4b5563; line-height: 1.6;">We hope you had an incredible time in <strong>${destination}</strong>! It was a pleasure helping you plan <strong>${tripName}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <h3 style="color: #1f2937; margin: 0 0 8px 0;">How was your trip?</h3>
          <p style="color: #4b5563; margin: 0 0 16px 0;">Your feedback helps us create even better experiences.</p>
          <p style="color: #6b7280; font-size: 14px;">Reply to this email to share your thoughts — we'd love to hear from you!</p>
        </div>

        <div style="background-color: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <h3 style="color: #92400e; margin: 0 0 8px 0;">Know someone who'd love to travel? ✨</h3>
          <p style="color: #78350f; margin: 0;">Share our name with friends and family — and we'll take care of the rest. Your referrals mean the world to us.</p>
        </div>

        <p style="color: #4b5563; line-height: 1.6;">Thank you for traveling with ${agencyName}. We can't wait to help plan your next adventure!</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${website || clientPortalUrl}" style="background-color: ${primaryColor}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Plan Your Next Trip</a>
        </div>
        ${footerHtml}
      </div>
    `;

    // Send email via Resend
    const { Resend } = await import("npm:resend@4.0.0");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [client.email],
      subject: `How was ${tripName}? 🌍 We'd love to hear from you!`,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Error sending post-trip email:", sendError);
      return new Response(JSON.stringify({ error: sendError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark trip as email sent
    await supabase.from("trips").update({ post_trip_email_sent: true }).eq("id", tripId);

    // Log the email
    await supabase.from("email_logs").insert({
      user_id: userId,
      client_id: clientId,
      to_email: client.email,
      subject: `How was ${tripName}? 🌍 We'd love to hear from you!`,
      template: "trip_completed",
      status: "sent",
    });

    console.log(`Post-trip email sent to ${client.email} for trip ${tripId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in post-trip-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
