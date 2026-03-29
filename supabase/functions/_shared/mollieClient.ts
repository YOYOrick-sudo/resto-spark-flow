import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Mollie Client Helper — raw fetch() only
// ============================================

const MOLLIE_API_BASE = 'https://api.mollie.com';
const MOLLIE_TOKEN_URL = 'https://api.mollie.com/oauth2/tokens';

interface MollieConnection {
  id: string;
  location_id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  mollie_profile_id: string | null;
}

/**
 * Get a valid Mollie access token for a location.
 * Auto-refreshes if expired or about to expire (< 5 min).
 */
export async function getMollieAccessToken(
  admin: ReturnType<typeof createClient>,
  locationId: string
): Promise<string> {
  const { data: conn, error } = await admin
    .from('mollie_connections')
    .select('id, location_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, mollie_profile_id')
    .eq('location_id', locationId)
    .single();

  if (error || !conn) {
    throw new Error('Mollie not connected for this location');
  }

  const mc = conn as MollieConnection;

  if (!mc.access_token_encrypted) {
    throw new Error('Mollie access token not found — complete OAuth flow first');
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = mc.token_expires_at ? new Date(mc.token_expires_at).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt > now + bufferMs) {
    return mc.access_token_encrypted; // Still valid
  }

  // Token expired or about to expire — refresh
  if (!mc.refresh_token_encrypted) {
    throw new Error('Mollie refresh token not found — reconnect OAuth');
  }

  const clientId = Deno.env.get('MOLLIE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MOLLIE_CLIENT_SECRET')!;

  const refreshRes = await fetch(MOLLIE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: mc.refresh_token_encrypted,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!refreshRes.ok) {
    const errBody = await refreshRes.text();
    console.error('[MOLLIE] Token refresh failed:', errBody);
    throw new Error('Failed to refresh Mollie token');
  }

  const tokens = await refreshRes.json();
  const newExpiresAt = new Date(now + (tokens.expires_in || 3600) * 1000).toISOString();

  // Update tokens in DB
  await admin
    .from('mollie_connections')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || mc.refresh_token_encrypted,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mc.id);

  return tokens.access_token;
}

/**
 * Make a Mollie API request with auto-token.
 */
export async function mollieRequest(
  admin: ReturnType<typeof createClient>,
  locationId: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const token = await getMollieAccessToken(admin, locationId);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const opts: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${MOLLIE_API_BASE}${path}`, opts);
  return res;
}

/**
 * Get Mollie profile ID for a location.
 */
export async function getMollieProfileId(
  admin: ReturnType<typeof createClient>,
  locationId: string
): Promise<string | null> {
  const { data } = await admin
    .from('mollie_connections')
    .select('mollie_profile_id')
    .eq('location_id', locationId)
    .single();
  return data?.mollie_profile_id ?? null;
}
