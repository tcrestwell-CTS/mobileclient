import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DUFFEL_BASE = "https://api.duffel.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate the agent
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const duffelToken = Deno.env.get("DUFFEL_API_TOKEN");
  if (!duffelToken) {
    return new Response(JSON.stringify({ error: "DUFFEL_API_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const duffelHeaders = {
    Authorization: `Bearer ${duffelToken}`,
    "Content-Type": "application/json",
    "Duffel-Version": "v2",
  };

  try {
    const body = await req.json();
    const { action } = body;

    // ── Search offers ──
    if (action === "search") {
      const { slices, passengers, cabin_class, max_connections } = body;
      const response = await fetch(`${DUFFEL_BASE}/air/offer_requests`, {
        method: "POST",
        headers: duffelHeaders,
        body: JSON.stringify({
          data: {
            slices,
            passengers,
            cabin_class: cabin_class || "economy",
            max_connections: max_connections ?? 1,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Duffel search failed [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get single offer (optionally with available_services for baggage) ──
    if (action === "get_offer") {
      const { offer_id, return_available_services } = body;
      const qs = return_available_services ? "?return_available_services=true" : "";
      const response = await fetch(`${DUFFEL_BASE}/air/offers/${offer_id}${qs}`, {
        headers: duffelHeaders,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Duffel get offer failed [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get seat maps for an offer ──
    if (action === "get_seat_maps") {
      const { offer_id } = body;
      const response = await fetch(
        `${DUFFEL_BASE}/air/seat_maps?offer_id=${encodeURIComponent(offer_id)}`,
        { headers: duffelHeaders }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Duffel seat maps failed [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create order (with optional services for seats & bags) ──
    if (action === "create_order") {
      const { selected_offers, passengers, payments, services } = body;
      const orderPayload: Record<string, unknown> = {
        type: "instant",
        selected_offers,
        passengers,
        payments,
      };
      // Append ancillary services (seats + bags) if provided
      if (services && services.length > 0) {
        orderPayload.services = services;
      }

      const response = await fetch(`${DUFFEL_BASE}/air/orders`, {
        method: "POST",
        headers: duffelHeaders,
        body: JSON.stringify({ data: orderPayload }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Duffel order failed [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Duffel flights error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
