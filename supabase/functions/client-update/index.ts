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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const { action, token, ...body } = await req.json();

    // ── Action: create-token (agent-authenticated) ─────────────────────
    if (action === "create-token") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { clientId } = body;

      // Create the token
      const { data: tokenRow, error: insertErr } = await supabaseAdmin
        .from("client_update_tokens")
        .insert({ client_id: clientId, user_id: user.id })
        .select("token")
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ token: tokenRow.token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: send-update-link (agent-authenticated) ─────────────────
    if (action === "send-update-link") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { clientId } = body;

      // Get client info
      const { data: client, error: clientErr } = await supabaseAdmin
        .from("clients")
        .select("name, email")
        .eq("id", clientId)
        .single();

      if (clientErr || !client?.email) {
        return new Response(
          JSON.stringify({ error: "Client not found or has no email" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create token
      const { data: tokenRow, error: insertErr } = await supabaseAdmin
        .from("client_update_tokens")
        .insert({ client_id: clientId, user_id: user.id })
        .select("token")
        .single();

      if (insertErr) throw insertErr;

      // Get branding
      const { data: branding } = await supabaseAdmin
        .from("branding_settings")
        .select("agency_name, logo_url, primary_color")
        .eq("user_id", user.id)
        .maybeSingle();

      const agencyName = branding?.agency_name || "Crestwell Travel Services";
      const logoUrl = branding?.logo_url || "";
      const primaryColor = branding?.primary_color || "#1e3a5f";
      const updateLink = `https://agents.crestwelltravels.com/update-info/${tokenRow.token}`;

      // Send email via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: ${primaryColor}; padding: 32px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${agencyName}" style="max-height: 50px; margin-bottom: 12px;" />` : ""}
            <h1 style="color: #ffffff; font-size: 22px; margin: 0;">${agencyName}</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Update Your Contact Information</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Hi ${client.name},
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              We'd like to make sure we have your latest contact details on file. Please click the button below to review and update your information.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${updateLink}" style="background: ${primaryColor}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Update My Information
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              This link will expire in 7 days. If you did not expect this email, you can safely ignore it.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">${agencyName}</p>
          </div>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${agencyName} <notify@crestwellgetaways.com>`,
          to: [client.email],
          subject: `${agencyName} — Please Update Your Contact Information`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        throw new Error(`Resend error: ${errBody}`);
      }

      // Log it
      await supabaseAdmin.from("email_logs").insert({
        user_id: user.id,
        client_id: clientId,
        to_email: client.email,
        subject: `${agencyName} — Please Update Your Contact Information`,
        template: "client_info_update",
        status: "sent",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get-client-info (public, token-based) ──────────────────
    if (action === "get-client-info") {
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenRow, error: tokenErr } = await supabaseAdmin
        .from("client_update_tokens")
        .select("*, clients(*)")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenErr || !tokenRow) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired link" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get branding for the agent
      const { data: branding } = await supabaseAdmin
        .from("branding_settings")
        .select("agency_name, logo_url, primary_color, accent_color")
        .eq("user_id", tokenRow.user_id)
        .maybeSingle();

      const client = tokenRow.clients;
      return new Response(
        JSON.stringify({
          client: {
            first_name: client.first_name,
            last_name: client.last_name,
            preferred_first_name: client.preferred_first_name,
            email: client.email,
            secondary_email: client.secondary_email,
            phone: client.phone,
            secondary_phone: client.secondary_phone,
            birthday: client.birthday,
            anniversary: client.anniversary,
            address_line_1: client.address_line_1,
            address_line_2: client.address_line_2,
            address_city: client.address_city,
            address_state: client.address_state,
            address_zip_code: client.address_zip_code,
            address_country: client.address_country,
            known_traveler_number: client.known_traveler_number,
            redress_number: client.redress_number,
            passport_info: client.passport_info,
            food_drink_allergies: client.food_drink_allergies,
            activities_interests: client.activities_interests,
            loyalty_programs: client.loyalty_programs,
          },
          branding: {
            agency_name: branding?.agency_name || "Crestwell Travel Services",
            logo_url: branding?.logo_url || "",
            primary_color: branding?.primary_color || "#1e3a5f",
            accent_color: branding?.accent_color || "#e8782a",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Action: submit-update (public, token-based) ────────────────────
    if (action === "submit-update") {
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenRow, error: tokenErr } = await supabaseAdmin
        .from("client_update_tokens")
        .select("client_id, user_id")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenErr || !tokenRow) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired link" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { updates } = body;

      // Whitelist allowed fields
      const allowedFields = [
        "first_name", "last_name", "preferred_first_name",
        "email", "secondary_email", "phone", "secondary_phone",
        "birthday", "anniversary",
        "address_line_1", "address_line_2", "address_city",
        "address_state", "address_zip_code", "address_country",
        "known_traveler_number", "redress_number", "passport_info",
        "food_drink_allergies", "activities_interests", "loyalty_programs",
      ];

      const sanitized: Record<string, string | null> = {};
      for (const field of allowedFields) {
        if (field in updates) {
          sanitized[field] = updates[field] || null;
        }
      }

      // Build name from first/last
      if (sanitized.first_name !== undefined || sanitized.last_name !== undefined) {
        const firstName = sanitized.first_name || "";
        const lastName = sanitized.last_name || "";
        sanitized.name = `${firstName} ${lastName}`.trim() || undefined as any;
      }

      // Build location
      if (sanitized.address_city && sanitized.address_state) {
        sanitized.location = `${sanitized.address_city}, ${sanitized.address_state}`;
      }

      // Update the client
      const { error: updateErr } = await supabaseAdmin
        .from("clients")
        .update(sanitized)
        .eq("id", tokenRow.client_id);

      if (updateErr) throw updateErr;

      // Mark token as used
      await supabaseAdmin
        .from("client_update_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // Notify the agent
      await supabaseAdmin.from("agent_notifications").insert({
        user_id: tokenRow.user_id,
        type: "client_info_updated",
        title: "Client Updated Their Info",
        message: `A client has updated their contact information via the self-service form.`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("client-update error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
