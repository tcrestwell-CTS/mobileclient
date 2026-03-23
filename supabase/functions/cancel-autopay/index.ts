import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STRIPE_BASE = 'https://api.stripe.com/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { subscription_id, application_id } = await req.json();

    if (!subscription_id || !application_id) {
      return new Response(JSON.stringify({ error: 'Missing subscription_id or application_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) throw new Error('Stripe secret key not configured');

    const res = await fetch(`${STRIPE_BASE}/subscriptions/${subscription_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(`Stripe: ${json.error?.message || JSON.stringify(json)}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('loan_applications').update({
      autopay_active: false,
      stripe_subscription_id: null,
    }).eq('id', application_id);

    await supabase.from('checkout_payments').update({
      status: 'cancelled',
      plan_cancelled: true,
      plan_cancelled_at: new Date().toISOString(),
      plan_cancelled_reason: 'Manually cancelled by agent',
    }).eq('stripe_subscription_id', subscription_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('cancel-autopay error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Failed to cancel autopay' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});