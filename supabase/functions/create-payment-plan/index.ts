// supabase/functions/create-payment-plan/index.ts
// Creates a Stripe Customer, attaches card, creates a monthly subscription
// that auto-cancels after the specified number of months (90 days before travel)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STRIPE_BASE = 'https://api.stripe.com/v1';

async function stripePost(endpoint: string, params: Record<string, string>, key: string) {
  const res = await fetch(`${STRIPE_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message || JSON.stringify(json)}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      amount_cents,
      travel_date,
      customer_name,
      customer_email,
      customer_phone,
      booking_ref,
      trip_name,
      payment_method_id,
      months,
      monthly_amount_cents,
      notes,
    } = await req.json();

    if (!amount_cents || !travel_date || !customer_name || !customer_email || !payment_method_id || !months) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) throw new Error('Stripe secret key not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // ── Step 1: Create Stripe Customer ────────────────────────────────────────
    const customer = await stripePost('/customers', {
      name: customer_name,
      email: customer_email,
      phone: customer_phone || '',
      'metadata[booking_ref]': booking_ref || '',
      'metadata[trip_name]': trip_name || '',
      'metadata[travel_date]': travel_date,
      'metadata[source]': 'crestwell_payment_plan',
    }, STRIPE_SECRET_KEY);

    // ── Step 2: Attach payment method ─────────────────────────────────────────
    await stripePost(`/payment_methods/${payment_method_id}/attach`, {
      customer: customer.id,
    }, STRIPE_SECRET_KEY);

    await stripePost(`/customers/${customer.id}`, {
      'invoice_settings[default_payment_method]': payment_method_id,
    }, STRIPE_SECRET_KEY);

    // ── Step 3: Create recurring Price ────────────────────────────────────────
    const price = await stripePost('/prices', {
      currency: 'usd',
      unit_amount: String(monthly_amount_cents),
      'recurring[interval]': 'month',
      'recurring[interval_count]': '1',
      'product_data[name]': `Crestwell Travel Plan${trip_name ? ` — ${trip_name}` : ''}`,
      'metadata[booking_ref]': booking_ref || '',
      'metadata[travel_date]': travel_date,
    }, STRIPE_SECRET_KEY);

    // ── Step 4: Configure Stripe account retry settings ─────────────────────────
    // NOTE: Also configure in Stripe Dashboard → Settings → Subscriptions & emails:
    // - Set "Retry schedule" to: Day 1, Day 3, Day 5 after failure (5-day grace)
    // - Set "If all retries fail" to: Cancel subscription (webhook tracks missed count)
    // - Enable "Failed payment emails" to notify customer on failure

    // ── Step 5: Calculate cancel_at (90 days before travel) ──────────────────
    const travelTs = new Date(travel_date).getTime();
    const finalPaymentTs = travelTs - (90 * 24 * 60 * 60 * 1000); // 90 days before
    // Cancel subscription 1 day after final payment
    const cancelAt = Math.floor(finalPaymentTs / 1000) + (31 * 24 * 60 * 60);

    // ── Step 6: Create Subscription ───────────────────────────────────────────
    // Anchor billing to today so first payment is immediate
    const billingAnchor = Math.floor(Date.now() / 1000);

    const subscription = await stripePost('/subscriptions', {
      customer: customer.id,
      'items[0][price]': price.id,
      default_payment_method: payment_method_id,
      'billing_cycle_anchor': String(billingAnchor),
      'proration_behavior': 'none',
      'cancel_at': String(cancelAt),
      collection_method: 'charge_automatically',
      'payment_settings[payment_method_types][0]': 'card',
      'payment_settings[save_default_payment_method]': 'on_subscription',
      'metadata[loan_id]': booking_ref || '',
      'metadata[trip_name]': trip_name || '',
      'metadata[travel_date]': travel_date,
      'metadata[total_months]': String(months),
      'metadata[total_amount_cents]': String(amount_cents),
      'metadata[missed_payments]': '0',
      'metadata[late_fee_cents]': '2500',
      'metadata[grace_period_days]': '5',
      'metadata[max_missed_payments]': '2',
    }, STRIPE_SECRET_KEY);

    // ── Step 7: Record in Supabase ────────────────────────────────────────────
    await supabase.from('checkout_payments').insert({
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      amount_cents,
      currency: 'usd',
      payment_method: 'stripe_plan',
      payment_type: 'payment_plan',
      booking_ref: booking_ref || null,
      trip_name: trip_name || null,
      notes: notes || null,
      status: 'active',
      stripe_payment_intent_id: subscription.latest_invoice || null,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customer.id,
      travel_date: travel_date,
      total_months: months,
      months_paid: 0,
      missed_payments: 0,
    });

    return new Response(JSON.stringify({
      success: true,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      monthly_amount_cents,
      months,
      first_payment_date: new Date().toISOString().split('T')[0],
      final_payment_date: new Date(finalPaymentTs).toISOString().split('T')[0],
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('create-payment-plan error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Payment plan setup failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
