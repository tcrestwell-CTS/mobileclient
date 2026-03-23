import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agency settings
    const { data: settings } = await adminClient
      .from("agency_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.tier_auto_promote) {
      return new Response(
        JSON.stringify({ message: "Auto-promotion is disabled", promotions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evalMonths = settings.evaluation_period_months || 12;
    const tier1Threshold = settings.tier_1_threshold || 100000;
    const tier2Threshold = settings.tier_2_threshold || 250000;

    // Calculate the evaluation start date
    const evalStart = new Date();
    evalStart.setMonth(evalStart.getMonth() - evalMonths);

    // Get all agent profiles (excluding "none" tier which is office admin)
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, full_name, commission_tier");

    if (!profiles?.length) {
      return new Response(
        JSON.stringify({ message: "No profiles found", promotions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get gross sales by agent in the evaluation period
    const { data: bookings } = await adminClient
      .from("bookings")
      .select("user_id, gross_sales, created_at")
      .gte("created_at", evalStart.toISOString())
      .neq("status", "cancelled");

    // Sum gross sales per agent
    const salesByAgent: Record<string, number> = {};
    for (const b of bookings || []) {
      salesByAgent[b.user_id] = (salesByAgent[b.user_id] || 0) + (b.gross_sales || 0);
    }

    const tierOrder = ["none", "tier_1", "tier_2", "tier_3"];
    const promotions: Array<{ user_id: string; name: string; from: string; to: string; gross_sales: number }> = [];

    for (const profile of profiles) {
      const currentTier = profile.commission_tier || "tier_1";
      if (currentTier === "none" || currentTier === "tier_3") continue;

      const agentSales = salesByAgent[profile.user_id] || 0;
      let newTier = currentTier;

      if (currentTier === "tier_1" && agentSales >= tier2Threshold) {
        newTier = "tier_3";
      } else if (currentTier === "tier_1" && agentSales >= tier1Threshold) {
        newTier = "tier_2";
      } else if (currentTier === "tier_2" && agentSales >= tier2Threshold) {
        newTier = "tier_3";
      }

      if (newTier !== currentTier && tierOrder.indexOf(newTier) > tierOrder.indexOf(currentTier)) {
        // Promote
        await adminClient
          .from("profiles")
          .update({ commission_tier: newTier })
          .eq("user_id", profile.user_id);

        // Log to compliance audit
        await adminClient.from("compliance_audit_log").insert({
          user_id: user.id, // Admin who triggered
          event_type: "tier_promotion",
          entity_type: "profile",
          entity_id: profile.user_id,
          client_name: profile.full_name,
          metadata: {
            from_tier: currentTier,
            to_tier: newTier,
            gross_sales: agentSales,
            evaluation_period_months: evalMonths,
          },
        });

        promotions.push({
          user_id: profile.user_id,
          name: profile.full_name || "Unknown",
          from: currentTier,
          to: newTier,
          gross_sales: agentSales,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Evaluation complete. ${promotions.length} promotions applied.`,
        promotions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error evaluating tiers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
