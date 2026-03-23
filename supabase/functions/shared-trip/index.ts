import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === POST: Handle terms acceptance, budget confirmation, or budget change request ===
    if (req.method === "POST") {
      const body = await req.json();
      const { token, action } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: trip } = await supabase
        .from("trips")
        .select("id, user_id, trip_name, total_gross_sales, client_id, budget_range")
        .eq("share_token", token)
        .not("published_at", "is", null)
        .single();

      if (!trip) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let clientName = "Client";
      if (trip.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("name")
          .eq("id", trip.client_id)
          .single();
        if (client) clientName = client.name;
      }

      // === Create CC Authorization for "Send Card Info to Agent" ===
      if (action === "create_cc_auth") {
        const { amount } = body;
        // Find first booking for this trip
        const { data: tripBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("trip_id", trip.id)
          .limit(1);

        const bookingId = tripBookings?.[0]?.id;
        if (!bookingId) {
          return new Response(JSON.stringify({ error: "No bookings found for this trip" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check for existing pending CC auth
        const { data: existingAuth } = await supabase
          .from("cc_authorizations")
          .select("id, access_token")
          .eq("user_id", trip.user_id)
          .eq("client_id", trip.client_id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        let ccAccessToken: string;
        if (existingAuth) {
          ccAccessToken = existingAuth.access_token;
        } else {
          const { data: newAuth, error: authErr } = await supabase
            .from("cc_authorizations")
            .insert({
              booking_id: bookingId,
              client_id: trip.client_id,
              user_id: trip.user_id,
              authorization_amount: amount || trip.total_gross_sales || 0,
              authorization_description: `Payment for ${trip.trip_name}`,
              status: "pending",
            })
            .select("access_token")
            .single();

          if (authErr || !newAuth) {
            console.error("CC auth creation error:", authErr);
            return new Response(JSON.stringify({ error: "Failed to create authorization" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          ccAccessToken = newAuth.access_token;
        }

        // Notify agent
        await supabase.from("agent_notifications").insert({
          user_id: trip.user_id,
          type: "payment_method_selected",
          title: "Payment Method Selected",
          message: `${clientName} chose "Send Card Info to Agent" for "${trip.trip_name}".`,
          trip_id: trip.id,
        });

        // Portal message
        if (trip.client_id) {
          await supabase.from("portal_messages").insert({
            client_id: trip.client_id,
            agent_user_id: trip.user_id,
            sender_type: "client",
            message: `💳 ${clientName} selected "Send Card Info to Agent" for "${trip.trip_name}".`,
          });
        }

        // Workflow task
        await supabase.from("workflow_tasks").insert({
          trip_id: trip.id,
          user_id: trip.user_id,
          title: `CC Authorization from ${clientName}`,
          description: `${clientName} is submitting their card info for "${trip.trip_name}".`,
          task_type: "cc_authorization_request",
          status: "pending",
        } as any);

        return new Response(JSON.stringify({ success: true, ccAccessToken }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // === Budget Confirmation (e-signature) ===
      if (action === "confirm_budget") {
        const { signature, ip_address, user_agent } = body;
        if (!signature) {
          return new Response(JSON.stringify({ error: "signature required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("trips")
          .update({
            budget_confirmed: true,
            budget_confirmed_at: new Date().toISOString(),
            budget_confirmed_by_client_id: trip.client_id,
            budget_confirmation_signature: signature,
            budget_confirmation_ip: ip_address || null,
            budget_confirmation_user_agent: user_agent || null,
            budget_change_requested: false,
            budget_change_request_message: null,
            budget_change_requested_at: null,
            budget_change_requested_by_client_id: null,
          })
          .eq("id", trip.id);

        // Audit log
        await supabase.from("compliance_audit_log").insert({
          user_id: trip.user_id,
          event_type: "budget_confirmed",
          entity_type: "trip",
          entity_id: trip.id,
          client_name: clientName,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          signature,
          metadata: {
            trip_name: trip.trip_name,
            budget_range: trip.budget_range,
          },
        });

        // Notify agent
        await supabase.from("agent_notifications").insert({
          user_id: trip.user_id,
          type: "budget_confirmed",
          title: `Budget Confirmed: ${clientName}`,
          message: `${clientName} has confirmed the budget (${trip.budget_range || "N/A"}) for "${trip.trip_name}".`,
          trip_id: trip.id,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // === Budget Change Request ===
      if (action === "request_budget_change") {
        const { message } = body;
        if (!message?.trim()) {
          return new Response(JSON.stringify({ error: "message required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("trips")
          .update({
            budget_confirmed: false,
            budget_confirmed_at: null,
            budget_confirmation_signature: null,
            budget_change_requested: true,
            budget_change_request_message: message.trim(),
            budget_change_requested_at: new Date().toISOString(),
            budget_change_requested_by_client_id: trip.client_id,
          })
          .eq("id", trip.id);

        // Audit log
        await supabase.from("compliance_audit_log").insert({
          user_id: trip.user_id,
          event_type: "budget_change_requested",
          entity_type: "trip",
          entity_id: trip.id,
          client_name: clientName,
          metadata: {
            trip_name: trip.trip_name,
            budget_range: trip.budget_range,
            change_message: message.trim(),
          },
        });

        // Notify agent
        await supabase.from("agent_notifications").insert({
          user_id: trip.user_id,
          type: "budget_change_request",
          title: `Budget Change Request: ${clientName}`,
          message: `${clientName} requested a budget change for "${trip.trip_name}": ${message.trim()}`,
          trip_id: trip.id,
        });

        // Also send as portal message if client exists
        if (trip.client_id) {
          await supabase.from("portal_messages").insert({
            agent_user_id: trip.user_id,
            client_id: trip.client_id,
            sender_type: "client",
            message: `Budget change request for "${trip.trip_name}": ${message.trim()}`,
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // === Legacy: Terms acceptance (no action field) ===
      const { signature, ip_address, user_agent } = body;
      if (!signature) {
        return new Response(JSON.stringify({ error: "signature required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("trip_payments")
        .update({
          terms_accepted_at: new Date().toISOString(),
          acceptance_signature: signature,
        })
        .eq("trip_id", trip.id)
        .eq("status", "pending");

      await supabase.from("compliance_audit_log").insert({
        user_id: trip.user_id,
        event_type: "terms_accepted",
        entity_type: "trip",
        entity_id: trip.id,
        client_name: clientName,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        signature,
        metadata: {
          trip_name: trip.trip_name,
          total_cost: trip.total_gross_sales,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GET: Fetch shared trip data ===

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find trip by share token, only if published
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, trip_name, destination, depart_date, return_date, status, trip_type, notes, published_at, user_id, total_gross_sales, cover_image_url, deposit_required, deposit_amount, published_snapshot, budget_range, budget_confirmed, budget_confirmed_at, budget_change_requested, budget_change_request_message")
      .eq("share_token", token)
      .not("published_at", "is", null)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found or not published" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapshot = trip.published_snapshot as any;

    // Use snapshot data if available, otherwise fall back to live data
    let itinerary: any[] = [];
    let bookingsForResponse: any[] = [];
    let cancellationTerms: string[] = [];
    let paymentDeadlines: { label: string; date: string }[] = [];
    let optionBlocks: any[] = [];

    if (snapshot && snapshot.itinerary) {
      // Serve from frozen snapshot
      itinerary = snapshot.itinerary.map((item: any) => ({
        id: item.id,
        day_number: item.day_number,
        title: item.title,
        description: item.description,
        category: item.category,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        item_date: item.item_date,
        notes: item.notes,
        sort_order: item.sort_order,
      }));

      bookingsForResponse = (snapshot.bookings || []).map((b: any) => ({
        destination: b.destination,
        depart_date: b.depart_date,
        return_date: b.return_date,
        status: b.status,
        trip_name: b.trip_name,
        booking_type: b.booking_type,
      }));

      (snapshot.bookings || []).forEach((b: any) => {
        if (b.cancellation_terms) cancellationTerms.push(b.cancellation_terms);
        if (b.payment_deadline) {
          paymentDeadlines.push({
            label: `${b.trip_name || b.destination || "Booking"} payment deadline`,
            date: b.payment_deadline,
          });
        }
      });
      optionBlocks = snapshot.optionBlocks || [];
    } else {
      // Legacy fallback: serve live data for trips published before versioning
      const [itineraryRes, bookingsRes] = await Promise.all([
        supabase
          .from("itinerary_items")
          .select("id, day_number, title, description, category, start_time, end_time, location, item_date, notes, sort_order")
          .eq("trip_id", trip.id)
          .order("day_number", { ascending: true })
          .order("sort_order", { ascending: true }),
        supabase
          .from("bookings")
          .select("id, destination, depart_date, return_date, status, trip_name, cancellation_terms, payment_deadline, booking_type")
          .eq("trip_id", trip.id),
      ]);

      itinerary = itineraryRes.data || [];
      const bookings = bookingsRes.data || [];

      bookingsForResponse = bookings.map((b: any) => ({
        destination: b.destination,
        depart_date: b.depart_date,
        return_date: b.return_date,
        status: b.status,
        trip_name: b.trip_name,
        booking_type: b.booking_type,
      }));

      bookings.forEach((b: any) => {
        if (b.cancellation_terms) cancellationTerms.push(b.cancellation_terms);
        if (b.payment_deadline) {
          paymentDeadlines.push({
            label: `${b.trip_name || b.destination || "Booking"} payment deadline`,
            date: b.payment_deadline,
          });
        }
      });

      // Fetch option blocks for legacy trips
      const optionBlocksRes = await supabase
        .from("option_blocks")
        .select("id, trip_id, day_number, title, sort_order")
        .eq("trip_id", trip.id)
        .order("sort_order", { ascending: true });
      optionBlocks = optionBlocksRes.data || [];
    }
    let branding = null;
    let advisor = null;

    if (trip.user_id) {
      const [brandingRes, profileRes] = await Promise.all([
        supabase
          .from("branding_settings")
          .select("agency_name, primary_color, accent_color, logo_url, tagline, email_address, phone, website")
          .eq("user_id", trip.user_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, avatar_url, agency_name, job_title, phone, clia_number, ccra_number, asta_number, embarc_number")
          .eq("user_id", trip.user_id)
          .maybeSingle(),
      ]);

      branding = brandingRes.data;
      if (profileRes.data) {
        advisor = {
          name: profileRes.data.full_name,
          avatar_url: profileRes.data.avatar_url,
          agency_name: profileRes.data.agency_name || branding?.agency_name,
          job_title: profileRes.data.job_title,
          phone: profileRes.data.phone || branding?.phone,
          email: branding?.email_address,
          website: branding?.website,
          clia_number: profileRes.data.clia_number,
          ccra_number: profileRes.data.ccra_number,
          asta_number: profileRes.data.asta_number,
          embarc_number: profileRes.data.embarc_number,
        };
      }
    }

    cancellationTerms = [...new Set(cancellationTerms)];

    return new Response(JSON.stringify({
      trip: {
        trip_name: trip.trip_name,
        destination: trip.destination,
        depart_date: trip.depart_date,
        return_date: trip.return_date,
        status: trip.status,
        trip_type: trip.trip_type,
        notes: trip.notes,
        total_cost: trip.total_gross_sales,
        cover_image_url: trip.cover_image_url,
      },
      deposit: {
        required: trip.deposit_required || false,
        amount: trip.deposit_amount || 0,
      },
      budget: {
        range: trip.budget_range,
        confirmed: trip.budget_confirmed || false,
        confirmed_at: trip.budget_confirmed_at,
        change_requested: trip.budget_change_requested || false,
        change_request_message: trip.budget_change_request_message,
      },
      cancellationTerms,
      paymentDeadlines,
      itinerary,
      optionBlocks,
      bookings: bookingsForResponse,
      branding,
      advisor,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Shared trip error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
