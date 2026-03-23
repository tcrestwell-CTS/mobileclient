// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events for payment plan enforcement:
//   invoice.payment_succeeded  → increment months_paid, send receipt
//   invoice.payment_failed     → track missed payments, apply $25 late fee after 5-day grace, cancel at 2 misses
//   customer.subscription.deleted → mark plan completed or cancelled

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message}`);
  return json;
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const sig = parts['v1'];
  if (!timestamp || !sig) return false;
  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === sig;
}

async function sendEmail(to: string, subject: string, html: string, resendKey: string) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Crestwell Travel Services <noreply@crestwellgetaways.com>', to, subject, html }),
    });
  } catch (e) { console.error('Email send failed:', e); }
}

function emailHeader(name: string) {
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0d1b2a,#1b3a5c);padding:30px;text-align:center;">
        <h1 style="color:#c9a96e;font-size:24px;margin:0;font-weight:700;letter-spacing:1px;">Crestwell</h1>
        <p style="color:#ffffff;font-size:13px;margin:4px 0 0;letter-spacing:3px;text-transform:uppercase;">Travel Services</p>
      </div>
      <div style="padding:30px;">
      <p style="font-size:16px;color:#333;">Hi ${name},</p>`;
}

const emailFooter = `
      </div>
      <div style="background:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;border-top:1px solid #e0e0e0;">
        <p>Crestwell Travel Services &middot; 888.508.6893 &middot; <a href="mailto:info@crestwellgetaways.com" style="color:#0d1b2a;">info@crestwellgetaways.com</a></p>
      </div>
    </div>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')!;
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!;

  const payload = await req.text();
  const sigHeader = req.headers.get('stripe-signature') || '';

  if (STRIPE_WEBHOOK_SECRET && sigHeader) {
    const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  console.log(`Event: ${event.type}`);

  try {

    // ─── Payment succeeded ────────────────────────────────────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (!subId) return new Response('ok', { status: 200 });

      const { data: plan } = await supabase
        .from('checkout_payments')
        .select('*')
        .eq('stripe_subscription_id', subId)
        .single();

      if (!plan) return new Response('no plan', { status: 200 });

      const newMonthsPaid = (plan.months_paid || 0) + 1;
      await supabase.from('checkout_payments')
        .update({ months_paid: newMonthsPaid, status: 'active' })
        .eq('stripe_subscription_id', subId);

      // Receipt email
      await sendEmail(plan.customer_email,
        `✅ Payment ${newMonthsPaid} of ${plan.total_months} Received — ${plan.trip_name || 'Travel Plan'}`,
        `${emailHeader(plan.customer_name)}
        <p style="font-size:15px;color:#333;">Your payment of <strong>$${(invoice.amount_paid / 100).toFixed(2)}</strong> has been received.</p>
        <div style="background:#f0f7f0;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="margin:0 0 12px;color:#0d1b2a;">Payment Summary</h3>
          ${[
            ['Trip', plan.trip_name || '—'],
            ['Payment', `${newMonthsPaid} of ${plan.total_months}`],
            ['Amount', `$${(invoice.amount_paid / 100).toFixed(2)}`],
            ['Remaining Payments', `${(plan.total_months || 0) - newMonthsPaid}`],
          ].map(([l, v]) => `<p style="margin:4px 0;font-size:14px;"><strong>${l}:</strong> ${v}</p>`).join('')}
        </div>
        <p style="font-size:14px;color:#666;">Your next payment will be automatically drafted on your next scheduled date.</p>
        ${emailFooter}`
      , RESEND_API_KEY);
    }

    // ─── Payment failed ───────────────────────────────────────────────────────
    else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (!subId) return new Response('ok', { status: 200 });

      const { data: plan } = await supabase
        .from('checkout_payments')
        .select('*')
        .eq('stripe_subscription_id', subId)
        .single();

      if (!plan) return new Response('no plan', { status: 200 });

      const retriesExhausted = invoice.next_payment_attempt === null;

      if (!retriesExhausted) {
        // Still retrying within grace period — notify customer to update card
        const retryDate = new Date(invoice.next_payment_attempt * 1000)
          .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        await sendEmail(plan.customer_email,
          `⚠️ Payment Failed — Action Required — ${plan.trip_name || 'Travel Plan'}`,
          `${emailHeader(plan.customer_name)}
          <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:15px 0;border-radius:4px;">
            <p style="margin:0;font-size:15px;color:#856404;">Your scheduled payment could not be processed. We will retry on <strong>${retryDate}</strong>.</p>
          </div>
          <p style="font-size:14px;color:#333;">Please update your payment method before ${retryDate} to avoid a $25 late fee and protect your payment plan.</p>
          <p style="font-size:14px;color:#333;">To update your card, contact us immediately:</p>
          <p style="text-align:center;margin:20px 0;"><strong style="font-size:18px;">📞 Call 888.508.6893</strong></p>
          ${emailFooter}`
        , RESEND_API_KEY);

        console.log(`Payment failed, retry scheduled at ${retryDate} — within grace period`);
        return new Response('ok', { status: 200 });
      }

      // ── Grace period exhausted — count as missed payment ──────────────────
      const newMissed   = (plan.missed_payments || 0) + 1;
      const newLateFees = (plan.late_fees_applied || 0) + 1;

      console.log(`Grace exhausted for sub ${subId} — missed count: ${newMissed}`);

      if (newMissed >= 2) {
        // ── TWO MISSED PAYMENTS — CANCEL ──────────────────────────────────
        await stripePost(`/subscriptions/${subId}`, { 'cancel_at_period_end': 'false' }, STRIPE_SECRET_KEY);

        await supabase.from('checkout_payments')
          .update({
            missed_payments: newMissed,
            late_fees_applied: newLateFees,
            plan_cancelled: true,
            plan_cancelled_at: new Date().toISOString(),
            plan_cancelled_reason: '2 missed payments — automatic cancellation per payment plan terms',
            status: 'cancelled',
          })
          .eq('stripe_subscription_id', subId);

        // Cancellation email to customer
        await sendEmail(plan.customer_email,
          `🚨 Payment Plan Cancelled — ${plan.trip_name || 'Travel Plan'}`,
          `${emailHeader(plan.customer_name)}
          <div style="background:#f8d7da;border-left:4px solid #dc3545;padding:15px;margin:15px 0;border-radius:4px;">
            <p style="margin:0;font-size:15px;color:#721c24;font-weight:bold;">Your payment plan has been automatically cancelled.</p>
          </div>
          <p style="font-size:14px;color:#333;">Per your payment plan agreement, 2 missed payments after the 5-day grace period result in automatic cancellation of the plan.</p>
          <p style="font-size:14px;color:#333;"><strong>What this means for your booking:</strong> Your travel booking may be affected. Please contact us immediately to discuss reinstatement options.</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;margin:20px 0;">
            ${[
              ['Trip', plan.trip_name || '—'],
              ['Payments Completed', `${plan.months_paid || 0} of ${plan.total_months}`],
              ['Missed Payments', `${newMissed}`],
              ['Booking Reference', plan.booking_ref || '—'],
            ].map(([l, v]) => `<p style="margin:4px 0;font-size:14px;"><strong>${l}:</strong> ${v}</p>`).join('')}
          </div>
          <p style="text-align:center;margin:20px 0;"><strong style="font-size:18px;">📞 Call Us Now — 888.508.6893</strong></p>
          ${emailFooter}`
        , RESEND_API_KEY);

        // Internal alert
        await sendEmail('info@crestwellgetaways.com',
          `🚨 PAYMENT PLAN CANCELLED — ${plan.customer_name}`,
          `<p>${plan.customer_name} (${plan.customer_email}) — payment plan auto-cancelled after 2 missed payments.</p>
          <p>Trip: ${plan.trip_name || '—'} | Ref: ${plan.booking_ref || '—'} | Sub: ${subId}</p>
          <p>Months paid: ${plan.months_paid || 0}/${plan.total_months}. Review in agent console.</p>`,
          RESEND_API_KEY
        );

      } else {
        // ── FIRST MISS — apply $25 late fee and warn ──────────────────────
        await supabase.from('checkout_payments')
          .update({ missed_payments: newMissed, late_fees_applied: newLateFees })
          .eq('stripe_subscription_id', subId);

        // Add $25 late fee to next invoice
        await stripePost('/invoiceitems', {
          customer: plan.stripe_customer_id,
          amount: '2500',
          currency: 'usd',
          description: 'Late payment fee — payment not received within 5-day grace period',
          'metadata[subscription_id]': subId,
          'metadata[booking_ref]': plan.booking_ref || '',
        }, STRIPE_SECRET_KEY);

        // First miss warning email
        await sendEmail(plan.customer_email,
          `⚠️ Missed Payment — $25 Late Fee Applied — ${plan.trip_name || 'Travel Plan'}`,
          `${emailHeader(plan.customer_name)}
          <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:15px 0;border-radius:4px;">
            <p style="margin:0;font-size:15px;color:#856404;font-weight:bold;">⚠️ This is missed payment 1 of 2. A second missed payment will result in automatic cancellation of your payment plan.</p>
          </div>
          <p style="font-size:14px;color:#333;">Your scheduled payment could not be collected within the 5-day grace period. A <strong>$25 late fee</strong> has been added to your next draft.</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;margin:20px 0;">
            ${[
              ['Trip', plan.trip_name || '—'],
              ['Late Fee Added', '$25.00'],
              ['Missed Payments', `${newMissed} of 2 (cancellation threshold)`],
              ['Action Required', 'Update payment method immediately'],
            ].map(([l, v]) => `<p style="margin:4px 0;font-size:14px;"><strong>${l}:</strong> ${v}</p>`).join('')}
          </div>
          <p style="font-size:14px;color:#333;">Please contact us immediately to update your payment method and protect your booking.</p>
          <p style="text-align:center;margin:20px 0;"><strong style="font-size:18px;">📞 Call Now — 888.508.6893</strong></p>
          ${emailFooter}`
        , RESEND_API_KEY);

        // Internal alert
        await sendEmail('info@crestwellgetaways.com',
          `⚠️ Missed Payment #${newMissed} — ${plan.customer_name}`,
          `<p>${plan.customer_name} (${plan.customer_email}) missed payment #${newMissed}.</p>
          <p>$25 late fee applied. Trip: ${plan.trip_name || '—'} | Sub: ${subId}</p>`,
          RESEND_API_KEY
        );
      }
    }

    // ─── Subscription deleted (completed or manually cancelled) ───────────────
    else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const { data: plan } = await supabase
        .from('checkout_payments')
        .select('plan_cancelled')
        .eq('stripe_subscription_id', sub.id)
        .single();

      if (plan && !plan.plan_cancelled) {
        const isCompleted = sub.cancellation_details?.reason !== 'cancellation_requested';
        await supabase.from('checkout_payments')
          .update({
            plan_cancelled: !isCompleted,
            plan_cancelled_at: new Date().toISOString(),
            plan_cancelled_reason: sub.cancellation_details?.reason || 'Plan term completed',
            status: isCompleted ? 'completed' : 'cancelled',
          })
          .eq('stripe_subscription_id', sub.id);
      }
    }

  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
