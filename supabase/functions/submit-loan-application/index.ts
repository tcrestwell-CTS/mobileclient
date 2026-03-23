// supabase/functions/submit-loan-application/index.ts
// Uses service role key to write to loan_applications table
// RLS stays ENABLED on the table — anon key never writes directly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Basic required field validation
    if (!body.first_name || !body.last_name || !body.email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate autopay consent
    if (!body.consent_autopay) {
      return new Response(JSON.stringify({ error: 'Auto-payment authorization required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate autopay e-signature
    const expectedAutoPay = `${body.first_name} ${body.last_name}`.toLowerCase().trim();
    if (!body.autopay_esignature || body.autopay_esignature.toLowerCase().trim() !== expectedAutoPay) {
      return new Response(JSON.stringify({ error: 'Auto-payment signature must match full name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate consent — must be true
    if (!body.consent_credit_check || !body.consent_terms) {
      return new Response(JSON.stringify({ error: 'Consent required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate e-signature matches name
    const expectedSig = `${body.first_name} ${body.last_name}`.toLowerCase().trim();
    if (!body.esignature || body.esignature.toLowerCase().trim() !== expectedSig) {
      return new Response(JSON.stringify({ error: 'E-signature must match full name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use SERVICE ROLE key — bypasses RLS, keeps table secure from anon writes
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_SERVICE_KEY) throw new Error('Service role key not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      SUPABASE_SERVICE_KEY
    );

    // Get client IP
    const ip = req.headers.get('x-forwarded-for')
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    const { data, error } = await supabase
      .from('loan_applications')
      .insert({
        ...body,
        ip_address: ip,
        user_agent: body.user_agent || null,
        status: 'pending',
        signed_at: new Date().toISOString(),
        // Ensure numeric fields are properly typed
        monthly_income:        body.monthly_income        ? parseFloat(body.monthly_income)        : null,
        other_income:          body.other_income          ? parseFloat(body.other_income)          : null,
        loan_amount_requested: body.loan_amount_requested ? parseFloat(body.loan_amount_requested) : null,
        down_payment:          body.down_payment          ? parseFloat(body.down_payment)          : null,
        preferred_term_months: body.preferred_term_months ? parseInt(body.preferred_term_months)   : null,
        monthly_rent_mortgage: body.monthly_rent_mortgage ? parseFloat(body.monthly_rent_mortgage) : null,
        monthly_car_payment:   body.monthly_car_payment   ? parseFloat(body.monthly_car_payment)   : null,
        monthly_other_debt:    body.monthly_other_debt    ? parseFloat(body.monthly_other_debt)     : null,
        date_of_birth:              body.date_of_birth              || null,
        travel_date:                body.travel_date                || null,
        autopay_method:             body.autopay_method             || null,
        consent_autopay:            body.consent_autopay            || false,
        autopay_esignature:         body.autopay_esignature         || null,
        autopay_signed_at:          body.consent_autopay ? new Date().toISOString() : null,
        stripe_payment_method_id:   body.stripe_payment_method_id   || null,
        autopay_active:             false,  // Never active until manually approved
      })
      .select('application_number')
      .single();

    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify({ success: true, application_number: data?.application_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Loan application error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Submission failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
