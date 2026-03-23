import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * stripe-issuing-webhook
 *
 * Handles Stripe Issuing webhook events:
 * - issuing_authorization.created: Logs authorization attempts
 * - issuing_authorization.request: Real-time authorization decisions
 * - issuing_transaction.created: After successful charge, auto-lock card + update booking status
 *
 * Webhook signature verification ensures authenticity.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_ISSUING_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.text();

    // Verify webhook signature if secret is configured
    let event: Stripe.Event;
    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // In development/testing without webhook secret
      event = JSON.parse(body);
      console.warn("⚠️ No STRIPE_ISSUING_WEBHOOK_SECRET set — skipping signature verification");
    }

    console.log(`Received event: ${event.type}`);

    // Helper: find trip_payment by virtual_card_id
    const findPaymentByCardId = async (cardId: string) => {
      const { data, error } = await supabase
        .from("trip_payments")
        .select("id, trip_id, user_id, amount, virtual_card_status, booking_id")
        .eq("virtual_card_id", cardId)
        .maybeSingle();
      if (error) console.error("Error finding payment by card ID:", error.message);
      return data;
    };

    // ── issuing_authorization.request ─────────────────────────────────
    // Real-time authorization decision (must respond within 2s)
    if (event.type === "issuing_authorization.request") {
      const authorization = event.data.object as any;
      const cardId = authorization.card?.id;
      const requestedAmount = authorization.pending_request?.amount || 0; // in cents

      console.log(`Authorization request for card ${cardId}, amount: ${requestedAmount}`);

      const payment = cardId ? await findPaymentByCardId(cardId) : null;

      if (!payment) {
        console.log("No matching payment found — declining");
        return new Response(JSON.stringify({ approved: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check amount doesn't exceed payment amount (in cents)
      const maxAmountCents = Math.round(payment.amount * 100);
      const approved = requestedAmount <= maxAmountCents;

      console.log(`Authorization ${approved ? "approved" : "declined"}: requested ${requestedAmount} vs limit ${maxAmountCents}`);

      return new Response(JSON.stringify({ approved }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── issuing_authorization.created ──────────────────────────────────
    if (event.type === "issuing_authorization.created") {
      const authorization = event.data.object as any;
      const cardId = authorization.card?.id;
      const status = authorization.status; // "pending", "closed", "reversed"
      const approved = authorization.approved;

      console.log(`Authorization created for card ${cardId}: status=${status}, approved=${approved}`);

      const payment = cardId ? await findPaymentByCardId(cardId) : null;
      if (payment) {
        // Update virtual_card_status based on authorization
        const newStatus = approved ? "authorized" : "declined";
        await supabase
          .from("trip_payments")
          .update({ virtual_card_status: newStatus })
          .eq("id", payment.id);

        // Notify agent
        const statusLabel = approved ? "authorized" : "declined";
        const formattedAmount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(authorization.amount / 100);

        await supabase.from("agent_notifications").insert({
          user_id: payment.user_id,
          type: "virtual_card_ready",
          title: `💳 Card ${statusLabel === "authorized" ? "Authorized" : "Declined"}`,
          message: `A ${formattedAmount} charge on your supplier card was ${statusLabel}. Merchant: ${authorization.merchant_data?.name || "Unknown"}.`,
          trip_payment_id: payment.id,
          trip_id: payment.trip_id,
        });
      }
    }

    // ── issuing_transaction.created ────────────────────────────────────
    // Transaction posted — this means the charge went through. Lock the card.
    if (event.type === "issuing_transaction.created") {
      const transaction = event.data.object as any;
      const cardId = transaction.card;
      const transactionAmount = Math.abs(transaction.amount); // in cents

      console.log(`Transaction created for card ${cardId}, amount: ${transactionAmount}`);

      const payment = cardId ? await findPaymentByCardId(cardId) : null;
      if (payment) {
        // 1. Cancel/lock the card to prevent further use
        try {
          // Determine if card is on a connected account
          const { data: connectedAccount } = await supabase
            .from("stripe_connected_accounts")
            .select("stripe_account_id, card_issuing_status")
            .eq("user_id", payment.user_id)
            .maybeSingle();

          const stripeAccountHeader =
            connectedAccount?.card_issuing_status === "active"
              ? connectedAccount.stripe_account_id
              : null;

          const cancelOpts = stripeAccountHeader
            ? { stripeAccount: stripeAccountHeader }
            : undefined;

          await stripe.issuing.cards.update(
            cardId,
            { status: "canceled" },
            cancelOpts,
          );
          console.log(`Card ${cardId} canceled after successful transaction`);
        } catch (cancelErr: any) {
          console.error(`Failed to cancel card ${cardId}:`, cancelErr.message);
        }

        // 2. Update trip_payment status
        await supabase
          .from("trip_payments")
          .update({
            virtual_card_status: "used",
            status: "paid",
          })
          .eq("id", payment.id);

        // 3. If linked to a booking, update booking status to confirmed
        if (payment.booking_id) {
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", payment.booking_id);
        }

        // 4. Fire QBO supplier_paid journal entry
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/qbo-sync-trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              trigger_type: "supplier_paid",
              record: {
                id: payment.id,
                user_id: payment.user_id,
                trip_id: payment.trip_id,
                amount: transactionAmount / 100,
                payment_date: new Date().toISOString().split("T")[0],
                details: `Virtual card charge – ${transaction.merchant_data?.name || "Supplier"}`,
              },
            }),
          });
          console.log("Fired qbo-sync-trigger supplier_paid");
        } catch (qboErr: any) {
          console.error("Failed to fire qbo-sync-trigger:", qboErr.message);
        }

        // 5. Notify the agent
        const formattedAmount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(transactionAmount / 100);

        await supabase.from("agent_notifications").insert({
          user_id: payment.user_id,
          type: "virtual_card_ready",
          title: "✅ Supplier Paid — Card Locked",
          message: `${formattedAmount} was successfully charged to your supplier card. The card has been automatically locked. Merchant: ${transaction.merchant_data?.name || "Unknown"}.`,
          trip_payment_id: payment.id,
          trip_id: payment.trip_id,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-issuing-webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
