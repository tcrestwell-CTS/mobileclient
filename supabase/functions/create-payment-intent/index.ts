import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      amount_cents,
      currency = 'usd',
      customer_name,
      customer_email,
      customer_phone,
      booking_ref,
      trip_name,
      payment_type,
      notes,
    } = await req.json();

    if (!amount_cents || amount_cents < 50) {
      return new Response(JSON.stringify({ error: 'Minimum payment is $0.50' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) throw new Error('Stripe secret key not configured');

    // Create Stripe PaymentIntent
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amount_cents),
        currency,
        'payment_method_types[]': 'card',
        'metadata[customer_name]': customer_name || '',
        'metadata[customer_email]': customer_email || '',
        'metadata[booking_ref]': booking_ref || '',
        'metadata[trip_name]': trip_name || '',
        'metadata[payment_type]': payment_type || '',
        'receipt_email': customer_email || '',
        'description': trip_name
          ? `Crestwell Travel – ${trip_name}${booking_ref ? ` (Ref: ${booking_ref})` : ''}`
          : `Crestwell Travel Payment${booking_ref ? ` – Ref: ${booking_ref}` : ''}`,
      }),
    });

    const paymentIntent = await stripeRes.json();
    if (paymentIntent.error) throw new Error(paymentIntent.error.message);

    // Record payment in Supabase using service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('checkout_payments').insert({
      customer_name: customer_name || 'Unknown',
      customer_email: customer_email || '',
      customer_phone: customer_phone || null,
      amount_cents,
      currency,
      payment_method: 'stripe',
      payment_type: payment_type || 'custom',
      booking_ref: booking_ref || null,
      trip_name: trip_name || null,
      notes: notes || null,
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
