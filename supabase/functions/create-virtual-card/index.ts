import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

/**
 * create-virtual-card
 *
 * Creates a Stripe Issuing virtual card after a client payment is approved.
 * Also inserts an agent_notification so the agent is alerted.
 *
 * Called by:
 *   - verify-stripe-payment (after Stripe checkout succeeds, payment_method_choice = 'stripe')
 *   - Portal client Affirm flow (after Affirm VCN checkout succeeds, payment_method_choice = 'affirm')
 *
 * For Stripe Issuing:
 *   Requires Stripe Issuing to be enabled on the account.
 *   Creates a cardholder (or reuses existing) and issues a virtual card
 *   with a spending limit matching the payment amount.
 *
 * For Affirm:
 *   The Affirm VCN details are passed from the client-side callback.
 *   We store the checkout_id and notify the agent.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const {
      paymentId,
      method,           // 'stripe' or 'affirm'
      affirmCheckoutId, // Only for Affirm — the checkout_id from Affirm VCN callback
      expirationDays,   // Optional: number of days until card expires (default 14)
      mccRestrictions,  // Optional: array of allowed MCC categories
    } = body;

    if (!paymentId) throw new Error("paymentId is required");
    if (!method || !["stripe", "affirm"].includes(method)) {
      throw new Error("method must be 'stripe' or 'affirm'");
    }

    // ── Fetch payment + trip + client info ────────────────────────────
    const { data: payment, error: payErr } = await supabase
      .from("trip_payments")
      .select("id, amount, trip_id, status, payment_type, user_id")
      .eq("id", paymentId)
      .single();
    if (payErr || !payment) throw new Error("Payment not found");

    const { data: trip } = await supabase
      .from("trips")
      .select("trip_name, destination, client_id, user_id")
      .eq("id", payment.trip_id)
      .single();

    const agentUserId = trip?.user_id || payment.user_id;

    let clientName = "Client";
    let agentEmail: string | null = null;
    if (trip?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name, email")
        .eq("id", trip.client_id)
        .single();
      if (client?.name) clientName = client.name;
    }

    // Get agent's email for notification
    const { data: agentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", agentUserId)
      .single();

    // Get agent email from auth.users via admin API
    const { data: { user: agentUser } } = await supabase.auth.admin.getUserById(agentUserId);
    agentEmail = agentUser?.email || null;

    const tripName = trip?.trip_name || "Trip";
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(payment.amount);

    let virtualCardId: string | null = null;
    let notificationTitle = "";
    let notificationMessage = "";

    // ── STRIPE ISSUING FLOW ──────────────────────────────────────────
    if (method === "stripe") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      try {
        // Check if agent has a Stripe Connect connected account
        const { data: connectedAccount } = await supabase
          .from("stripe_connected_accounts")
          .select("stripe_account_id, card_issuing_status")
          .eq("user_id", agentUserId)
          .maybeSingle();

        const stripeAccountHeader = connectedAccount?.card_issuing_status === "active"
          ? connectedAccount.stripe_account_id
          : null;

        // Step 1: Create or find a cardholder
        let cardholder: any;
        const listParams: any = { email: agentEmail || undefined, limit: 1 };
        const existingCardholders = stripeAccountHeader
          ? await stripe.issuing.cardholders.list(listParams, { stripeAccount: stripeAccountHeader })
          : await stripe.issuing.cardholders.list(listParams);

        if (existingCardholders.data.length > 0) {
          cardholder = existingCardholders.data[0];
        } else {
          const createParams: any = {
            name: agentProfile?.full_name || "Crestwell Travel Agent",
            email: agentEmail || undefined,
            type: "individual",
            billing: {
              address: {
                line1: "N/A",
                city: "N/A",
                state: "CA",
                postal_code: "00000",
                country: "US",
              },
            },
          };
          cardholder = stripeAccountHeader
            ? await stripe.issuing.cardholders.create(createParams, { stripeAccount: stripeAccountHeader })
            : await stripe.issuing.cardholders.create(createParams);
        }

        // Step 2: Create a virtual card with spending limit and controls
        // Travel-related MCC categories
        const defaultTravelMCCs = [
          "airlines_air_carriers",
          "lodging_hotels_motels_resorts",
          "travel_agencies_tour_operators",
          "transportation_services",
          "car_rental_agencies",
          "cruise_lines",
          "steamship_cruise_lines",
          "boat_rentals_and_leases",
          "tourist_attractions_and_exhibits",
          "bus_lines",
          "railroads",
          "limousines_and_taxicabs",
          "passenger_railways",
        ];
        const allowedCategories = mccRestrictions && mccRestrictions.length > 0
          ? mccRestrictions
          : defaultTravelMCCs;

        const cardParams: any = {
          cardholder: cardholder.id,
          currency: "usd",
          type: "virtual",
          spending_controls: {
            spending_limits: [
              {
                amount: Math.round(payment.amount * 100),
                interval: "all_time",
                categories: allowedCategories,
              },
            ],
            allowed_categories: allowedCategories,
          },
          metadata: {
            trip_payment_id: paymentId,
            trip_id: payment.trip_id,
            client_name: clientName,
            expiration_days: String(expirationDays || 14),
          },
        };

        const card = stripeAccountHeader
          ? await stripe.issuing.cards.create(cardParams, { stripeAccount: stripeAccountHeader })
          : await stripe.issuing.cards.create(cardParams);

        virtualCardId = card.id;

        const accountLabel = stripeAccountHeader ? " (Connected Account)" : "";
        notificationTitle = `💳 Stripe Virtual Card Ready`;
        notificationMessage = `A Stripe Issuing virtual card${accountLabel} has been created for ${clientName}'s ${formattedAmount} payment on "${tripName}". Retrieve the card details from your dashboard.`;
      } catch (stripeErr: any) {
        console.error("Stripe Issuing error:", stripeErr.message);

        notificationTitle = `💳 Stripe Payment Approved`;
        notificationMessage = `${clientName}'s ${formattedAmount} Stripe payment for "${tripName}" has been approved. Stripe Issuing is not enabled on this account — please process supplier payment manually.`;
      }
    }

    // ── AFFIRM FLOW ──────────────────────────────────────────────────
    if (method === "affirm") {
      virtualCardId = affirmCheckoutId || null;

      notificationTitle = `💳 Affirm Virtual Card Ready`;
      notificationMessage = `${clientName} has been approved for ${formattedAmount} via Affirm for "${tripName}". A virtual card has been issued. Retrieve the card details from your dashboard.`;
    }

    // ── Update the trip_payments record ───────────────────────────────
    await supabase
      .from("trip_payments")
      .update({
        payment_method_choice: method,
        virtual_card_status: virtualCardId ? "ready" : "pending",
        virtual_card_id: virtualCardId || null,
      })
      .eq("id", paymentId);

    // ── Create agent notification ────────────────────────────────────
    await supabase.from("agent_notifications").insert({
      user_id: agentUserId,
      type: "virtual_card_ready",
      title: notificationTitle,
      message: notificationMessage,
      trip_payment_id: paymentId,
      trip_id: payment.trip_id,
    });

    // ── Send email notification to agent ──────────────────────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && agentEmail) {
      try {
        const resend = new Resend(RESEND_API_KEY);

        // Get branding for styled email
        const { data: branding } = await supabase
          .from("branding_settings")
          .select("agency_name, primary_color, logo_url, from_email, from_name")
          .eq("user_id", agentUserId)
          .maybeSingle();

        const agencyName = branding?.agency_name || "Crestwell Travel Services";
        const primaryColor = branding?.primary_color || "#0D7377";
        const logoUrl = branding?.logo_url || "";
        const fromEmail = branding?.from_email || "send@crestwellgetaways.com";
        const fromName = branding?.from_name || agencyName;

        const logoHtml = logoUrl
          ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 50px; margin-bottom: 12px;" />`
          : "";

        const methodLabel = method === "stripe" ? "Stripe" : "Affirm";
        const cardStatusLabel = virtualCardId
          ? "A virtual card has been created and is ready for use."
          : "Please process the supplier payment manually.";

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              ${logoHtml}
              <h1 style="color: ${primaryColor}; margin: 0; font-size: 20px;">${agencyName}</h1>
            </div>
            <h2 style="color: #1f2937;">🔔 Virtual Card Notification</h2>
            <p style="color: #4b5563; line-height: 1.6;">A client payment has been approved and a virtual card action is required:</p>
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 8px 0; color: #374151;"><strong>Client:</strong> ${clientName}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Trip:</strong> ${tripName}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> ${formattedAmount}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Payment Method:</strong> ${methodLabel}</p>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #86efac;">
                <p style="margin: 0; color: #166534; font-weight: 600;">${cardStatusLabel}</p>
              </div>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://agents.crestwelltravels.com" style="background-color: ${primaryColor}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Open Dashboard</a>
            </div>
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
              <p>${agencyName}</p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [agentEmail],
          subject: `${notificationTitle} — ${clientName} · ${formattedAmount}`,
          html: emailHtml,
        });

        console.log("Agent notification email sent to", agentEmail);
      } catch (emailErr) {
        console.error("Failed to send agent notification email:", emailErr);
        // Non-fatal — continue
      }
    }

    return new Response(JSON.stringify({
      success: true,
      virtualCardId,
      method,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-virtual-card error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
