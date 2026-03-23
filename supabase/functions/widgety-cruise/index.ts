import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIDGETY_BASE = "https://www.widgety.co.uk/api";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WIDGETY_APP_ID = Deno.env.get("WIDGETY_APP_ID");
    const WIDGETY_TOKEN = Deno.env.get("WIDGETY_TOKEN");
    if (!WIDGETY_APP_ID || !WIDGETY_TOKEN) {
      throw new Error("Widgety API credentials not configured");
    }

    const { action, ...params } = await req.json();

    // Auth check (skip for operators listing which is read-only metadata)
    if (action !== "operators") {
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
    }

    if (action === "search") {
      // Search cruises by operator, dates, market
      const searchParams = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
        market: params.market || "us",
      });
      if (params.operators) searchParams.set("operators", params.operators);
      if (params.date_from) searchParams.set("date_from", params.date_from);
      if (params.date_to) searchParams.set("date_to", params.date_to);
      if (params.locations) searchParams.set("locations", params.locations);
      if (params.regions) searchParams.set("regions", params.regions);
      if (params.page) searchParams.set("page", String(params.page));
      searchParams.set("limit", String(params.limit || 25));

      // Fetch operators for images (in parallel with search)
      const operatorsParams = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
      });
      const operatorsUrl = `${WIDGETY_BASE}/operators.json?${operatorsParams.toString()}`;

      // Try V3 Holidays API
      const url = `${WIDGETY_BASE}/holidays.json?${searchParams.toString()}`;
      console.log("Widgety search URL:", url.replace(WIDGETY_TOKEN, "***"));

      const [resp, opsResp] = await Promise.all([
        fetch(url),
        fetch(operatorsUrl),
      ]);

      if (!resp.ok) {
        const text = await resp.text();
        console.error("Widgety search error:", resp.status, text);
        throw new Error(`Widgety API error: ${resp.status} - ${text}`);
      }
      const data = await resp.json();

      // Build operator slug -> image map
      const operatorImages: Record<string, string> = {};
      if (opsResp.ok) {
        const opsData = await opsResp.json();
        for (const op of opsData.operators || []) {
          const slug = op.id || op.slug;
          if (slug && op.cover_image_href) {
            operatorImages[slug] = op.cover_image_href;
          }
          if (op.title && op.cover_image_href) {
            operatorImages[op.title] = op.cover_image_href;
          }
        }
      } else {
        await opsResp.text(); // consume body
      }

      // Enrich holidays with operator images
      if (data.holidays) {
        for (const h of data.holidays) {
          // Extract operator slug from operator URL
          const opMatch = h.operator?.match(/operators\/([^.]+)\.json/);
          const opSlug = opMatch?.[1];
          h.image_url = (opSlug && operatorImages[opSlug]) || operatorImages[h.operator_title] || null;
        }
      }

      // If V3 returned results, use them
      if (data.total > 0) {
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If date-filtered search returned 0 results, retry without dates
      if ((params.date_from || params.date_to) && data.total === 0) {
        console.log("Date-filtered search returned 0 results, retrying without date filters");
        const noDateParams = new URLSearchParams({
          app_id: WIDGETY_APP_ID,
          token: WIDGETY_TOKEN,
          market: params.market || "us",
        });
        if (params.operators) noDateParams.set("operators", params.operators);
        if (params.locations) noDateParams.set("locations", params.locations);
        if (params.regions) noDateParams.set("regions", params.regions);
        if (params.page) noDateParams.set("page", String(params.page));
        noDateParams.set("limit", String(params.limit || 25));

        const noDateUrl = `${WIDGETY_BASE}/holidays.json?${noDateParams.toString()}`;
        const noDateResp = await fetch(noDateUrl);
        if (noDateResp.ok) {
          const noDateData = await noDateResp.json();
          if (noDateData.holidays) {
            for (const h of noDateData.holidays) {
              const opMatch = h.operator?.match(/operators\/([^.]+)\.json/);
              const opSlug = opMatch?.[1];
              h.image_url = (opSlug && operatorImages[opSlug]) || operatorImages[h.operator_title] || null;
            }
          }
          if (noDateData.total > 0) {
            noDateData._date_filter_removed = true;
            return new Response(JSON.stringify(noDateData), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          await noDateResp.text();
        }
      }

      // Fallback: try V2 Cruises API (/cruises.json)
      const v2Params = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
      });
      if (params.operators) v2Params.set("operators", params.operators);
      if (params.date_from) v2Params.set("date_from", params.date_from);
      if (params.date_to) v2Params.set("date_to", params.date_to);
      if (params.page) v2Params.set("page", String(params.page));
      v2Params.set("limit", String(params.limit || 25));

      const v2Url = `${WIDGETY_BASE}/cruises.json?${v2Params.toString()}`;
      console.log("Widgety V2 cruises URL:", v2Url.replace(WIDGETY_TOKEN, "***"));

      const v2Resp = await fetch(v2Url);
      if (v2Resp.ok) {
        const v2Data = await v2Resp.json();
        // Enrich V2 results too
        if (v2Data.holidays) {
          for (const h of v2Data.holidays) {
            const opMatch = h.operator?.match(/operators\/([^.]+)\.json/);
            const opSlug = opMatch?.[1];
            h.image_url = (opSlug && operatorImages[opSlug]) || operatorImages[h.operator_title] || null;
          }
        }
        return new Response(JSON.stringify(v2Data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // V2 also failed, return the original empty V3 result
      console.log("V2 cruises also returned:", v2Resp.status);
      const v2Text = await v2Resp.text();
      console.log("V2 response:", v2Text);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "operators") {
      // List available operators
      const searchParams = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
      });
      const url = `${WIDGETY_BASE}/operators.json?${searchParams.toString()}`;
      console.log("Widgety operators URL:", url.replace(WIDGETY_TOKEN, "***"));

      const resp = await fetch(url);
      if (!resp.ok) {
        const text = await resp.text();
        console.error("Widgety operators error:", resp.status, text);
        throw new Error(`Widgety API error: ${resp.status}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ships") {
      // List available ships - paginate through all pages
      const allShips: any[] = [];
      let page = 1;
      let totalPages = 1;
      const operatorFilter = params.operator || params.operators;
      
      while (page <= totalPages) {
        const searchParams = new URLSearchParams({
          app_id: WIDGETY_APP_ID,
          token: WIDGETY_TOKEN,
          page: String(page),
        });
        if (operatorFilter) searchParams.set("operator", operatorFilter);
        const url = `${WIDGETY_BASE}/ships.json?${searchParams.toString()}`;
        
        const resp = await fetch(url);
        if (!resp.ok) {
          const text = await resp.text();
          console.error("Widgety ships error:", resp.status, text);
          throw new Error(`Widgety API error: ${resp.status}`);
        }
        const data = await resp.json();
        const pageShips = (data.ships || []).map((ship: any) => ({
          id: ship.id,
          title: ship.title || ship.name || "",
          href: ship.href || ship.ship || ship._links?.self?.href || null,
        })).filter((ship: any) => ship.title && ship.href);
        allShips.push(...pageShips);
        
        // Calculate total pages from first response
        if (page === 1 && data.total && data.count) {
          totalPages = Math.ceil(data.total / data.count);
        }
        page++;
      }
      
      const uniqueShips = Array.from(
        new Map(allShips.map((ship: any) => [ship.href, ship])).values()
      );

      // Return simplified ship list sorted alphabetically
      uniqueShips.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
      
      return new Response(JSON.stringify({ ships: uniqueShips, total: uniqueShips.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "holiday") {
      // Get holiday details (includes dates with itinerary_code)
      const holidayRef = params.holiday_ref;
      if (!holidayRef) throw new Error("holiday_ref is required");

      const searchParams = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
        market: params.market || "us",
      });
      if (params.date_from) searchParams.set("date_from", params.date_from);
      if (params.date_to) searchParams.set("date_to", params.date_to);

      const url = `${WIDGETY_BASE}/holidays/${encodeURIComponent(holidayRef)}.json?${searchParams.toString()}`;
      let resp = await fetch(url, {
        headers: { Accept: "application/json; api_version=2" },
      });

      // If date-filtered request returns 400 (no dates match), retry without date filters
      if (resp.status === 400 && (params.date_from || params.date_to)) {
        console.log("Holiday date-filtered request returned 400, retrying without date filters");
        const fallbackParams = new URLSearchParams({
          app_id: WIDGETY_APP_ID,
          token: WIDGETY_TOKEN,
          market: params.market || "us",
        });
        const fallbackUrl = `${WIDGETY_BASE}/holidays/${encodeURIComponent(holidayRef)}.json?${fallbackParams.toString()}`;
        resp = await fetch(fallbackUrl, {
          headers: { Accept: "application/json; api_version=2" },
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        console.error("Widgety holiday error:", resp.status, text);
        throw new Error(`Widgety API error: ${resp.status}`);
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "itinerary") {
      // Get full date details including day-by-day itinerary
      const dateRef = params.date_ref;
      if (!dateRef) throw new Error("date_ref is required");

      const searchParams = new URLSearchParams({
        app_id: WIDGETY_APP_ID,
        token: WIDGETY_TOKEN,
        market: params.market || "us",
      });

      const url = `${WIDGETY_BASE}/holidays/dates/${encodeURIComponent(dateRef)}.json?${searchParams.toString()}`;
      const resp = await fetch(url, {
        headers: { Accept: "application/json;api_version=2" },
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error("Widgety itinerary error:", resp.status, text);
        throw new Error(`Widgety API error: ${resp.status}`);
      }
      const data = await resp.json();

      // Transform the itinerary days into our format
      const items = (data.itinerary?.days || []).map((day: any, idx: number) => {
        const location = day.locations?.[0];
        const locationName = location?.name || day.day_name || "";
        const country = location?.country || "";
        const arrivalTime = location?.arrival_time || null;
        const departureTime = location?.departure_time || null;

        // Strip HTML from programme
        const programme = (day.programme || "")
          .replace(/<[^>]*>/g, "")
          .trim();

        // Build meals string
        const meals: string[] = [];
        if (day.breakfast_included) meals.push("Breakfast");
        if (day.lunch_included) meals.push("Lunch");
        if (day.dinner_included) meals.push("Dinner");

        return {
          day_number: day.day,
          title: `${locationName}${country ? `, ${country}` : ""}`,
          description: programme || `Day ${day.day} — ${day.day_name || "At Sea"}`,
          category: "cruise",
          location: locationName,
          start_time: arrivalTime,
          end_time: departureTime,
          notes: meals.length > 0 ? `Meals: ${meals.join(", ")}` : null,
        };
      });

      return new Response(
        JSON.stringify({
          items,
          holiday_name: data.holiday_name || data.name || "",
          ship_title: data.ship_title || "",
          operator_title: data.operator_title || "",
          date_from: data.date_from,
          date_to: data.date_to,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("widgety-cruise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

