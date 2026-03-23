import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Escape ILIKE special characters to prevent pattern injection
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret",
};

// Booking status workflow
const STATUS_WORKFLOW = {
  pending: "confirmed",
  confirmed: "traveling",
  traveling: "completed",
  completed: null, // Terminal state
  cancelled: null, // Terminal state
};

interface BookingUpdate {
  confirmation_number?: string;
  booking_reference?: string;
  status?: string;
  total_amount?: number;
  notes?: string;
  departure_date?: string;
  return_date?: string;
  travelers?: number;
  destination?: string;
}

interface WebhookPayload {
  event: "booking.created" | "booking.updated" | "booking.cancelled" | "booking.status_changed";
  supplier_id: string;
  supplier_name: string;
  confirmation_number: string;
  data: BookingUpdate;
  timestamp: string;
}

interface AutomationResult {
  bookings_updated: number;
  bookings_notified: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Route handling
    switch (path) {
      case "webhook":
        return await handleSupplierWebhook(req, adminClient);
      
      case "automate-status":
        return await handleAutomateStatus(req, adminClient, supabaseUrl, supabaseAnonKey);
      
      case "sync-booking":
        return await handleSyncBooking(req, adminClient, supabaseUrl, supabaseAnonKey);
      
      case "health":
        return new Response(
          JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      
      default:
        return new Response(
          JSON.stringify({ 
            error: "Unknown endpoint",
            available_endpoints: [
              "/booking-orchestrator/webhook - Receive supplier webhooks",
              "/booking-orchestrator/automate-status - Auto-update booking statuses based on dates",
              "/booking-orchestrator/sync-booking - Sync a single booking from supplier",
              "/booking-orchestrator/health - Health check"
            ]
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle incoming webhooks from supplier systems
 * Webhook should include x-webhook-secret header for authentication
 */
async function handleSupplierWebhook(
  req: Request,
  adminClient: ReturnType<typeof createClient>
): Promise<Response> {
  console.log("Processing supplier webhook");

  // Validate webhook secret - mandatory for security
  const webhookSecret = req.headers.get("x-webhook-secret");
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
  
  if (!expectedSecret) {
    console.error("WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook endpoint not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (webhookSecret !== expectedSecret) {
    console.error("Invalid webhook secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload: WebhookPayload = await req.json();
  console.log("Webhook payload:", JSON.stringify(payload));

  // Validate required fields
  if (!payload.event || !payload.confirmation_number) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: event, confirmation_number" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find booking by confirmation number in notes or booking_reference
  const { data: bookings, error: findError } = await adminClient
    .from("bookings")
    .select("id, status, notes, user_id, client_id")
    .or(`notes.ilike.%${escapeIlike(payload.confirmation_number)}%,booking_reference.eq.${payload.confirmation_number}`)
    .limit(1);

  if (findError) {
    console.error("Error finding booking:", findError);
    return new Response(
      JSON.stringify({ error: "Failed to find booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!bookings || bookings.length === 0) {
    console.log("No matching booking found for:", payload.confirmation_number);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "No matching booking found",
        confirmation_number: payload.confirmation_number 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const booking = bookings[0];
  const updateData: Record<string, unknown> = {};

  // Process based on event type
  switch (payload.event) {
    case "booking.cancelled":
      updateData.status = "cancelled";
      updateData.notes = appendNote(booking.notes, `[${new Date().toISOString()}] Cancelled via ${payload.supplier_name} webhook`);
      break;

    case "booking.status_changed":
      if (payload.data.status) {
        updateData.status = normalizeStatus(payload.data.status);
      }
      updateData.notes = appendNote(booking.notes, `[${new Date().toISOString()}] Status updated to ${payload.data.status} via ${payload.supplier_name}`);
      break;

    case "booking.updated":
      if (payload.data.total_amount) updateData.total_amount = payload.data.total_amount;
      if (payload.data.travelers) updateData.travelers = payload.data.travelers;
      if (payload.data.departure_date) updateData.depart_date = payload.data.departure_date;
      if (payload.data.return_date) updateData.return_date = payload.data.return_date;
      if (payload.data.destination) updateData.destination = payload.data.destination;
      updateData.notes = appendNote(booking.notes, `[${new Date().toISOString()}] Updated via ${payload.supplier_name} webhook`);
      break;

    case "booking.created":
      // For new bookings, we just log the webhook - actual creation should go through sync-booking
      console.log("Received booking.created webhook - use sync-booking endpoint for creation");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Booking creation webhooks are informational. Use sync-booking endpoint to create.",
          booking_id: booking.id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }

  // Update the booking
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await adminClient
      .from("bookings")
      .update(updateData)
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  console.log("Webhook processed successfully for booking:", booking.id);
  return new Response(
    JSON.stringify({ 
      success: true, 
      booking_id: booking.id,
      event: payload.event,
      updates_applied: Object.keys(updateData)
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Automatically update booking statuses based on dates
 * - confirmed → traveling when depart_date is today or past
 * - traveling → completed when return_date is past
 */
async function handleAutomateStatus(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<Response> {
  // Require authentication for all requests
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  let isAdmin = false;
  let mode = "user"; // "system" (all bookings) or "user" (single user's bookings)

  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authorization required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check for automation secret key (for cron jobs)
  const automationKey = Deno.env.get("AUTOMATION_SECRET_KEY");
  if (automationKey && authHeader === `Bearer ${automationKey}`) {
    mode = "system";
    console.log("Running status automation - mode: system (authorized cron job)");
  } else {
    // User-initiated request - validate JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // Check if user is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "office_admin"])
      .limit(1);

    isAdmin = roleData && roleData.length > 0;
    mode = isAdmin ? "system" : "user";
    
    console.log(`Running status automation - mode: ${mode}, user: ${user.id}, isAdmin: ${isAdmin}`);
  }

  const today = new Date().toISOString().split("T")[0];
  const result: AutomationResult & { mode: string; agents_processed?: number } = {
    bookings_updated: 0,
    bookings_notified: 0,
    errors: [],
    mode,
  };

  // Build base query for departing bookings
  let departQuery = adminClient
    .from("bookings")
    .select("id, booking_reference, destination, client_id, user_id")
    .eq("status", "confirmed")
    .lte("depart_date", today);

  // If user mode, filter by user_id
  if (mode === "user" && userId) {
    departQuery = departQuery.eq("user_id", userId);
  }

  // 1. Move confirmed bookings to traveling when departure date is today or past
  const { data: departingBookings, error: departError } = await departQuery;

  const agentsProcessed = new Set<string>();

  if (departError) {
    result.errors.push(`Error fetching departing bookings: ${departError.message}`);
  } else if (departingBookings && departingBookings.length > 0) {
    for (const booking of departingBookings) {
      agentsProcessed.add(booking.user_id);
      const { error: updateError } = await adminClient
        .from("bookings")
        .update({ 
          status: "traveling",
          notes: appendNote(null, `[${new Date().toISOString()}] Auto-transitioned to traveling (departure date reached)`)
        })
        .eq("id", booking.id);

      if (updateError) {
        result.errors.push(`Failed to update booking ${booking.id}: ${updateError.message}`);
      } else {
        result.bookings_updated++;
        console.log(`Booking ${booking.booking_reference} transitioned to traveling`);
      }
    }
  }

  // 2. Move traveling bookings to completed when return date is past
  let returnQuery = adminClient
    .from("bookings")
    .select(`
      id, 
      booking_reference, 
      destination, 
      client_id,
      user_id,
      trip_name,
      depart_date,
      return_date,
      clients (name, email)
    `)
    .eq("status", "traveling")
    .lt("return_date", today);

  // If user mode, filter by user_id
  if (mode === "user" && userId) {
    returnQuery = returnQuery.eq("user_id", userId);
  }

  const { data: returningBookings, error: returnError } = await returnQuery;

  if (returnError) {
    result.errors.push(`Error fetching returning bookings: ${returnError.message}`);
  } else if (returningBookings && returningBookings.length > 0) {
    for (const booking of returningBookings) {
      agentsProcessed.add(booking.user_id);
      const { error: updateError } = await adminClient
        .from("bookings")
        .update({ 
          status: "completed",
          notes: appendNote(null, `[${new Date().toISOString()}] Auto-transitioned to completed (return date passed)`)
        })
        .eq("id", booking.id);

      if (updateError) {
        result.errors.push(`Failed to update booking ${booking.id}: ${updateError.message}`);
      } else {
        result.bookings_updated++;
        console.log(`Booking ${booking.booking_reference} transitioned to completed`);

        // Send completion email if client has email
        const client = booking.clients as { name: string; email: string | null } | null;
        if (client?.email) {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseAnonKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: client.email,
                subject: `Thanks for traveling with us! - ${booking.destination}`,
                template: "trip_completed",
                data: {
                  clientName: client.name,
                  destination: booking.destination,
                  tripName: booking.trip_name || booking.destination,
                  dates: `${booking.depart_date} - ${booking.return_date}`,
                  reference: booking.booking_reference,
                },
              }),
            });

            if (emailResponse.ok) {
              result.bookings_notified++;
              console.log(`Completion email sent for booking ${booking.booking_reference}`);
            }
          } catch (emailError) {
            console.error("Error sending completion email:", emailError);
          }
        }
      }
    }
  }

  result.agents_processed = agentsProcessed.size;

  console.log("Automation complete:", result);
  return new Response(
    JSON.stringify({ 
      success: true, 
      ...result,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Sync a single booking from a supplier system
 * Used for manual imports or when creating bookings from external systems
 */
async function handleSyncBooking(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<Response> {
  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authorization required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const {
    confirmation_number,
    supplier_name,
    client_id,
    destination,
    depart_date,
    return_date,
    total_amount,
    travelers,
    notes,
    trip_name,
  } = body;

  // Validate required fields
  if (!confirmation_number || !client_id || !destination || !depart_date || !return_date) {
    return new Response(
      JSON.stringify({ 
        error: "Missing required fields",
        required: ["confirmation_number", "client_id", "destination", "depart_date", "return_date"]
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check for duplicate confirmation number
  const { data: existing } = await adminClient
    .from("bookings")
    .select("id")
    .eq("user_id", user.id)
    .ilike("notes", `%${escapeIlike(confirmation_number)}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(
      JSON.stringify({ 
        error: "Duplicate booking",
        message: `A booking with confirmation number ${confirmation_number} already exists`,
        existing_booking_id: existing[0].id
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get agent name for owner_agent field
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Generate booking reference
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const bookingReference = `CW-${Array.from(array, b => b.toString(36).padStart(2, "0")).join("").toUpperCase().slice(0, 12)}`;

  // Build notes with confirmation number
  const bookingNotes = [
    `Confirmation: ${confirmation_number}`,
    supplier_name ? `Booked via ${supplier_name}` : null,
    notes || null,
  ].filter(Boolean).join(". ");

  // Create the booking
  const { data: newBooking, error: createError } = await adminClient
    .from("bookings")
    .insert({
      user_id: user.id,
      client_id,
      booking_reference: bookingReference,
      destination,
      depart_date,
      return_date,
      total_amount: total_amount || 0,
      travelers: travelers || 1,
      trip_name: trip_name || `${supplier_name || "External"} - ${destination}`,
      notes: bookingNotes,
      status: "confirmed",
      owner_agent: profile?.full_name || null,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating booking:", createError);
    return new Response(
      JSON.stringify({ error: "Failed to create booking", details: createError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Booking synced successfully:", newBooking.id);
  return new Response(
    JSON.stringify({ 
      success: true, 
      booking: newBooking,
      message: "Booking synced successfully"
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper functions
function appendNote(existingNotes: string | null, newNote: string): string {
  if (!existingNotes) return newNote;
  return `${existingNotes}\n${newNote}`;
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "pending": "pending",
    "confirmed": "confirmed",
    "active": "traveling",
    "traveling": "traveling",
    "in_progress": "traveling",
    "completed": "completed",
    "done": "completed",
    "finished": "completed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
  };
  return statusMap[status.toLowerCase()] || "pending";
}
