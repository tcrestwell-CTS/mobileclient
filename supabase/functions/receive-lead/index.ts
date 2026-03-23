import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Require agent_user_id in query params to identify the destination agent
  const url = new URL(req.url);
  const agentUserId = url.searchParams.get('agent');

  if (!agentUserId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing required query param: agent' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate required fields
  if (!payload.email && !payload.name && !payload.phone) {
    return new Response(
      JSON.stringify({ ok: false, error: 'At least one of email, name, or phone is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (payload.email && typeof payload.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'email is invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const leadId = typeof payload.lead_id === 'string' ? payload.lead_id : null;

  // Check for duplicate by lead_id (if provided)
  if (leadId) {
    const { data: existing } = await supabase
      .from('webhook_leads')
      .select('id, status')
      .eq('user_id', agentUserId)
      .eq('lead_id', leadId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, received: true, lead_id: leadId, status: 'already_exists' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Store the lead
  const { error: insertError } = await supabase
    .from('webhook_leads')
    .insert({
      user_id: agentUserId,
      lead_id: leadId,
      name: typeof payload.name === 'string' ? payload.name : null,
      email: typeof payload.email === 'string' ? payload.email : null,
      phone: typeof payload.phone === 'string' ? payload.phone : null,
      location: typeof payload.location === 'string' ? payload.location : null,
      budget: typeof payload.budget === 'string' ? payload.budget : null,
      project_type: typeof payload.project_type === 'string' ? payload.project_type : null,
      timeline: typeof payload.timeline === 'string' ? payload.timeline : null,
      source: 'webhook',
      status: 'new',
      raw_payload: payload,
    });

  if (insertError) {
    console.error('Insert error:', insertError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to store lead' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, received: true, lead_id: leadId, status: 'queued' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
