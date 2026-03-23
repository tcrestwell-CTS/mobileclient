import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

/** Decode a JWT payload without verification (for logging QBO id_token claims). */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const QBO_CLIENT_ID = Deno.env.get("QBO_CLIENT_ID");
  const QBO_CLIENT_SECRET = Deno.env.get("QBO_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!QBO_CLIENT_ID || !QBO_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: "QuickBooks credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Authenticate caller via getClaims ──────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized – invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;

  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const path = url.searchParams.get("action") || pathSegments[pathSegments.length - 1];

  try {
    // ── GET ?action=authorize ────────────────────────────────────────
    if (path === "authorize" && req.method === "GET") {
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) {
        return new Response(JSON.stringify({ error: "redirect_uri required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate redirect_uri against allowed origins
      const QBO_ALLOWED_ORIGINS = Deno.env.get("QBO_ALLOWED_ORIGINS") || "";
      const allowedOrigins = QBO_ALLOWED_ORIGINS
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

      let redirectOrigin: string;
      try {
        redirectOrigin = new URL(redirectUri).origin;
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid redirect_uri format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build expected full redirect URIs from allowed origins
      const REDIRECT_PATH = "/settings?tab=integrations";
      const allowedFullUris = allowedOrigins.map((o) => `${o}${REDIRECT_PATH}`);

      // Check 1: Origin must be in allowed origins list
      if (allowedOrigins.length > 0 && !allowedOrigins.some((o) => redirectOrigin === o)) {
        console.error(
          `QBO redirect_uri mismatch: origin "${redirectOrigin}" not in allowed origins [${allowedOrigins.join(", ")}]`
        );
        return new Response(
          JSON.stringify({
            error: "redirect_uri_mismatch",
            message: `The current origin "${redirectOrigin}" is not registered as an allowed QuickBooks redirect URI.`,
            current_origin: redirectOrigin,
            redirect_uri: redirectUri,
            allowed_origins: allowedOrigins,
            allowed_redirect_uris: allowedFullUris,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check 2: Full redirect URI must exactly match an expected URI
      if (allowedFullUris.length > 0 && !allowedFullUris.includes(redirectUri)) {
        console.error(
          `QBO redirect_uri exact mismatch: "${redirectUri}" not in [${allowedFullUris.join(", ")}]`
        );
        return new Response(
          JSON.stringify({
            error: "redirect_uri_exact_mismatch",
            message: `The redirect URI "${redirectUri}" does not exactly match any registered URI. Ensure this exact URI is listed in your Intuit Developer app's Redirect URIs.`,
            current_origin: redirectOrigin,
            redirect_uri: redirectUri,
            allowed_redirect_uris: allowedFullUris,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const state = crypto.randomUUID();
      const params = new URLSearchParams({
        client_id: QBO_CLIENT_ID,
        scope: "com.intuit.quickbooks.accounting openid profile email",
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });

      return new Response(
        JSON.stringify({ auth_url: `${QBO_AUTH_URL}?${params.toString()}`, state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=callback ────────────────────────────────────────
    if (path === "callback" && req.method === "POST") {
      const { code, redirect_uri, realm_id } = await req.json();
      if (!code || !redirect_uri || !realm_id) {
        return new Response(
          JSON.stringify({ error: "code, redirect_uri, and realm_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);
      const tokenResp = await fetch(QBO_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        console.error("QBO token exchange failed:", tokenResp.status, errText);
        return new Response(
          JSON.stringify({ error: "Token exchange failed", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await tokenResp.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Decode & log id_token claims (OpenID Connect)
      let idTokenClaims: Record<string, unknown> | null = null;
      if (tokens.id_token) {
        idTokenClaims = decodeJwtPayload(tokens.id_token);
        console.log("QBO id_token claims:", JSON.stringify(idTokenClaims));
      } else {
        console.warn("No id_token returned from QBO – OpenID scope may not be enabled in the Intuit app");
      }

      // Get company info
      const baseUrl = "https://quickbooks.api.intuit.com";
      const companyResp = await fetch(
        `${baseUrl}/v3/company/${realm_id}/companyinfo/${realm_id}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json",
          },
        }
      );
      let companyName = null;
      if (companyResp.ok) {
        const companyData = await companyResp.json();
        companyName = companyData.CompanyInfo?.CompanyName;
      }

      // Store connection (upsert)
      const { error: dbError } = await supabaseAdmin
        .from("qbo_connections")
        .upsert(
          {
            user_id: userId,
            realm_id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
            company_name: companyName,
            is_active: true,
          },
          { onConflict: "user_id" }
        );

      if (dbError) {
        console.error("DB error storing QBO connection:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to store connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          company_name: companyName,
          id_token_claims: idTokenClaims,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=refresh ─────────────────────────────────────────
    if (path === "refresh" && req.method === "POST") {
      const { data: connection, error: connError } = await supabaseAdmin
        .from("qbo_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "No active QBO connection found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);
      const tokenResp = await fetch(QBO_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
      });

      if (!tokenResp.ok) {
        const errText = await tokenResp.text();
        console.error("QBO token refresh failed:", tokenResp.status, errText);
        await supabaseAdmin
          .from("qbo_connections")
          .update({ is_active: false })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({ error: "Token refresh failed. Please reconnect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await tokenResp.json();
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabaseAdmin
        .from("qbo_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: newExpiresAt,
        })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=disconnect ──────────────────────────────────────
    if (path === "disconnect" && req.method === "POST") {
      const { data: connection } = await supabaseAdmin
        .from("qbo_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (connection) {
        try {
          const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);
          await fetch(QBO_REVOKE_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ token: connection.refresh_token }),
          });
        } catch (e) {
          console.error("Token revocation failed (non-critical):", e);
        }

        await supabaseAdmin.from("qbo_client_mappings").delete().eq("user_id", userId);
        await supabaseAdmin.from("qbo_invoice_mappings").delete().eq("user_id", userId);
        await supabaseAdmin.from("qbo_connections").delete().eq("user_id", userId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET ?action=status ───────────────────────────────────────────
    if (path === "status" && req.method === "GET") {
      const { data: connection } = await supabaseAdmin
        .from("qbo_connections")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (connection?.is_active) {
        // Auto-refresh if token is expired or expiring within 5 minutes
        const tokenExpiry = new Date(connection.token_expires_at);
        if (tokenExpiry <= new Date(Date.now() + 5 * 60 * 1000)) {
          console.log("QBO status: token expired/expiring, attempting auto-refresh");
          const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);
          const tokenResp = await fetch(QBO_TOKEN_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: connection.refresh_token,
            }),
          });

          if (tokenResp.ok) {
            const tokens = await tokenResp.json();
            const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
            await supabaseAdmin
              .from("qbo_connections")
              .update({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: newExpiresAt,
              })
              .eq("id", connection.id);
            console.log("QBO status: token auto-refreshed successfully");

            return new Response(
              JSON.stringify({
                connected: true,
                refreshed: true,
                connection: {
                  realm_id: connection.realm_id,
                  company_name: connection.company_name,
                  is_active: true,
                  token_expires_at: newExpiresAt,
                  created_at: connection.created_at,
                },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            console.error("QBO status: auto-refresh failed, marking inactive");
            await supabaseAdmin
              .from("qbo_connections")
              .update({ is_active: false })
              .eq("id", connection.id);

            return new Response(
              JSON.stringify({
                connected: false,
                needs_reconnect: true,
                connection: {
                  realm_id: connection.realm_id,
                  company_name: connection.company_name,
                  is_active: false,
                  token_expires_at: connection.token_expires_at,
                  created_at: connection.created_at,
                },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({
          connected: !!connection?.is_active,
          connection: connection
            ? {
                realm_id: connection.realm_id,
                company_name: connection.company_name,
                is_active: connection.is_active,
                token_expires_at: connection.token_expires_at,
                created_at: connection.created_at,
              }
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("QBO auth error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});