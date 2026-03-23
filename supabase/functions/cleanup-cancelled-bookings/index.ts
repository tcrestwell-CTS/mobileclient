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

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

    // Find bookings that are cancelled/archived and were updated more than 7 days ago
    const { data: staleBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, trip_id")
      .in("status", ["cancelled", "archived"])
      .lt("updated_at", cutoffDate);

    if (fetchError) throw fetchError;
    if (!staleBookings?.length) {
      return new Response(JSON.stringify({ message: "No stale bookings to clean up", deleted: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingIds = staleBookings.map((b) => b.id);
    let totalDeleted = 0;

    // Delete related records in dependency order
    // 1. Booking travelers
    const { count: travelersDeleted } = await supabase
      .from("booking_travelers")
      .delete({ count: "exact" })
      .in("booking_id", bookingIds);

    // 2. CC authorizations (and their expired data)
    const { count: authsDeleted } = await supabase
      .from("cc_authorizations")
      .delete({ count: "exact" })
      .in("booking_id", bookingIds);

    // 3. Commissions
    const { count: commissionsDeleted } = await supabase
      .from("commissions")
      .delete({ count: "exact" })
      .in("booking_id", bookingIds);

    // 4. Trip payments linked to these bookings
    const { count: paymentsDeleted } = await supabase
      .from("trip_payments")
      .delete({ count: "exact" })
      .in("booking_id", bookingIds);

    // 5. Itinerary items linked to these bookings
    const { count: itemsDeleted } = await supabase
      .from("itinerary_items")
      .delete({ count: "exact" })
      .in("booking_id", bookingIds);

    // 6. Finally delete the bookings themselves
    const { count: bookingsDeleted, error: deleteError } = await supabase
      .from("bookings")
      .delete({ count: "exact" })
      .in("id", bookingIds);

    if (deleteError) throw deleteError;

    totalDeleted = bookingsDeleted || 0;

    console.log(`Cleanup complete: ${totalDeleted} bookings, ${travelersDeleted || 0} travelers, ${authsDeleted || 0} CC auths, ${commissionsDeleted || 0} commissions, ${paymentsDeleted || 0} payments, ${itemsDeleted || 0} itinerary items removed`);

    return new Response(JSON.stringify({
      message: "Cleanup complete",
      deleted: {
        bookings: totalDeleted,
        travelers: travelersDeleted || 0,
        cc_authorizations: authsDeleted || 0,
        commissions: commissionsDeleted || 0,
        payments: paymentsDeleted || 0,
        itinerary_items: itemsDeleted || 0,
      },
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(JSON.stringify({ error: "Cleanup failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});