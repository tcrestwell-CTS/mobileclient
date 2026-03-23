import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const ENCRYPTION_KEY = Deno.env.get("CC_ENCRYPTION_KEY")!;

// Derive a CryptoKey from the secret
async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // First import as PBKDF2 key material, then derive a proper 256-bit AES key
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(ENCRYPTION_KEY),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("cc-auth-salt"), iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(plaintext)
  );
  // Store as iv:ciphertext in base64
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

async function decrypt(encrypted: string): Promise<string> {
  const key = await getKey();
  const [ivB64, ctB64] = encrypted.split(":");
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, ct
  );
  return new TextDecoder().decode(decrypted);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // === ACTION: create — Agent creates a new CC auth request ===
    if (action === "create" && req.method === "POST") {
      // Verify agent auth
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { booking_id, client_id, authorization_amount, authorization_description } = await req.json();

      if (!booking_id || !client_id || !authorization_amount) {
        return new Response(JSON.stringify({ error: "booking_id, client_id, and authorization_amount required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("cc_authorizations")
        .insert({
          booking_id,
          client_id,
          user_id: user.id,
          authorization_amount,
          authorization_description: authorization_description || null,
          status: "pending",
        })
        .select("id, access_token")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ id: data.id, access_token: data.access_token }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: submit — Client submits CC info via access token ===
    if (action === "submit" && req.method === "POST") {
      const { access_token, card_number, cvv, expiry, cardholder_name, billing_zip, signature_data } = await req.json();

      if (!access_token || !card_number || !cvv || !expiry || !cardholder_name) {
        return new Response(JSON.stringify({ error: "All CC fields required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate card number (basic Luhn check)
      const cleanCard = card_number.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(cleanCard)) {
        return new Response(JSON.stringify({ error: "Invalid card number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the pending authorization
      const { data: auth } = await supabaseAdmin
        .from("cc_authorizations")
        .select("id, status, booking_id, client_id, user_id")
        .eq("access_token", access_token)
        .eq("status", "pending")
        .maybeSingle();

      if (!auth) {
        return new Response(JSON.stringify({ error: "Invalid or expired authorization request" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Encrypt sensitive fields
      const [encCardNumber, encCvv, encExpiry] = await Promise.all([
        encrypt(cleanCard),
        encrypt(cvv),
        encrypt(expiry),
      ]);

      const lastFour = cleanCard.slice(-4);
      const now = new Date();
      const autoDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Save signature if provided
      let signatureUrl = null;
      if (signature_data) {
        // signature_data is base64 data URL
        const base64Data = signature_data.split(",")[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const fileName = `${auth.id}_signature.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("cc-signatures")
          .upload(fileName, bytes, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabaseAdmin.storage
            .from("cc-signatures")
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      }

      // Update the authorization
      const { error: updateError } = await supabaseAdmin
        .from("cc_authorizations")
        .update({
          encrypted_card_number: encCardNumber,
          encrypted_cvv: encCvv,
          encrypted_expiry: encExpiry,
          last_four: lastFour,
          cardholder_name,
          billing_zip: billing_zip || null,
          signature_url: signatureUrl,
          status: "authorized",
          authorized_at: now.toISOString(),
          expires_at: autoDeleteAt.toISOString(),
          auto_delete_at: autoDeleteAt.toISOString(),
        })
        .eq("id", auth.id);

      if (updateError) throw updateError;

      // Notify agent via portal message
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("id", auth.client_id)
        .single();

      await supabaseAdmin.from("portal_messages").insert({
        client_id: auth.client_id,
        agent_user_id: auth.user_id,
        sender_type: "client",
        message: `💳 ${clientData?.name || "Client"} has authorized credit card ending in ${lastFour} for this booking.`,
      });

      // Log to compliance audit
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") || null;
      const clientUA = req.headers.get("user-agent") || null;

      await supabaseAdmin.from("compliance_audit_log").insert({
        user_id: auth.user_id,
        event_type: "cc_authorized",
        entity_type: "cc_authorization",
        entity_id: auth.id,
        client_name: clientData?.name || null,
        ip_address: clientIp,
        user_agent: clientUA,
        metadata: {
          last_four: lastFour,
          booking_id: auth.booking_id,
          cardholder_name: cardholder_name,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: get-auth-info — Public endpoint for client form to get auth details ===
    if (action === "get-auth-info") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: auth } = await supabaseAdmin
        .from("cc_authorizations")
        .select(`
          id, authorization_amount, authorization_description, status,
          booking_id, client_id, created_at
        `)
        .eq("access_token", token)
        .maybeSingle();

      if (!auth) {
        return new Response(JSON.stringify({ error: "Authorization not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get booking and client details
      const [bookingRes, clientRes, agentBrandingRes] = await Promise.all([
        supabaseAdmin.from("bookings")
          .select("booking_reference, destination, trip_name, depart_date, return_date, total_amount, gross_sales")
          .eq("id", auth.booking_id).single(),
        supabaseAdmin.from("clients")
          .select("name, first_name, email")
          .eq("id", auth.client_id).single(),
        supabaseAdmin.from("cc_authorizations")
          .select("user_id")
          .eq("id", auth.id).single(),
      ]);

      let agencyName = "Travel Agency";
      let agencyLogo = null;
      if (agentBrandingRes.data?.user_id) {
        const { data: branding } = await supabaseAdmin
          .from("branding_settings")
          .select("agency_name, logo_url")
          .eq("user_id", agentBrandingRes.data.user_id)
          .maybeSingle();
        if (branding) {
          agencyName = branding.agency_name || agencyName;
          agencyLogo = branding.logo_url;
        }
      }

      return new Response(JSON.stringify({
        id: auth.id,
        status: auth.status,
        authorization_amount: auth.authorization_amount,
        authorization_description: auth.authorization_description,
        booking: bookingRes.data,
        client: clientRes.data,
        agency_name: agencyName,
        agency_logo: agencyLogo,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: decrypt — Agent decrypts CC info (requires re-auth) ===
    if (action === "decrypt" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { authorization_id, password } = await req.json();
      if (!authorization_id || !password) {
        return new Response(JSON.stringify({ error: "authorization_id and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Re-authenticate the agent
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (signInError) {
        return new Response(JSON.stringify({ error: "Invalid password" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the authorization (RLS check via user_id match)
      const { data: auth } = await supabaseAdmin
        .from("cc_authorizations")
        .select("*")
        .eq("id", authorization_id)
        .eq("user_id", user.id)
        .eq("status", "authorized")
        .maybeSingle();

      if (!auth) {
        return new Response(JSON.stringify({ error: "Authorization not found or expired" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if expired
      if (auth.expires_at && new Date(auth.expires_at) < new Date()) {
        // Auto-delete expired
        await supabaseAdmin.from("cc_authorizations").delete().eq("id", auth.id);
        return new Response(JSON.stringify({ error: "Authorization has expired and been deleted" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decrypt
      const [cardNumber, cvv, expiry] = await Promise.all([
        decrypt(auth.encrypted_card_number),
        decrypt(auth.encrypted_cvv),
        decrypt(auth.encrypted_expiry),
      ]);

      return new Response(JSON.stringify({
        card_number: cardNumber,
        cvv,
        expiry,
        cardholder_name: auth.cardholder_name,
        billing_zip: auth.billing_zip,
        expires_at: auth.expires_at,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: list — Get authorizations for a booking ===
    if (action === "list") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bookingId = url.searchParams.get("booking_id");
      if (!bookingId) {
        return new Response(JSON.stringify({ error: "booking_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean up expired authorizations first
      await supabaseAdmin
        .from("cc_authorizations")
        .delete()
        .lt("auto_delete_at", new Date().toISOString())
        .not("auto_delete_at", "is", null);

      const { data, error } = await supabaseAdmin
        .from("cc_authorizations")
        .select(`
          id, booking_id, client_id, authorization_amount, authorization_description,
          last_four, cardholder_name, status, authorized_at, expires_at,
          access_token, created_at, signature_url
        `)
        .eq("booking_id", bookingId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ authorizations: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: portal-submit — Client submits via portal token ===
    if (action === "portal-list") {
      const portalToken = req.headers.get("x-portal-token");
      if (!portalToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate portal session
      const { data: session } = await supabaseAdmin
        .from("client_portal_sessions")
        .select("client_id")
        .eq("token", portalToken)
        .gt("expires_at", new Date().toISOString())
        .not("verified_at", "is", null)
        .maybeSingle();

      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await supabaseAdmin
        .from("cc_authorizations")
        .select(`
          id, booking_id, authorization_amount, authorization_description,
          status, created_at, access_token
        `)
        .eq("client_id", session.client_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ authorizations: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("CC Authorization error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
