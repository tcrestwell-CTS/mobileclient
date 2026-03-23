import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const event = body;

    // Handle charge.dispute.created
    if (event.type === "charge.dispute.created") {
      const dispute = event.data?.object;
      if (!dispute) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chargeId = dispute.charge;
      const amount = (dispute.amount || 0) / 100; // Convert from cents
      const reason = dispute.reason || "unknown";
      const disputeId = dispute.id;

      console.log(`Dispute received: ${disputeId}, charge: ${chargeId}, amount: ${amount}, reason: ${reason}`);

      // Try to find matching trip_payment by stripe_session_id or stripe_receipt_url containing the charge
      const { data: payments } = await supabase
        .from("trip_payments")
        .select("id, trip_id, user_id, amount, status")
        .or(`stripe_session_id.eq.${chargeId},stripe_receipt_url.ilike.%${chargeId}%`)
        .limit(1);

      if (payments && payments.length > 0) {
        const payment = payments[0];

        // Update payment status to disputed
        await supabase
          .from("trip_payments")
          .update({ status: "disputed" })
          .eq("id", payment.id);

        // Create agent notification
        await supabase.from("agent_notifications").insert({
          user_id: payment.user_id,
          type: "chargeback_alert",
          title: "⚠️ Chargeback Alert",
          message: `A dispute has been opened for ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}. Reason: ${reason}. Dispute ID: ${disputeId}`,
          trip_id: payment.trip_id,
          trip_payment_id: payment.id,
        });

        // Log to compliance audit
        await supabase.from("compliance_audit_log").insert({
          user_id: payment.user_id,
          event_type: "dispute_opened",
          entity_type: "trip_payment",
          entity_id: payment.id,
          metadata: {
            dispute_id: disputeId,
            charge_id: chargeId,
            amount,
            reason,
          },
        });

        console.log(`Dispute processed: payment ${payment.id} marked as disputed, notification sent`);
      } else {
        console.log(`No matching payment found for charge: ${chargeId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe dispute webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
