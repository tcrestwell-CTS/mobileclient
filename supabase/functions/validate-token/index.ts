import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeLinkType(value: unknown): 'payment' | 'financing' {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'financing' ? 'financing' : 'payment';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { token, link_type, mark_used = false } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ valid: false, reason: 'No token provided' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: link, error } = await supabase
      .from('secure_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ valid: false, reason: 'Invalid link' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!link.active) {
      return new Response(JSON.stringify({ valid: false, reason: 'This link has been deactivated' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, reason: 'This link has expired' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link.single_use && link.used_at) {
      return new Response(JSON.stringify({ valid: false, reason: 'This link has already been used' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (link_type) {
      const requestedType = normalizeLinkType(link_type);
      const storedType = normalizeLinkType(link.link_type);

      if (storedType !== requestedType) {
        return new Response(JSON.stringify({ valid: false, reason: 'Invalid link type' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (mark_used && !link.used_at) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      await supabase.from('secure_links').update({
        used_at: new Date().toISOString(),
        used_ip: ip,
      }).eq('token', token);
    }

    return new Response(JSON.stringify({
      valid: true,
      link_type: normalizeLinkType(link.link_type),
      payment_type: link.payment_type || 'custom',
      client_name: link.client_name,
      client_email: link.client_email,
      booking_ref: link.booking_ref,
      trip_name: link.trip_name,
      amount: link.amount,
      expires_at: link.expires_at,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ valid: false, reason: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});