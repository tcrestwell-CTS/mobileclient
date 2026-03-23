const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'spam4.me', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'dispostable.com', 'mailnull.com', 'maildrop.cc', 'discard.email',
  'fakeinbox.com', 'getnada.com', 'mailnesia.com', 'spamgourmet.com',
  'tempr.email', 'mytemp.email', '10minutemail.com', 'temp-mail.org',
  'throwam.com', 'burnermail.io', 'inboxkitten.com', 'spamherelots.com',
]);

function isValidFormat(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email.toLowerCase());
}

function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

async function checkDNS(domain: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { 'Accept': 'application/dns-json' } }
    );
    const data = await res.json();

    if (data.Status === 3) {
      return { valid: false, reason: 'This email domain does not exist.' };
    }

    const mxRecords = data.Answer?.filter((r: any) => r.type === 15) || [];
    if (mxRecords.length === 0) {
      const aRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      const aData = await aRes.json();
      const aRecords = aData.Answer?.filter((r: any) => r.type === 1) || [];
      if (aRecords.length === 0) {
        return { valid: false, reason: 'This email domain cannot receive email.' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: true };
  }
}

async function checkAbstractAPI(email: string): Promise<{
  valid: boolean;
  reason?: string;
  deliverability?: string;
  is_disposable?: boolean;
  is_role?: boolean;
  quality_score?: number;
}> {
  const ABSTRACT_API_KEY = Deno.env.get('ABSTRACT_EMAIL_API_KEY');
  if (!ABSTRACT_API_KEY) {
    return { valid: true };
  }

  try {
    const res = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(4000) }
    );

    if (!res.ok) return { valid: true };

    const data = await res.json();

    if (data.deliverability === 'UNDELIVERABLE') {
      return { valid: false, reason: 'This email address appears to be invalid or undeliverable.' };
    }

    if (data.is_disposable_email?.value === true) {
      return { valid: false, reason: 'Disposable email addresses are not accepted. Please use your real email address.' };
    }

    if (data.quality_score < 0.50) {
      return { valid: false, reason: 'This email address could not be verified. Please double-check it.' };
    }

    return {
      valid: true,
      deliverability: data.deliverability,
      is_disposable: data.is_disposable_email?.value,
      is_role: data.is_role_email?.value,
      quality_score: data.quality_score,
    };
  } catch {
    return { valid: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ valid: false, reason: 'Email is required.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmed = email.trim().toLowerCase();

    if (!isValidFormat(trimmed)) {
      return new Response(JSON.stringify({ valid: false, reason: 'Please enter a valid email address.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domain = getDomain(trimmed);

    if (DISPOSABLE_DOMAINS.has(domain)) {
      return new Response(JSON.stringify({ valid: false, reason: 'Disposable email addresses are not accepted. Please use your real email address.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dnsResult = await checkDNS(domain);
    if (!dnsResult.valid) {
      return new Response(JSON.stringify({ valid: false, reason: dnsResult.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const abstractResult = await checkAbstractAPI(trimmed);
    if (!abstractResult.valid) {
      return new Response(JSON.stringify({ valid: false, reason: abstractResult.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      quality_score: abstractResult.quality_score,
      is_role: abstractResult.is_role,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch {
    return new Response(JSON.stringify({ valid: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
