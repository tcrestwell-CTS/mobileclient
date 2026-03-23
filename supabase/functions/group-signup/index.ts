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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // GET: Return group trip landing page data (public)
    if (req.method === "GET") {
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the trip by share_token, must be group + landing enabled
      const { data: trip, error: tripErr } = await supabaseAdmin
        .from("trips")
        .select(
          "id, trip_name, destination, depart_date, return_date, status, notes, cover_image_url, total_gross_sales, trip_type, group_landing_enabled, user_id, budget_range, group_landing_headline, group_landing_description, group_landing_content"
        )
        .eq("share_token", token)
        .eq("trip_type", "group")
        .eq("group_landing_enabled", true)
        .single();

      if (tripErr || !trip) {
        return new Response(
          JSON.stringify({ error: "Trip not found or landing page not enabled" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch branding for the trip owner
      const { data: branding } = await supabaseAdmin
        .from("branding_settings")
        .select("agency_name, logo_url, primary_color, accent_color, tagline, phone, email_address, website")
        .eq("user_id", trip.user_id)
        .maybeSingle();

      // Fetch advisor profile
      const { data: advisor } = await supabaseAdmin
        .from("profiles")
        .select("full_name, avatar_url, agency_name, job_title, phone, clia_number, ccra_number, asta_number, embarc_number")
        .eq("user_id", trip.user_id)
        .maybeSingle();

      // Count existing signups
      const { count } = await supabaseAdmin
        .from("group_signups")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", trip.id);

      // Get itinerary highlights (first 5 items)
      const { data: itineraryItems } = await supabaseAdmin
        .from("itinerary_items")
        .select("title, description, category, day_number, location")
        .eq("trip_id", trip.id)
        .order("day_number", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(8);

      return new Response(
        JSON.stringify({
          trip: {
            id: trip.id,
            trip_name: trip.trip_name,
            destination: trip.destination,
            depart_date: trip.depart_date,
            return_date: trip.return_date,
            status: trip.status,
            notes: trip.notes,
            cover_image_url: trip.cover_image_url,
            budget_range: trip.budget_range,
            group_landing_headline: trip.group_landing_headline,
            group_landing_description: trip.group_landing_description,
            group_landing_content: trip.group_landing_content,
          },
          branding,
          advisor: advisor
            ? {
                name: advisor.full_name,
                avatar_url: advisor.avatar_url,
                agency_name: advisor.agency_name,
                job_title: advisor.job_title,
                phone: advisor.phone,
                clia_number: advisor.clia_number,
                ccra_number: advisor.ccra_number,
                asta_number: advisor.asta_number,
                embarc_number: advisor.embarc_number,
              }
            : null,
          signupCount: count || 0,
          itineraryHighlights: itineraryItems || [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST: Handle a new signup
    if (req.method === "POST") {
      const body = await req.json();
      const { token: signupToken, first_name, last_name, email, phone, number_of_travelers, notes } = body;

      // Validate required fields
      if (!signupToken || !first_name || !email) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: token, first_name, email" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email address" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Find the parent trip
      const { data: parentTrip, error: tripErr } = await supabaseAdmin
        .from("trips")
        .select("id, user_id, trip_name, destination, depart_date, return_date, trip_type, group_landing_enabled")
        .eq("share_token", signupToken)
        .eq("trip_type", "group")
        .eq("group_landing_enabled", true)
        .single();

      if (tripErr || !parentTrip) {
        return new Response(
          JSON.stringify({ error: "Group trip not found or signups are closed" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check for duplicate email on this trip
      const { data: existing } = await supabaseAdmin
        .from("group_signups")
        .select("id")
        .eq("trip_id", parentTrip.id)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "You've already signed up for this trip!" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Find or create the client in the agent's CRM
      const clientName = `${first_name.trim()}${last_name ? " " + last_name.trim() : ""}`;
      let clientId: string;

      const { data: existingClient } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("user_id", parentTrip.user_id)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientErr } = await supabaseAdmin
          .from("clients")
          .insert({
            user_id: parentTrip.user_id,
            name: clientName,
            first_name: first_name.trim(),
            last_name: last_name?.trim() || null,
            email: email.toLowerCase().trim(),
            phone: phone?.trim() || null,
            status: "active",
            lead_source: "group_landing",
          })
          .select("id")
          .single();

        if (clientErr || !newClient) {
          console.error("Failed to create client:", clientErr);
          return new Response(
            JSON.stringify({ error: "Failed to process signup" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        clientId = newClient.id;
      }

      // Create the sub-trip
      const { data: subTrip, error: subTripErr } = await supabaseAdmin
        .from("trips")
        .insert({
          user_id: parentTrip.user_id,
          parent_trip_id: parentTrip.id,
          trip_name: `${parentTrip.trip_name} — ${clientName}`,
          destination: parentTrip.destination,
          depart_date: parentTrip.depart_date,
          return_date: parentTrip.return_date,
          trip_type: "regular",
          status: "inbound",
          client_id: clientId,
          notes: notes?.trim() || null,
        })
        .select("id")
        .single();

      if (subTripErr || !subTrip) {
        console.error("Failed to create sub-trip:", subTripErr);
        return new Response(
          JSON.stringify({ error: "Failed to process signup" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Record the signup
      const { error: signupErr } = await supabaseAdmin
        .from("group_signups")
        .insert({
          trip_id: parentTrip.id,
          sub_trip_id: subTrip.id,
          first_name: first_name.trim(),
          last_name: last_name?.trim() || null,
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          number_of_travelers: Math.max(1, Math.min(20, parseInt(number_of_travelers) || 1)),
          notes: notes?.trim()?.substring(0, 500) || null,
          status: "confirmed",
        });

      if (signupErr) {
        console.error("Failed to record signup:", signupErr);
      }

      // Create a notification for the agent
      await supabaseAdmin.from("agent_notifications").insert({
        user_id: parentTrip.user_id,
        type: "group_signup",
        title: `New Group Signup: ${clientName}`,
        message: `${clientName} signed up for ${parentTrip.trip_name} with ${number_of_travelers || 1} traveler(s).`,
        trip_id: parentTrip.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "You're signed up! Your travel advisor will be in touch soon.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("group-signup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
