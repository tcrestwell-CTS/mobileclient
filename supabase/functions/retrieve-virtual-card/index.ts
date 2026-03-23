import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * retrieve-virtual-card
 *
 * Securely retrieves sensitive Stripe Issuing card details (number, CVC, expiry)
 * for a given trip_payment that has a virtual_card_id.
 *
 * Only the owning agent (trip_payments.user_id) can retrieve card details.
 * Uses Stripe's `expand` parameter to fetch sensitive fields server-side.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate the agent
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await anonClient.auth.getUser(token);
    if (!authData.user) throw new Error("Not authenticated");

    const userId = authData.user.id;

    // Get the paymentId from the request body
    const { paymentId } = await req.json();
    if (!paymentId) throw new Error("paymentId is required");

    // Fetch payment and verify ownership
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment, error: payErr } = await supabase
      .from("trip_payments")
      .select("id, user_id, virtual_card_id, virtual_card_status, payment_method_choice")
      .eq("id", paymentId)
      .single();

    if (payErr || !payment) throw new Error("Payment not found");
    if (payment.user_id !== userId) throw new Error("Unauthorized");
    if (!payment.virtual_card_id) throw new Error("No virtual card associated with this payment");
    if (payment.payment_method_choice !== "stripe") {
      throw new Error("This payment does not have a Stripe Issuing card");
    }

    // Check if agent has a connected account
    const { data: connectedAccount } = await supabase
      .from("stripe_connected_accounts")
      .select("stripe_account_id, card_issuing_status")
      .eq("user_id", userId)
      .maybeSingle();

    const stripeAccountHeader = connectedAccount?.card_issuing_status === "active"
      ? connectedAccount.stripe_account_id
      : null;

    // Retrieve the card with sensitive details expanded
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const retrieveOptions = stripeAccountHeader
      ? { stripeAccount: stripeAccountHeader }
      : undefined;

    const card = await stripe.issuing.cards.retrieve(
      payment.virtual_card_id,
      { expand: ["number", "cvc"] },
      retrieveOptions,
    );

    return new Response(
      JSON.stringify({
        number: (card as any).number || null,
        cvc: (card as any).cvc || null,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cardholder_name: card.cardholder?.name || null,
        brand: card.brand,
        last4: card.last4,
        status: card.status,
        spending_limit: card.spending_controls?.spending_limits?.[0]?.amount
          ? card.spending_controls.spending_limits[0].amount / 100
          : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("retrieve-virtual-card error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
