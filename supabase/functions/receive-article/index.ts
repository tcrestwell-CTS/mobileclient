import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_DOMAIN = 'https://crestwell-public-site.vercel.app';
const WEBHOOK_TOKEN = 'aseo_wh_9cc6393ec616aada27c28e411855cb90';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function calcReadingTime(html: string): number {
  const text = stripHtml(html);
  const wordCount = text.split(' ').filter(Boolean).length;
  return Math.ceil(wordCount / 200);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify Authorization header
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (token !== WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.event === 'test') {
    return new Response(JSON.stringify({ url: `${SITE_DOMAIN}/blog/test`, status: 'ok' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const reading_time = body.content_html
      ? calcReadingTime(body.content_html)
      : (body.reading_time ?? 5);

    const record = {
      id:               body.id,
      title:            body.title,
      slug:             body.slug,
      content_html:     body.content_html     ?? null,
      content_markdown: body.content_markdown ?? null,
      hero_image_url:   body.heroImageUrl     ?? null,
      hero_image_alt:   body.heroImageAlt     ?? null,
      infographic_url:  body.infographicImageUrl ?? null,
      meta_description: body.metaDescription  ?? null,
      meta_keywords:    body.metaKeywords     ?? null,
      tags:             body.wordpressTags    ?? null,
      faq_schema:       body.faqSchema        ?? null,
      language:         body.languageCode     ?? 'en',
      reading_time,
      published_at:     body.publishedAt      ?? null,
      updated_at:       body.updatedAt        ?? null,
      created_at:       body.createdAt        ?? null,
      received_at:      new Date().toISOString(),
    };

    const { error } = await supabase
      .from('blog_posts')
      .upsert(record, { onConflict: 'id' });

    if (error) throw error;

    return new Response(
      JSON.stringify({ url: `${SITE_DOMAIN}/blog/${body.slug}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
