import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendReceiptEmail(
  supabase: any,
  paymentId: string,
  amount: number,
  receiptUrl: string | null,
  paymentType: string,
) {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set, skipping receipt email");
      return;
    }

    const { data: payment } = await supabase
      .from("trip_payments")
      .select("trip_id")
      .eq("id", paymentId)
      .single();
    if (!payment?.trip_id) return;

    const { data: trip } = await supabase
      .from("trips")
      .select("trip_name, destination, client_id, user_id")
      .eq("id", payment.trip_id)
      .single();
    if (!trip?.client_id) return;

    const [clientRes, brandingRes] = await Promise.all([
      supabase.from("clients").select("name, email").eq("id", trip.client_id).single(),
      supabase.from("branding_settings").select("agency_name, primary_color, logo_url, tagline, phone, website, from_email, from_name").eq("user_id", trip.user_id).maybeSingle(),
    ]);

    const client = clientRes.data;
    if (!client?.email) return;

    const branding = brandingRes.data;
    const agencyName = branding?.agency_name || "Your Travel Agency";
    const primaryColor = branding?.primary_color || "#0D7377";
    const logoUrl = branding?.logo_url || "";
    const tagline = branding?.tagline || "";
    const phone = branding?.phone || "";
    const website = branding?.website || "";
    const fromEmail = branding?.from_email || "send@crestwellgetaways.com";
    const fromName = branding?.from_name || agencyName;

    let portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.crestwelltravels.com";
    if (!/^https?:\/\//i.test(portalBaseUrl)) portalBaseUrl = `https://${portalBaseUrl}`;
    const portalUrlBase = portalBaseUrl.replace(/\/+$/, "");
    const clientPortalUrl = new URL(portalUrlBase).pathname.includes("/client") ? portalUrlBase : `${portalUrlBase}/client`;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 60px; margin-bottom: 16px;" />`
      : "";

    const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    const formattedType = paymentType === "final_balance" ? "Final Balance" : paymentType.charAt(0).toUpperCase() + paymentType.slice(1);
    const paymentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const receiptButtonHtml = receiptUrl
      ? `<div style="text-align: center; margin: 24px 0;">
           <a href="${receiptUrl}" style="background-color: ${primaryColor}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View Full Receipt</a>
         </div>`
      : "";

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          ${logoHtml}
          <h1 style="color: ${primaryColor}; margin: 0;">${agencyName}</h1>
        </div>
        <h2 style="color: #1f2937;">Payment Receipt ✅</h2>
        <p style="color: #4b5563; line-height: 1.6;">Dear ${client.name || "Valued Client"},</p>
        <p style="color: #4b5563; line-height: 1.6;">Thank you for your payment! Here's your receipt:</p>
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 8px 0; color: #374151;"><strong>Trip:</strong> ${trip.trip_name || "Your Trip"}</p>
          ${trip.destination ? `<p style="margin: 8px 0; color: #374151;"><strong>Destination:</strong> ${trip.destination}</p>` : ""}
          <p style="margin: 8px 0; color: #374151;"><strong>Payment Type:</strong> ${formattedType}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Date:</strong> ${paymentDate}</p>
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #86efac;">
            <p style="margin: 0; color: #166534; font-size: 24px; font-weight: bold; text-align: center;">${formattedAmount}</p>
            <p style="margin: 4px 0 0 0; color: #166534; text-align: center; font-size: 14px;">Payment Confirmed</p>
          </div>
        </div>
        ${receiptButtonHtml}
        <p style="color: #4b5563; line-height: 1.6;">You can view your full payment history in your client portal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${clientPortalUrl}/payments" style="color: ${primaryColor}; text-decoration: underline;">View Payment History</a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">${agencyName}</p>
          ${tagline ? `<p style="margin: 4px 0; font-style: italic;">${tagline}</p>` : ""}
          ${phone ? `<p style="margin: 4px 0;">📞 ${phone}</p>` : ""}
          ${website ? `<p style="margin: 4px 0;"><a href="${website}" style="color: ${primaryColor};">${website}</a></p>` : ""}
          <p style="margin: 8px 0;"><a href="${clientPortalUrl}" style="color: ${primaryColor}; text-decoration: underline;">Access Your Client Portal</a></p>
        </div>
      </div>
    `;

    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [client.email],
      subject: `Payment Receipt – ${formattedAmount} for ${trip.trip_name || "Your Trip"}`,
      html: emailHtml,
    });

    await supabase.from("email_logs").insert({
      user_id: trip.user_id,
      client_id: trip.client_id,
      to_email: client.email,
      subject: `Payment Receipt – ${formattedAmount} for ${trip.trip_name || "Your Trip"}`,
      template: "payment_receipt",
      status: "sent",
    });

    console.log("Receipt email sent to", client.email);
  } catch (err) {
    console.error("Failed to send receipt email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    let receiptUrl: string | null = null;

    if (session.payment_status === "paid") {
      if (session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
          if (pi.latest_charge) {
            const charge = await stripe.charges.retrieve(pi.latest_charge as string);
            receiptUrl = charge.receipt_url || null;
          }
        } catch (e) {
          console.error("Failed to fetch receipt URL:", e);
        }
      }

      const paymentId = session.metadata?.trip_payment_id;
      if (paymentId) {
        const { data: paymentBefore } = await supabase
          .from("trip_payments")
          .select("amount, payment_type, status, payment_method_choice")
          .eq("id", paymentId)
          .single();

        await supabase
          .from("trip_payments")
          .update({
            status: "paid",
            payment_method: "stripe",
            payment_date: new Date().toISOString().split("T")[0],
            details: `Stripe payment ${session.payment_intent}`,
            stripe_receipt_url: receiptUrl,
          })
          .eq("id", paymentId);

        // Send receipt email only for newly paid payments
        if (paymentBefore && paymentBefore.status !== "paid") {
          sendReceiptEmail(
            supabase,
            paymentId,
            paymentBefore.amount,
            receiptUrl,
            paymentBefore.payment_type,
          ).catch((e) => console.error("Receipt email background error:", e));

          // Always trigger Stripe Issuing virtual card creation for Stripe payments.
          // If the client explicitly chose Affirm, skip (Affirm VCN is handled client-side).
          // For all other cases (explicit "stripe" choice or no choice set), issue a Stripe VCN.
          if (paymentBefore.payment_method_choice !== "affirm") {
            try {
              const vcRes = await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-virtual-card`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
                  },
                  body: JSON.stringify({ paymentId, method: "stripe" }),
                },
              );
              if (!vcRes.ok) {
                const vcErr = await vcRes.text();
                console.error("Virtual card creation failed:", vcErr);
              } else {
                console.log("Stripe VCN creation triggered for payment", paymentId);
              }
            } catch (vcError) {
              console.error("Virtual card creation error:", vcError);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      status: session.payment_status,
      paid: session.payment_status === "paid",
      receiptUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-stripe-payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});