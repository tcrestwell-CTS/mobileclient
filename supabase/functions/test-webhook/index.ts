import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url, http_method = 'POST' } = await req.json();

    if (!webhook_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No webhook URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const samplePayload = {
      lead_id: "abc123",
      name: "John Smith",
      email: "john@example.com",
      phone: "(555) 123-4567",
      location: "Phoenix, AZ",
      budget: "$45k - $60k",
      project_type: "Full Kitchen Remodel",
      timeline: "1-3 Months",
      test: true,
      sent_at: new Date().toISOString(),
    };

    const fetchOptions: RequestInit = {
      method: http_method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (http_method === 'POST') {
      fetchOptions.body = JSON.stringify(samplePayload);
    }

    const targetUrl = http_method === 'GET'
      ? `${webhook_url}?${new URLSearchParams(samplePayload as any).toString()}`
      : webhook_url;

    const response = await fetch(targetUrl, fetchOptions);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
