import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max = 10, windowMs = 3600000): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { slug, email } = await req.json();

    if (!slug || !email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email or missing slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit by IP + slug
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${ip}:${slug}`;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lookup location
    const { data: location, error: locErr } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (locErr || !location) {
      return new Response(JSON.stringify({ error: 'Location not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const locationId = location.id;
    const normalizedEmail = email.trim().toLowerCase();

    // Upsert customer
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('location_id', locationId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          location_id: locationId,
          email: normalizedEmail,
          first_name: 'Website',
          last_name: 'Subscriber',
        })
        .select('id')
        .single();
      if (custErr || !newCustomer) {
        throw new Error('Failed to create customer');
      }
      customerId = newCustomer.id;
    }

    // Check double opt-in setting
    const { data: brandKit } = await supabaseAdmin
      .from('marketing_brand_kit')
      .select('double_opt_in_enabled')
      .eq('location_id', locationId)
      .maybeSingle();

    const doubleOptIn = brandKit?.double_opt_in_enabled ?? false;
    const token = doubleOptIn ? crypto.randomUUID() : null;

    // Upsert contact preference
    const { data: existingPref } = await supabaseAdmin
      .from('marketing_contact_preferences')
      .select('id')
      .eq('customer_id', customerId)
      .eq('location_id', locationId)
      .eq('channel', 'email')
      .maybeSingle();

    if (existingPref) {
      await supabaseAdmin
        .from('marketing_contact_preferences')
        .update({
          opted_in: !doubleOptIn,
          consent_source: 'website_popup',
          opted_in_at: new Date().toISOString(),
          double_opt_in_token: token,
          double_opt_in_confirmed: !doubleOptIn,
          double_opt_in_sent_at: doubleOptIn ? new Date().toISOString() : null,
        })
        .eq('id', existingPref.id);
    } else {
      await supabaseAdmin
        .from('marketing_contact_preferences')
        .insert({
          customer_id: customerId,
          location_id: locationId,
          channel: 'email',
          opted_in: !doubleOptIn,
          consent_source: 'website_popup',
          opted_in_at: doubleOptIn ? null : new Date().toISOString(),
          double_opt_in_token: token,
          double_opt_in_confirmed: !doubleOptIn,
          double_opt_in_sent_at: doubleOptIn ? new Date().toISOString() : null,
        });
    }

    // If double opt-in, trigger confirmation email via existing edge function pattern
    if (doubleOptIn && token) {
      const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/marketing-confirm-optin?token=${token}`;
      console.log(`[POPUP-SUBSCRIBE] Double opt-in token generated for ${normalizedEmail}, confirm URL: ${confirmUrl}`);
      // In production, send email via Resend here
    }

    return new Response(JSON.stringify({ success: true, double_opt_in: doubleOptIn }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POPUP-SUBSCRIBE] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
