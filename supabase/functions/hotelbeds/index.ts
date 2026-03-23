import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HB_BASE = "https://api.test.hotelbeds.com/hotel-api/1.0";

function generateSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const raw = apiKey + secret + timestamp;
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }) as any; // We'll await this
}

async function hbFetch(path: string, method: string, body?: any) {
  const apiKey = Deno.env.get("HOTELBEDS_API_KEY");
  const apiSecret = Deno.env.get("HOTELBEDS_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error("HotelBeds API credentials not configured");
  }

  const signature = await generateSignature(apiKey, apiSecret);

  const headers: Record<string, string> = {
    "Api-key": apiKey,
    "X-Signature": signature,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const url = `${HB_BASE}${path}`;
  const options: RequestInit = { method, headers };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `HotelBeds API error [${response.status}]`;
    throw new Error(errorMsg);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
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

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case "search": {
        // Availability search
        const body: any = {
          stay: {
            checkIn: params.checkIn,
            checkOut: params.checkOut,
          },
          occupancies: params.occupancies || [{ rooms: 1, adults: 2, children: 0 }],
        };

        // Support search by destination code or geolocation
        if (params.destination) {
          body.destination = { code: params.destination };
        }
        if (params.geolocation) {
          body.geolocation = params.geolocation;
        }
        if (params.hotels) {
          body.hotels = { hotel: params.hotels };
        }

        // Optional filters
        if (params.filter) {
          body.filter = params.filter;
        }

        result = await hbFetch("/hotels", "POST", body);
        break;
      }

      case "checkrate": {
        // Check rate for selected rooms
        const body = {
          rooms: params.rooms.map((r: any) => ({ rateKey: r.rateKey })),
        };
        result = await hbFetch("/checkrates", "POST", body);
        break;
      }

      case "book": {
        // Confirm booking
        const body: any = {
          holder: params.holder,
          rooms: params.rooms,
          clientReference: params.clientReference || "CrestwellTravel",
        };
        if (params.remark) {
          body.remark = params.remark;
        }
        if (params.tolerance !== undefined) {
          body.tolerance = params.tolerance;
        }
        result = await hbFetch("/bookings", "POST", body);
        break;
      }

      case "get_booking": {
        result = await hbFetch(`/bookings/${params.bookingId}`, "GET");
        break;
      }

      case "cancel": {
        result = await hbFetch(`/bookings/${params.bookingId}?cancellationFlag=CANCELLATION`, "DELETE");
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("HotelBeds function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
