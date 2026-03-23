// Portal data edge function – client portal API
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

async function validatePortalToken(supabase: any, token: string) {
  const { data: session } = await supabase
    .from("client_portal_sessions")
    .select("client_id, email, expires_at, verified_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .not("verified_at", "is", null)
    .maybeSingle();

  return session;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");

    // ── Health check endpoint (no auth required) ──────────────────────────────
    if (resource === "health") {
      const startMs = Date.now();
      const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {};

      // 1. Database connectivity – lightweight ping via count query
      try {
        const dbStart = Date.now();
        const { error: dbErr } = await supabase
          .from("client_portal_sessions")
          .select("id", { count: "exact", head: true });
        checks.database = dbErr
          ? { ok: false, error: dbErr.message }
          : { ok: true, latency_ms: Date.now() - dbStart };
      } catch (e: any) {
        checks.database = { ok: false, error: e?.message ?? "unknown" };
      }

      // 2. Session table readable (validates service-role key scope)
      try {
        const tblStart = Date.now();
        const { error: tblErr } = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true });
        checks.clients_table = tblErr
          ? { ok: false, error: tblErr.message }
          : { ok: true, latency_ms: Date.now() - tblStart };
      } catch (e: any) {
        checks.clients_table = { ok: false, error: e?.message ?? "unknown" };
      }

      // 3. Env vars present
      const envVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
      const missingEnv = envVars.filter((v) => !Deno.env.get(v));
      checks.env = missingEnv.length === 0
        ? { ok: true }
        : { ok: false, error: `Missing: ${missingEnv.join(", ")}` };

      const allOk = Object.values(checks).every((c) => c.ok);
      const status = allOk ? "healthy" : "degraded";

      return new Response(
        JSON.stringify({
          status,
          function: "portal-data",
          timestamp: new Date().toISOString(),
          total_latency_ms: Date.now() - startMs,
          checks,
        }),
        {
          status: allOk ? 200 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Auth-gated resources (dual auth: JWT or legacy portal token) ─────────
    let clientId: string | null = null;

    // 1. Try Supabase Auth JWT first
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.substring(7);
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
        if (user && !userErr) {
          const { data: cp } = await supabase
            .from("client_profiles")
            .select("client_id")
            .eq("auth_user_id", user.id)
            .maybeSingle();
          if (cp) clientId = cp.client_id;
        }
      } catch (e) {
        console.error("JWT auth error:", e);
      }
    }

    // 2. Fall back to legacy portal token
    if (!clientId) {
      const portalToken = req.headers.get("x-portal-token");
      if (portalToken) {
        const session = await validatePortalToken(supabase, portalToken);
        if (session) clientId = session.client_id;
      }
    }

    if (!clientId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: find ALL client IDs sharing the same email (handles duplicate client records)
    async function getAllClientIds(): Promise<string[]> {
      const { data: client } = await supabase
        .from("clients")
        .select("email")
        .eq("id", clientId)
        .single();

      if (!client?.email) return [clientId];

      const { data: siblings } = await supabase
        .from("clients")
        .select("id")
        .eq("email", client.email);

      if (!siblings?.length) return [clientId];

      return [...new Set(siblings.map((c: any) => c.id))];
    }

    // Helper: find trips where this client is a travel companion (via email match)
    async function getCompanionTripIds(): Promise<string[]> {
      const { data: client } = await supabase
        .from("clients")
        .select("email")
        .eq("id", clientId)
        .single();

      if (!client?.email) return [];

      const { data: companions } = await supabase
        .from("client_companions")
        .select("id")
        .eq("email", client.email);

      if (!companions?.length) return [];

      const companionIds = companions.map((c: any) => c.id);

      const { data: travelerLinks } = await supabase
        .from("booking_travelers")
        .select("booking_id")
        .in("companion_id", companionIds);

      if (!travelerLinks?.length) return [];

      const bookingIds = travelerLinks.map((t: any) => t.booking_id);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("trip_id")
        .in("id", bookingIds)
        .not("trip_id", "is", null);

      if (!bookings?.length) return [];

      return [...new Set(bookings.map((b: any) => b.trip_id))];
    }

    if (resource === "dashboard") {
      // Get all client IDs for this email (handles duplicates)
      const allClientIds = await getAllClientIds();

      // Get client info + own trips + recent payments + agent profile
      const [clientRes, tripsRes, companionTripIds, paymentsRes, messagesRes] = await Promise.all([
        supabase.from("clients").select("id, name, first_name, last_name, email, user_id").eq("id", clientId).single(),
        supabase.from("trips").select("id, trip_name, destination, depart_date, return_date, status, total_gross_sales").in("client_id", allClientIds).neq("status", "archived").neq("status", "cancelled").order("depart_date", { ascending: false }),
        getCompanionTripIds(),
        supabase.from("trip_payments").select("id, amount, payment_date, status, payment_type, trip_id, due_date").eq("status", "pending").order("due_date", { ascending: true }).limit(5),
        supabase.from("portal_messages").select("id, message, sender_type, created_at, read_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
      ]);

      // Fetch companion trips that aren't already in the own-trips list
      const ownTripIds = new Set((tripsRes.data || []).map((t: any) => t.id));
      const extraTripIds = companionTripIds.filter((id: string) => !ownTripIds.has(id));
      let companionTrips: any[] = [];
      if (extraTripIds.length > 0) {
        const { data } = await supabase
          .from("trips")
          .select("id, trip_name, destination, depart_date, return_date, status, total_gross_sales")
          .in("id", extraTripIds)
          .neq("status", "archived")
          .neq("status", "cancelled");
        companionTrips = data || [];
      }

      const allTrips = [...(tripsRes.data || []), ...companionTrips].sort(
        (a: any, b: any) => new Date(b.depart_date || 0).getTime() - new Date(a.depart_date || 0).getTime()
      );

      // Filter payments to only those for this client's trips
      const tripIds = allTrips.map((t: any) => t.id);
      const clientPayments = (paymentsRes.data || []).filter((p: any) => tripIds.includes(p.trip_id));

      // Fetch agent profile + branding for the client's assigned agent
      let agent = null;
      let branding = null;
      if (clientRes.data?.user_id) {
        const [agentRes, brandingRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url, phone, job_title, clia_number, ccra_number, asta_number, embarc_number")
            .eq("user_id", clientRes.data.user_id)
            .single(),
          supabase
            .from("branding_settings")
            .select("agency_name, primary_color, accent_color, logo_url, tagline")
            .eq("user_id", clientRes.data.user_id)
            .maybeSingle(),
        ]);
        agent = agentRes.data;
        branding = brandingRes.data;
      }

      return new Response(JSON.stringify({
        client: clientRes.data,
        agent,
        branding,
        trips: allTrips,
        upcoming_payments: clientPayments,
        recent_messages: messagesRes.data || [],
        unread_messages: (messagesRes.data || []).filter((m: any) => m.sender_type === "agent" && !m.read_at).length,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "trips") {
      const allClientIds = await getAllClientIds();
      const [ownTripsRes, companionTripIds2] = await Promise.all([
        supabase
          .from("trips")
          .select("id, trip_name, destination, depart_date, return_date, status, total_gross_sales, notes, trip_type, cover_image_url")
          .in("client_id", allClientIds)
          .neq("status", "archived")
          .neq("status", "cancelled")
          .order("depart_date", { ascending: false }),
        getCompanionTripIds(),
      ]);

      const ownIds = new Set((ownTripsRes.data || []).map((t: any) => t.id));
      const extraIds = companionTripIds2.filter((id: string) => !ownIds.has(id));
      let extraTrips: any[] = [];
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from("trips")
          .select("id, trip_name, destination, depart_date, return_date, status, total_gross_sales, notes, trip_type, cover_image_url")
          .in("id", extraIds)
          .neq("status", "archived")
          .neq("status", "cancelled");
        extraTrips = data || [];
      }

      const allTrips2 = [...(ownTripsRes.data || []), ...extraTrips].sort(
        (a: any, b: any) => new Date(b.depart_date || 0).getTime() - new Date(a.depart_date || 0).getTime()
      );

      return new Response(JSON.stringify({ trips: allTrips2 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "trip-detail") {
      const tripId = url.searchParams.get("tripId");
      if (!tripId) {
        return new Response(JSON.stringify({ error: "tripId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if client owns the trip OR is a companion on it
      const [allClientIds, companionTripIds3] = await Promise.all([
        getAllClientIds(),
        getCompanionTripIds(),
      ]);
      const isCompanion = companionTripIds3.includes(tripId);

      const [tripRes, bookingsRes, paymentsRes, itineraryRes, itinerariesRes, optionBlocksRes] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).single(),
        supabase.from("bookings").select("id, booking_reference, booking_type, destination, depart_date, return_date, status, total_amount, travelers, trip_name, supplier_id, cancellation_terms").eq("trip_id", tripId).neq("status", "cancelled").neq("status", "archived"),
        supabase.from("trip_payments").select("id, amount, payment_date, due_date, status, payment_type, details, notes, payment_method, stripe_receipt_url").eq("trip_id", tripId),
        supabase.from("itinerary_items").select("id, day_number, title, description, category, start_time, end_time, location, item_date, notes, sort_order, itinerary_id, option_block_id").eq("trip_id", tripId).order("day_number", { ascending: true }).order("sort_order", { ascending: true }),
        supabase.from("itineraries").select("id, name, overview, cover_image_url, depart_date, return_date, sort_order").eq("trip_id", tripId).order("sort_order", { ascending: true }),
        supabase.from("option_blocks").select("id, day_number, title, sort_order").eq("trip_id", tripId).order("sort_order", { ascending: true }),
      ]);

      // Verify the client has access (either owner, sibling client record, or companion)
      if (!tripRes.data || (!allClientIds.includes(tripRes.data.client_id) && !isCompanion)) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let payments = paymentsRes.data || [];

      // Backfill pending payment for already-approved trips created before auto-payment rollout
      if (tripRes.data.approved_itinerary_id) {
        const hasPendingOrPaid = payments.some((p: any) => ["pending", "paid"].includes(p.status));

        if (!hasPendingOrPaid) {
          const tripTotal = Number(tripRes.data.total_gross_sales || 0);
          const autoDeposit = Math.round(tripTotal * 0.25 * 100) / 100;
          const isDepositRequired = Boolean(tripRes.data.deposit_required);
          const depositAmount = isDepositRequired
            ? (tripRes.data.deposit_override ? Number(tripRes.data.deposit_amount || 0) : autoDeposit)
            : 0;
          const paymentAmount = isDepositRequired && depositAmount > 0 ? depositAmount : tripTotal;

          if (paymentAmount > 0) {
            const { data: insertedPayment, error: insertPaymentError } = await supabase
              .from("trip_payments")
              .insert({
                trip_id: tripId,
                user_id: tripRes.data.user_id,
                amount: paymentAmount,
                payment_type: isDepositRequired && depositAmount > 0 ? "deposit" : "payment",
                status: "pending",
                details: isDepositRequired && depositAmount > 0
                  ? "Deposit for approved itinerary"
                  : "Payment for approved itinerary",
              })
              .select("id, amount, payment_date, due_date, status, payment_type, details, notes, payment_method, stripe_receipt_url")
              .single();

            if (insertPaymentError) {
              console.error("Failed to auto-create backfill payment in trip-detail:", insertPaymentError);
            } else if (insertedPayment) {
              payments = [insertedPayment, ...payments];
            }
          }
        }
      }

      return new Response(JSON.stringify({
        trip: tripRes.data,
        bookings: bookingsRes.data || [],
        payments,
        itinerary: itineraryRes.data || [],
        itineraries: itinerariesRes.data || [],
        optionBlocks: optionBlocksRes.data || [],
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "approve-itinerary") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required" }), {
          status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { tripId, itineraryId } = await req.json();
      if (!tripId || !itineraryId) {
        return new Response(JSON.stringify({ error: "tripId and itineraryId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify client owns the trip (check all sibling client IDs)
      const allClientIds = await getAllClientIds();

      const { data: tripCheck } = await supabase
        .from("trips")
        .select("id, client_id, user_id, total_gross_sales, deposit_required, deposit_amount, deposit_override, payment_mode, depart_date")
        .eq("id", tripId)
        .single();

      if (!tripCheck || !allClientIds.includes(tripCheck.client_id)) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update trip with approved itinerary
      const { error: updateError } = await supabase
        .from("trips")
        .update({
          approved_itinerary_id: itineraryId,
          itinerary_approved_at: new Date().toISOString(),
          itinerary_approved_by_client_id: clientId,
        })
        .eq("id", tripId);

      if (updateError) throw updateError;

      // Auto-create pending payment records based on payment_mode
      const { data: existingPayments } = await supabase
        .from("trip_payments")
        .select("id")
        .eq("trip_id", tripId)
        .in("status", ["pending", "paid"])
        .limit(1);

      if (!existingPayments || existingPayments.length === 0) {
        const tripTotal = Number(tripCheck.total_gross_sales || 0);
        const paymentMode = tripCheck.payment_mode || "deposit_balance";
        const autoDeposit = Math.round(tripTotal * 0.25 * 100) / 100;
        const isDepositRequired = Boolean(tripCheck.deposit_required);
        const depositAmount = isDepositRequired
          ? (tripCheck.deposit_override ? Number(tripCheck.deposit_amount || 0) : autoDeposit)
          : 0;

        if (tripTotal > 0) {
          const paymentsToInsert: any[] = [];

          if (isDepositRequired && depositAmount > 0) {
            // Always create deposit as first payment
            paymentsToInsert.push({
              trip_id: tripId,
              user_id: tripCheck.user_id,
              amount: depositAmount,
              payment_type: "deposit",
              status: "pending",
              details: "Deposit for approved itinerary",
            });

            const remaining = tripTotal - depositAmount;

            if (remaining > 0) {
              if (paymentMode === "payment_schedule" && tripCheck.depart_date) {
                // Calculate monthly installments, final due 90 days before departure
                const now = new Date();
                const departDate = new Date(tripCheck.depart_date);
                const finalDueDate = new Date(departDate.getTime() - 90 * 24 * 60 * 60 * 1000);

                // Calculate months between now and final due date
                let months = (finalDueDate.getFullYear() - now.getFullYear()) * 12 + (finalDueDate.getMonth() - now.getMonth());
                if (months < 1) months = 1;

                const monthlyAmount = Math.round((remaining / months) * 100) / 100;

                for (let i = 1; i <= months; i++) {
                  const isLast = i === months;
                  const dueDate = isLast
                    ? finalDueDate
                    : new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
                  const amount = isLast
                    ? Math.round((remaining - monthlyAmount * (months - 1)) * 100) / 100
                    : monthlyAmount;

                  paymentsToInsert.push({
                    trip_id: tripId,
                    user_id: tripCheck.user_id,
                    amount,
                    payment_type: isLast ? "final_balance" : "payment",
                    status: "pending",
                    due_date: dueDate.toISOString().split("T")[0],
                    details: isLast ? "Final payment (due 90 days before departure)" : `Installment ${i} of ${months}`,
                  });
                }
              } else {
                // deposit_balance mode: single final balance payment
                const finalDueDate = tripCheck.depart_date
                  ? new Date(new Date(tripCheck.depart_date).getTime() - 90 * 24 * 60 * 60 * 1000)
                  : null;

                paymentsToInsert.push({
                  trip_id: tripId,
                  user_id: tripCheck.user_id,
                  amount: remaining,
                  payment_type: "final_balance",
                  status: "pending",
                  due_date: finalDueDate ? finalDueDate.toISOString().split("T")[0] : null,
                  details: "Final balance for approved itinerary",
                });
              }
            }
          } else {
            // No deposit — single full payment
            paymentsToInsert.push({
              trip_id: tripId,
              user_id: tripCheck.user_id,
              amount: tripTotal,
              payment_type: "payment",
              status: "pending",
              details: "Payment for approved itinerary",
            });
          }

          if (paymentsToInsert.length > 0) {
            await supabase.from("trip_payments").insert(paymentsToInsert);
          }
        }
      }

      // Send notification message to agent
      const { data: itinData } = await supabase
        .from("itineraries")
        .select("name")
        .eq("id", itineraryId)
        .single();

      const { data: clientData } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      await supabase.from("portal_messages").insert({
        client_id: clientId,
        agent_user_id: tripCheck.user_id,
        sender_type: "client",
        message: `✅ ${clientData?.name || "Client"} has approved itinerary "${itinData?.name || "Unknown"}" for this trip.`,
      });

      // Insert agent notification so it appears in the bell icon
      await supabase.from("agent_notifications").insert({
        user_id: tripCheck.user_id,
        type: "itinerary_approved",
        title: "Itinerary Approved",
        message: `${clientData?.name || "Client"} approved "${itinData?.name || "Itinerary"}" for their trip.`,
        trip_id: tripId,
      });

      // Send email alert to the agent
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const resend = new Resend(RESEND_API_KEY);

          // Get agent email from auth.users
          const { data: agentUser } = await supabase.auth.admin.getUserById(tripCheck.user_id);
          const agentEmail = agentUser?.user?.email;

          // Get branding for styled email
          const { data: branding } = await supabase
            .from("branding_settings")
            .select("*")
            .eq("user_id", tripCheck.user_id)
            .maybeSingle();

          // Get trip name
          const { data: tripData } = await supabase
            .from("trips")
            .select("trip_name")
            .eq("id", tripId)
            .single();

          const agencyName = branding?.agency_name || "Crestwell Travel Services";
          const primaryColor = branding?.primary_color || "#0D7377";
          const logoUrl = branding?.logo_url || "";
          const fromEmail = branding?.from_email || "send@crestwellgetaways.com";
          const fromName = branding?.from_name || agencyName;
          const clientName = clientData?.name || "Your client";
          const itineraryName = itinData?.name || "an itinerary";
          const tripName = tripData?.trip_name || "their trip";

          let portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.crestwelltravels.com";
          if (!/^https?:\/\//i.test(portalBaseUrl)) portalBaseUrl = `https://${portalBaseUrl}`;
          const dashboardUrl = portalBaseUrl.replace(/\/client.*$/, "").replace(/\/+$/, "");

          const logoHtml = logoUrl
            ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 60px; margin-bottom: 16px;" />`
            : "";

          if (agentEmail) {
            const html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  ${logoHtml}
                </div>
                <h2 style="color: ${primaryColor}; margin-bottom: 8px;">✅ Itinerary Approved!</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Great news! <strong>${clientName}</strong> has approved the itinerary <strong>"${itineraryName}"</strong> for <strong>${tripName}</strong>.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  You can now proceed with confirming bookings and next steps for this trip.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${dashboardUrl}/trips/${tripId}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                    View Trip Details
                  </a>
                </div>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                  <p style="margin: 0;">${agencyName}</p>
                </div>
              </div>
            `;

            await resend.emails.send({
              from: `${fromName} <${fromEmail}>`,
              to: [agentEmail],
              subject: `✅ ${clientName} approved "${itineraryName}" — ${tripName}`,
              html,
            });

            console.log("Itinerary approval email sent to agent:", agentEmail);
          }
        }
      } catch (emailErr) {
        // Don't fail the approval if email fails
        console.error("Failed to send itinerary approval email:", emailErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "invoices") {
      const allClientIds = await getAllClientIds();
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, amount_paid, amount_remaining, status, trip_name")
        .in("client_id", allClientIds)
        .order("invoice_date", { ascending: false });

      return new Response(JSON.stringify({ invoices: invoices || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "invoice-detail") {
      const invoiceId = url.searchParams.get("invoiceId");
      if (!invoiceId) {
        return new Response(JSON.stringify({ error: "invoiceId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, amount_paid, amount_remaining, status, trip_name, client_name, trip_id, created_at, user_id")
        .eq("id", invoiceId)
        .eq("client_id", clientId)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch client info
      const { data: clientData } = await supabase
        .from("clients")
        .select("name, email, phone")
        .eq("id", clientId)
        .single();

      // Fetch branding from the agent who owns the invoice
      const { data: branding } = await supabase
        .from("branding_settings")
        .select("agency_name, phone, email_address, address, website, logo_url")
        .eq("user_id", invoice.user_id)
        .maybeSingle();

      // Fetch trip dates/destination if linked
      let tripInfo: any = null;
      let payments: any[] = [];
      if (invoice.trip_id) {
        const [tripRes, paymentsRes] = await Promise.all([
          supabase.from("trips").select("destination, depart_date, return_date").eq("id", invoice.trip_id).single(),
          supabase.from("trip_payments")
            .select("id, amount, payment_date, due_date, status, payment_type, details, notes")
            .eq("trip_id", invoice.trip_id)
            .order("payment_date", { ascending: true }),
        ]);
        tripInfo = tripRes.data;
        payments = paymentsRes.data || [];
      }

      return new Response(JSON.stringify({
        invoice,
        payments,
        client_email: clientData?.email,
        client_phone: clientData?.phone,
        destination: tripInfo?.destination,
        depart_date: tripInfo?.depart_date,
        return_date: tripInfo?.return_date,
        branding: branding || null,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "messages") {
      if (req.method === "POST") {
        const { message } = await req.json();
        if (!message?.trim()) {
          return new Response(JSON.stringify({ error: "Message required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get client's agent and name
        const { data: client } = await supabase
          .from("clients")
          .select("user_id, name")
          .eq("id", clientId)
          .single();

        if (!client) {
          return new Response(JSON.stringify({ error: "Client not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: newMsg, error } = await supabase
          .from("portal_messages")
          .insert({
            client_id: clientId,
            agent_user_id: client.user_id,
            sender_type: "client",
            message: message.trim(),
          })
          .select()
          .single();

        if (error) {
          console.error("Message insert error:", error);
          throw error;
        }

        // Dashboard notification for agent
        const truncatedMsg = message.trim().length > 100 ? message.trim().slice(0, 100) + "…" : message.trim();
        await supabase.from("agent_notifications").insert({
          user_id: client.user_id,
          type: "client_message",
          title: `New Message from ${client.name}`,
          message: truncatedMsg,
        });

        // Email notification to agent
        try {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const resend = new Resend(RESEND_API_KEY);
            const { data: agentUser } = await supabase.auth.admin.getUserById(client.user_id);
            const agentEmail = agentUser?.user?.email;
            if (agentEmail) {
              await resend.emails.send({
                from: "Crestwell Travel <notify@notify.crestwellgetaways.com>",
                to: [agentEmail],
                subject: `New Portal Message from ${client.name}`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <h2 style="color:#1a1a2e;">New Client Message</h2>
                    <p><strong>${client.name}</strong> sent you a message via the client portal:</p>
                    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0;">
                      <p style="margin:0;white-space:pre-wrap;">${message.trim()}</p>
                    </div>
                    <p style="color:#6b7280;font-size:14px;">Log in to your dashboard to reply.</p>
                  </div>
                `,
              });
            }
          }
        } catch (emailErr) {
          console.error("Client message email notification failed:", emailErr);
        }

        return new Response(JSON.stringify({ message: newMsg }), {
          status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET messages
      const { data: messages } = await supabase
        .from("portal_messages")
        .select("id, message, sender_type, created_at, read_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      // Mark agent messages as read
      await supabase
        .from("portal_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("sender_type", "agent")
        .is("read_at", null);

      return new Response(JSON.stringify({ messages: messages || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "cc-authorizations") {
      // Get CC authorizations for this client
      const tripId = url.searchParams.get("tripId");

      let query = supabase
        .from("cc_authorizations")
        .select(`
          id, booking_id, authorization_amount, authorization_description,
          status, authorized_at, expires_at, access_token, created_at, last_four
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (tripId) {
        // Filter by bookings belonging to this trip
        const { data: tripBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("trip_id", tripId);
        const bookingIds = (tripBookings || []).map((b: any) => b.id);
        if (bookingIds.length > 0) {
          query = query.in("booking_id", bookingIds);
        } else {
          return new Response(JSON.stringify({ authorizations: [] }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data } = await query;

      // Enrich with booking info
      const bookingIds = [...new Set((data || []).map((a: any) => a.booking_id))];
      let bookingsMap: Record<string, any> = {};
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, booking_reference, destination, trip_name")
          .in("id", bookingIds);
        for (const b of bookings || []) {
          bookingsMap[b.id] = b;
        }
      }

      const enriched = (data || []).map((a: any) => ({
        ...a,
        booking: bookingsMap[a.booking_id] || null,
      }));

      return new Response(JSON.stringify({ authorizations: enriched }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "payments") {
      // Get all trips for this client (own + companion)
      const allClientIds = await getAllClientIds();
      const [ownTripsRes, companionTripIds4] = await Promise.all([
        supabase.from("trips").select("id, trip_name").in("client_id", allClientIds),
        getCompanionTripIds(),
      ]);

      const allTripIds = [
        ...(ownTripsRes.data || []).map((t: any) => t.id),
        ...companionTripIds4,
      ];

      if (allTripIds.length === 0) {
        return new Response(JSON.stringify({ payments: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build trip name map
      const tripNameMap: Record<string, string> = {};
      for (const t of ownTripsRes.data || []) {
        tripNameMap[t.id] = t.trip_name;
      }
      // Fetch companion trip names
      const missingIds = companionTripIds4.filter((id: string) => !tripNameMap[id]);
      if (missingIds.length > 0) {
        const { data: extraTrips } = await supabase
          .from("trips")
          .select("id, trip_name")
          .in("id", missingIds);
        for (const t of extraTrips || []) {
          tripNameMap[t.id] = t.trip_name;
        }
      }

      const { data: payments } = await supabase
        .from("trip_payments")
        .select("id, amount, payment_date, due_date, status, payment_type, payment_method, details, notes, trip_id, stripe_payment_url, stripe_receipt_url")
        .in("trip_id", allTripIds)
        .order("payment_date", { ascending: false });

      const enrichedPayments = (payments || []).map((p: any) => ({
        ...p,
        trip_name: tripNameMap[p.trip_id] || "Trip",
      }));

      return new Response(JSON.stringify({ payments: enrichedPayments }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "doc-checklist") {
      if (req.method === "POST") {
        const { tripId, itemKey, isChecked } = await req.json();
        if (!tripId || !itemKey) {
          return new Response(JSON.stringify({ error: "tripId and itemKey required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await supabase
          .from("client_document_checklist")
          .upsert(
            {
              client_id: clientId,
              trip_id: tripId,
              item_key: itemKey,
              is_checked: !!isChecked,
              checked_at: isChecked ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "client_id,trip_id,item_key" }
          );

        if (error) {
          console.error("Checklist upsert error:", error);
          throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET checklist
      const tripId = url.searchParams.get("tripId");
      if (!tripId) {
        return new Response(JSON.stringify({ error: "tripId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: items } = await supabase
        .from("client_document_checklist")
        .select("item_key, is_checked, checked_at")
        .eq("client_id", clientId)
        .eq("trip_id", tripId);

      return new Response(JSON.stringify({ items: items || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "select-option") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required" }), {
          status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { tripId, optionBlockId, selectedItemId } = await req.json();
      if (!tripId || !optionBlockId || !selectedItemId) {
        return new Response(JSON.stringify({ error: "tripId, optionBlockId, and selectedItemId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify client has access to this trip
      const allClientIds = await getAllClientIds();
      const { data: tripCheck } = await supabase
        .from("trips")
        .select("id, client_id, user_id, trip_name")
        .eq("id", tripId)
        .single();

      if (!tripCheck || !allClientIds.includes(tripCheck.client_id)) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the item belongs to the option block
      const { data: itemCheck } = await supabase
        .from("itinerary_items")
        .select("id, title, option_block_id")
        .eq("id", selectedItemId)
        .eq("option_block_id", optionBlockId)
        .single();

      if (!itemCheck) {
        return new Response(JSON.stringify({ error: "Invalid option selection" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert the selection
      const { error: upsertError } = await supabase
        .from("client_option_selections")
        .upsert({
          client_id: clientId,
          trip_id: tripId,
          option_block_id: optionBlockId,
          selected_item_id: selectedItemId,
          agent_confirmed: false,
          agent_confirmed_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "client_id,trip_id,option_block_id" });

      if (upsertError) {
        console.error("Option selection upsert error:", upsertError);
        throw upsertError;
      }

      // Get block title for the notification
      const { data: blockData } = await supabase
        .from("option_blocks")
        .select("title")
        .eq("id", optionBlockId)
        .single();

      const { data: clientData } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      // Notify agent via portal message
      await supabase.from("portal_messages").insert({
        client_id: clientId,
        agent_user_id: tripCheck.user_id,
        sender_type: "client",
        message: `🎯 ${clientData?.name || "Client"} selected "${itemCheck.title}" for "${blockData?.title || "option"}" on ${tripCheck.trip_name}. Awaiting your confirmation.`,
      });

      // Agent notification bell
      await supabase.from("agent_notifications").insert({
        user_id: tripCheck.user_id,
        type: "option_selected",
        title: "Option Selected",
        message: `${clientData?.name || "Client"} chose "${itemCheck.title}" for "${blockData?.title || "option"}" — needs confirmation.`,
        trip_id: tripId,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "option-selections") {
      // GET saved selections for a trip
      const tripId = url.searchParams.get("tripId");
      if (!tripId) {
        return new Response(JSON.stringify({ error: "tripId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: selections } = await supabase
        .from("client_option_selections")
        .select("option_block_id, selected_item_id, agent_confirmed, agent_confirmed_at")
        .eq("client_id", clientId)
        .eq("trip_id", tripId);

      return new Response(JSON.stringify({ selections: selections || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (resource === "notify-payment-method") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required" }), {
          status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { tripId, paymentId, method } = await req.json();
      if (!tripId || !method) {
        return new Response(JSON.stringify({ error: "tripId and method required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify client access
      const allClientIds = await getAllClientIds();
      const { data: tripCheck } = await supabase
        .from("trips")
        .select("id, client_id, user_id, trip_name")
        .eq("id", tripId)
        .single();

      if (!tripCheck || !allClientIds.includes(tripCheck.client_id)) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: clientData } = await supabase
        .from("clients")
        .select("name, email")
        .eq("id", clientId)
        .single();

      const clientName = clientData?.name || "Client";
      const tripName = tripCheck.trip_name || "a trip";

      // Get payment amount if paymentId provided
      let paymentAmount = 0;
      if (paymentId) {
        const { data: paymentData } = await supabase
          .from("trip_payments")
          .select("amount")
          .eq("id", paymentId)
          .single();
        paymentAmount = paymentData?.amount || 0;
      }

      const methodLabels: Record<string, string> = {
        stripe: "Pay with Card (Stripe)",
        affirm: "Pay with Affirm",
        cc_to_agent: "Send Card Info to Agent",
      };
      const methodLabel = methodLabels[method] || method;
      const amountStr = paymentAmount > 0 ? ` ($${Number(paymentAmount).toLocaleString()})` : "";

      // 1. Dashboard notification
      await supabase.from("agent_notifications").insert({
        user_id: tripCheck.user_id,
        type: "payment_method_selected",
        title: "Payment Method Selected",
        message: `${clientName} chose "${methodLabel}"${amountStr} for ${tripName}.`,
        trip_id: tripId,
      });

      // 2. Portal message
      await supabase.from("portal_messages").insert({
        client_id: clientId,
        agent_user_id: tripCheck.user_id,
        sender_type: "client",
        message: `💳 ${clientName} selected "${methodLabel}"${amountStr} for ${tripName}.`,
      });

      // 3. If CC-to-agent, auto-create a CC authorization and return access_token
      let ccAccessToken: string | null = null;
      if (method === "cc_to_agent") {
        // Check for existing pending CC auth for this trip
        const { data: existingAuth } = await supabase
          .from("cc_authorizations")
          .select("id, access_token")
          .eq("user_id", tripCheck.user_id)
          .eq("client_id", tripCheck.client_id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        if (existingAuth) {
          ccAccessToken = existingAuth.access_token;
        } else {
          // Find the first booking for this trip to link the CC auth
          const { data: tripBookings } = await supabase
            .from("bookings")
            .select("id")
            .eq("trip_id", tripId)
            .limit(1);

          const bookingId = tripBookings?.[0]?.id;
          if (bookingId) {
            const { data: newAuth } = await supabase
              .from("cc_authorizations")
              .insert({
                booking_id: bookingId,
                client_id: tripCheck.client_id,
                user_id: tripCheck.user_id,
                authorization_amount: paymentAmount || 0,
                authorization_description: `Payment for ${tripName}`,
                status: "pending",
              })
              .select("access_token")
              .single();
            ccAccessToken = newAuth?.access_token || null;
          }
        }

        // Still create a workflow task for the agent
        await supabase.from("workflow_tasks").insert({
          trip_id: tripId,
          user_id: tripCheck.user_id,
          title: `CC Authorization from ${clientName}`,
          description: `${clientName} is submitting their card info for ${tripName}${amountStr}.`,
          task_type: "cc_authorization_request",
          status: "pending",
        } as any);
      }

      // 4. Email notification to agent
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const resend = new Resend(RESEND_API_KEY);
          const { data: agentUser } = await supabase.auth.admin.getUserById(tripCheck.user_id);
          const agentEmail = agentUser?.user?.email;

          const { data: branding } = await supabase
            .from("branding_settings")
            .select("agency_name, primary_color, logo_url, from_email, from_name")
            .eq("user_id", tripCheck.user_id)
            .maybeSingle();

          const agencyName = branding?.agency_name || "Crestwell Travel Services";
          const primaryColor = branding?.primary_color || "#0D7377";
          const logoUrl = branding?.logo_url || "";
          const fromEmail = branding?.from_email || "send@crestwellgetaways.com";
          const fromName = branding?.from_name || agencyName;

          let portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.crestwelltravels.com";
          if (!/^https?:\/\//i.test(portalBaseUrl)) portalBaseUrl = `https://${portalBaseUrl}`;
          const dashboardUrl = portalBaseUrl.replace(/\/client.*$/, "").replace(/\/+$/, "");

          const logoHtml = logoUrl
            ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 60px; margin-bottom: 16px;" />`
            : "";

          const ccNote = method === "cc_to_agent"
            ? `<p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 16px;">
                 <strong>Action Required:</strong> ${clientName} is waiting for you to send a secure CC authorization form. A workflow task has been created for you.
               </p>`
            : "";

          if (agentEmail) {
            const html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  ${logoHtml}
                </div>
                <h2 style="color: ${primaryColor}; margin-bottom: 8px;">💳 Payment Method Selected</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  <strong>${clientName}</strong> has selected <strong>${methodLabel}</strong>${amountStr} for <strong>${tripName}</strong>.
                </p>
                ${ccNote}
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${dashboardUrl}/trips/${tripId}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                    View Trip Details
                  </a>
                </div>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                  <p style="margin: 0;">${agencyName}</p>
                </div>
              </div>
            `;

            await resend.emails.send({
              from: `${fromName} <${fromEmail}>`,
              to: [agentEmail],
              subject: `💳 ${clientName} chose "${methodLabel}" — ${tripName}`,
              html,
            });
          }
        }
      } catch (emailErr) {
        console.error("Failed to send payment method email:", emailErr);
      }

      return new Response(JSON.stringify({ success: true, ccAccessToken }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid resource" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Portal data error:", error?.message || error, error?.stack || "");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
