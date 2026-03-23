const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      checkout_token,
      amount_cents,
      customer_name,
      customer_email,
      booking_ref,
      trip_name,
      payment_type,
    } = await req.json();

    if (!checkout_token) {
      return new Response(JSON.stringify({ error: 'Checkout token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const AFFIRM_PRIVATE_KEY = Deno.env.get('AFFIRM_PRIVATE_KEY');
    const AFFIRM_PUBLIC_KEY = Deno.env.get('AFFIRM_PUBLIC_KEY');
    const AFFIRM_ENV = Deno.env.get('AFFIRM_ENVIRONMENT') || 'production';

    if (!AFFIRM_PRIVATE_KEY || !AFFIRM_PUBLIC_KEY) {
      throw new Error('Affirm keys not configured');
    }

    const affirmBase = AFFIRM_ENV === 'sandbox'
      ? 'https://sandbox.affirm.com'
      : 'https://api.affirm.com';

    // Authorize the Affirm charge
    const authRes = await fetch(`${affirmBase}/api/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${AFFIRM_PUBLIC_KEY}:${AFFIRM_PRIVATE_KEY}`),
      },
      body: JSON.stringify({ checkout_token }),
    });

    const charge = await authRes.json();
    if (!authRes.ok) throw new Error(charge.message || 'Affirm authorization failed');

    // Capture the charge immediately
    const captureRes = await fetch(`${affirmBase}/api/v1/transactions/${charge.id}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${AFFIRM_PUBLIC_KEY}:${AFFIRM_PRIVATE_KEY}`),
      },
      body: JSON.stringify({
        order_id: booking_ref || `CTS-${Date.now()}`,
        shipping_carrier: null,
        shipping_confirmation: null,
      }),
    });

    const captured = await captureRes.json();
    if (!captureRes.ok) throw new Error(captured.message || 'Affirm capture failed');

    // Record in Supabase using service role to bypass RLS
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('checkout_payments').insert({
      customer_name: customer_name || 'Unknown',
      customer_email: customer_email || '',
      amount_cents,
      payment_method: 'affirm',
      payment_type: payment_type || 'custom',
      booking_ref: booking_ref || null,
      trip_name: trip_name || null,
      status: 'succeeded',
      affirm_charge_id: charge.id,
    });

    return new Response(
      JSON.stringify({ success: true, charge_id: charge.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
