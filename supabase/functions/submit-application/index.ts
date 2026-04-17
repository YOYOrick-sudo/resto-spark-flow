import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MOTIVATION = 1000;
const RATE_LIMIT_PER_24H = 3;

interface ApplicationPayload {
  slug: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  positions?: string[];
  availability_start?: string;
  hours_preference?: string;
  motivation?: string;
  source?: string;
  source_tag?: string;
  website_url?: string; // honeypot
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildNotes(p: ApplicationPayload): string {
  const parts: string[] = [];
  if (p.positions?.length) parts.push(`Functie: ${p.positions.join(', ')}`);
  if (p.availability_start) parts.push(`Beschikbaar: ${p.availability_start}`);
  if (p.hours_preference) parts.push(`Uren: ${p.hours_preference}`);
  if (p.motivation?.trim()) parts.push(`\nMotivatie:\n${p.motivation.trim()}`);
  return parts.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let payload: ApplicationPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // 1. Honeypot — bot vult dit; doe alsof het lukt
  if (payload.website_url && payload.website_url.trim() !== '') {
    console.log('[submit-application] Honeypot triggered, silent success');
    return jsonResponse({ success: true }, 200);
  }

  // 2. Validatie
  const firstName = payload.first_name?.trim();
  const lastName = payload.last_name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const slug = payload.slug?.trim().toLowerCase();

  if (!slug) return jsonResponse({ error: 'slug_required' }, 400);
  if (!firstName || !lastName) return jsonResponse({ error: 'name_required' }, 400);
  if (!email || !EMAIL_REGEX.test(email)) return jsonResponse({ error: 'invalid_email' }, 400);
  if (payload.motivation && payload.motivation.length > MAX_MOTIVATION) {
    return jsonResponse({ error: 'motivation_too_long' }, 400);
  }

  // 3. Slug → location_id
  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from('public_application_settings')
    .select('location_id, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (settingsErr) {
    console.error('[submit-application] Settings lookup failed', settingsErr);
    return jsonResponse({ error: 'server_error' }, 500);
  }
  if (!settings || !settings.is_active) {
    return jsonResponse({ error: 'page_not_found' }, 404);
  }
  const locationId = settings.location_id;

  // 4. Rate limiting (3 per 24u per email per locatie)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: rlErr } = await supabaseAdmin
    .from('public_applications')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .eq('email', email)
    .gte('created_at', since);

  if (rlErr) {
    console.error('[submit-application] Rate-limit query failed', rlErr);
    return jsonResponse({ error: 'server_error' }, 500);
  }
  if ((recentCount ?? 0) >= RATE_LIMIT_PER_24H) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  // 5. Duplicate check (actieve kandidaat met dit email)
  const { data: existingCandidate, error: dupErr } = await supabaseAdmin
    .from('onboarding_candidates')
    .select('id, status')
    .eq('location_id', locationId)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (dupErr) {
    console.error('[submit-application] Dup check failed', dupErr);
    return jsonResponse({ error: 'server_error' }, 500);
  }
  if (existingCandidate) {
    return jsonResponse({ error: 'already_applied' }, 409);
  }

  // 6. Insert candidate
  const notes = buildNotes(payload);
  console.log('[submit-application] inserting candidate', {
    location_id: locationId,
    email,
    positions: payload.positions ?? [],
  });
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from('onboarding_candidates')
    .insert({
      location_id: locationId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: payload.phone?.trim() || null,
      source: payload.source ?? 'website',
      source_tag: payload.source_tag ?? null,
      positions: payload.positions ?? [],
      availability_start: payload.availability_start ?? null,
      hours_preference: payload.hours_preference ?? null,
      motivation: payload.motivation?.trim() || null,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (candErr || !candidate) {
    console.error('[submit-application] Candidate insert failed', {
      message: candErr?.message,
      details: candErr?.details,
      hint: candErr?.hint,
      code: candErr?.code,
    });
    return jsonResponse(
      { error: 'server_error', stage: 'candidate_insert', detail: candErr?.message ?? 'unknown' },
      500
    );
  }
  console.log('[submit-application] candidate created', candidate.id);

  // 7. Insert application record (audit trail)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const ipHash = await hashIp(ip);

  const { error: appErr } = await supabaseAdmin
    .from('public_applications')
    .insert({
      location_id: locationId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: payload.phone?.trim() || null,
      positions: payload.positions ?? [],
      availability_start: payload.availability_start ?? null,
      hours_preference: payload.hours_preference ?? null,
      motivation: payload.motivation?.trim() || null,
      source: payload.source ?? 'website',
      source_tag: payload.source_tag ?? null,
      status: 'converted',
      candidate_id: candidate.id,
      ip_hash: ipHash,
      user_agent: req.headers.get('user-agent') ?? null,
    });

  if (appErr) {
    console.error('[submit-application] Application insert failed (non-fatal)', {
      message: appErr.message,
      details: appErr.details,
      hint: appErr.hint,
      code: appErr.code,
    });
  }

  console.log('[submit-application] success', { candidate_id: candidate.id });
  return jsonResponse({ success: true }, 200);
});
