import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Find authorizations that are > 30 days old and still pending/authorized
    const { data: expiredAuths, error: fetchError } = await supabase
      .from("cc_authorizations")
      .select("id, booking_id, user_id, cardholder_name")
      .in("status", ["pending", "authorized"])
      .lt("created_at", cutoffDate);

    if (fetchError) throw fetchError;
    if (!expiredAuths?.length) {
      return new Response(JSON.stringify({ message: "No expired authorizations", processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const auth of expiredAuths) {
      // Mark authorization as expired
      await supabase
        .from("cc_authorizations")
        .update({ status: "expired" })
        .eq("id", auth.id);

      // Reset any linked payments back to pending
      await supabase
        .from("trip_payments")
        .update({ status: "pending" })
        .eq("booking_id", auth.booking_id)
        .eq("status", "authorized");

      // Create notification for the advisor
      await supabase.from("agent_notifications").insert({
        user_id: auth.user_id,
        type: "cc_expired",
        title: "CC Authorization Expired",
        message: `Authorization for ${auth.cardholder_name || "client"} has expired after 30 days. Re-authorization required.`,
      });

      // Create re-authorization workflow task
      // First find the trip_id from the booking
      const { data: booking } = await supabase
        .from("bookings")
        .select("trip_id")
        .eq("id", auth.booking_id)
        .single();

      if (booking?.trip_id) {
        await supabase.from("workflow_tasks").insert({
          trip_id: booking.trip_id,
          user_id: auth.user_id,
          title: `Re-authorize CC for ${auth.cardholder_name || "client"}`,
          task_type: "reauthorization",
          description: "Previous CC authorization expired after 30 days. Send new authorization request to client.",
          status: "pending",
        });
      }

      processed++;
    }

    console.log(`Expired ${processed} CC authorizations`);

    return new Response(
      JSON.stringify({ message: "CC authorization expiry complete", processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CC auth expiry error:", error);
    return new Response(JSON.stringify({ error: "Expiry check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
