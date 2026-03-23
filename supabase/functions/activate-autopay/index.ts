// supabase/functions/activate-autopay/index.ts
// Creates a Stripe Customer, attaches payment method, creates a Subscription
// Updates loan_applications record with customer/subscription IDs and sets autopay_active = true

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STRIPE_BASE = 'https://api.stripe.com/v1';

// ─── Stripe helpers ───────────────────────────────────────────────────────────

async function stripePost(endpoint: string, data: Record<string, string>, secretKey: string) {
  const res = await fetch(`${STRIPE_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${json.error?.message || JSON.stringify(json.error)}`);
  return json;
}

async function stripeGet(endpoint: string, secretKey: string) {
  const res = await fetch(`${STRIPE_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${json.error?.message || JSON.stringify(json.error)}`);
  return json;
}

// ─── Calculate monthly payment using simple amortization ─────────────────────

function calcMonthlyPayment(principalDollars: number, annualRatePct: number, termMonths: number): number {
  if (annualRatePct === 0) return Math.round((principalDollars / termMonths) * 100); // cents
  const monthlyRate = annualRatePct / 100 / 12;
  const payment = principalDollars * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
    / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100); // return cents
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      loan_id,
      stripe_payment_method_id,
      approved_amount,
      approved_rate,
      approved_term_months,
      autopay_start_date,
      customer_name,
      customer_email,
    } = await req.json();

    // Validate required fields
    if (!loan_id || !stripe_payment_method_id || !approved_amount || !approved_term_months) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) throw new Error('Stripe secret key not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify loan exists and is approved
    const { data: loan, error: loanErr } = await supabase
      .from('loan_applications')
      .select('id, status, autopay_active, first_name, last_name, email')
      .eq('id', loan_id)
      .single();

    if (loanErr || !loan) throw new Error('Loan application not found');
    if (loan.status !== 'approved') throw new Error('Loan must be approved before activating autopay');
    if (loan.autopay_active) throw new Error('Autopay is already active for this loan');

    // ── Step 1: Retrieve PM to check if already attached ─────────────────────
    const pm = await stripeGet(`/payment_methods/${stripe_payment_method_id}`, STRIPE_SECRET_KEY);

    let customerId: string;

    if (pm.customer) {
      // PM is already attached — reuse that customer
      customerId = pm.customer;
      console.log(`PM already attached to customer: ${customerId}, reusing`);

      // Update customer metadata
      await stripePost(`/customers/${customerId}`, {
        name: customer_name || `${loan.first_name} ${loan.last_name}`,
        email: customer_email || loan.email,
        'metadata[loan_id]': loan_id,
        'metadata[source]': 'crestwell_travel_financing',
      }, STRIPE_SECRET_KEY);
    } else {
      // Create new customer and attach
      const customer = await stripePost('/customers', {
        name: customer_name || `${loan.first_name} ${loan.last_name}`,
        email: customer_email || loan.email,
        'metadata[loan_id]': loan_id,
        'metadata[source]': 'crestwell_travel_financing',
      }, STRIPE_SECRET_KEY);
      customerId = customer.id;
      console.log(`Created Stripe customer: ${customerId}`);

      // Attach payment method
      await stripePost(`/payment_methods/${stripe_payment_method_id}/attach`, {
        customer: customerId,
      }, STRIPE_SECRET_KEY);
    }

    // Set as default payment method
    await stripePost(`/customers/${customerId}`, {
      'invoice_settings[default_payment_method]': stripe_payment_method_id,
    }, STRIPE_SECRET_KEY);

    console.log(`PM ${stripe_payment_method_id} ready on customer ${customerId}`);

    // ── Step 3: Create Stripe Price (one-time recurring amount) ───────────────
    const monthlyAmountCents = calcMonthlyPayment(
      approved_amount,
      approved_rate || 0,
      approved_term_months
    );

    const price = await stripePost('/prices', {
      currency: 'usd',
      unit_amount: String(monthlyAmountCents),
      'recurring[interval]': 'month',
      'recurring[interval_count]': '1',
      'product_data[name]': 'Crestwell Travel Loan — Monthly Installment',
      'metadata[loan_id]': loan_id,
    }, STRIPE_SECRET_KEY);

    console.log(`Created price: ${price.id} — $${monthlyAmountCents / 100}/mo`);

    // ── Step 4: Create Subscription with billing_cycle_anchor ────────────────
    const startDate = autopay_start_date
      ? Math.floor(new Date(autopay_start_date).getTime() / 1000)
      : Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days from now

    const subscriptionData: Record<string, string> = {
      customer: customerId,
      'items[0][price]': price.id,
      'default_payment_method': stripe_payment_method_id,
      'billing_cycle_anchor': String(startDate),
      'proration_behavior': 'none',
      'cancel_at': String(startDate + (approved_term_months * 30 * 24 * 60 * 60)),
      'metadata[loan_id]': loan_id,
      'metadata[approved_amount]': String(approved_amount),
      'metadata[approved_term_months]': String(approved_term_months),
      'collection_method': 'charge_automatically',
    };

    const subscription = await stripePost('/subscriptions', subscriptionData, STRIPE_SECRET_KEY);

    console.log(`Created subscription: ${subscription.id}`);

    // ── Step 5: Update loan_applications record ───────────────────────────────
    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({
        autopay_active: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        autopay_start_date: autopay_start_date || new Date(startDate * 1000).toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        agent_notes: `Autopay activated. Stripe customer: ${customerId}. Subscription: ${subscription.id}. Monthly payment: $${(monthlyAmountCents / 100).toFixed(2)}. First payment: ${autopay_start_date || 'in 30 days'}.`,
      })
      .eq('id', loan_id);

    if (updateErr) throw new Error(`Failed to update loan record: ${updateErr.message}`);

    return new Response(JSON.stringify({
      success: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      monthly_payment_cents: monthlyAmountCents,
      monthly_payment_dollars: (monthlyAmountCents / 100).toFixed(2),
      first_payment_date: autopay_start_date || new Date(startDate * 1000).toISOString().split('T')[0],
      total_payments: approved_term_months,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('activate-autopay error:', err.message);
    return new Response(JSON.stringify({ error: err.message || 'Activation failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
