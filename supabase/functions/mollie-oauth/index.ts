import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getPublicSiteUrl(): string {
  return (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'authorize') {
      return await handleAuthorize(url);
    } else if (action === 'callback') {
      return await handleCallback(url);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use ?action=authorize or ?action=callback' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[MOLLIE OAUTH] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleAuthorize(url: URL) {
  const locationId = url.searchParams.get('location_id');
  if (!locationId) {
    return new Response(JSON.stringify({ error: 'Missing location_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const clientId = Deno.env.get('MOLLIE_CLIENT_ID')!;
  const redirectUri = Deno.env.get('MOLLIE_REDIRECT_URI')!;

  // Generate state token (includes location_id for callback)
  const state = `${locationId}:${crypto.randomUUID()}`;

  // Upsert mollie_connections with state
  const admin = getAdminClient();
  await admin
    .from('mollie_connections')
    .upsert({
      location_id: locationId,
      oauth_state: state,
      onboarding_status: 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'location_id' });

  const mollieAuthUrl = new URL('https://my.mollie.com/oauth2/authorize');
  mollieAuthUrl.searchParams.set('client_id', clientId);
  mollieAuthUrl.searchParams.set('redirect_uri', redirectUri);
  mollieAuthUrl.searchParams.set('state', state);
  mollieAuthUrl.searchParams.set('scope', 'payments.read payments.write refunds.read refunds.write profiles.read organizations.read onboarding.read');
  mollieAuthUrl.searchParams.set('response_type', 'code');
  mollieAuthUrl.searchParams.set('approval_prompt', 'auto');

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, 'Location': mollieAuthUrl.toString() },
  });
}

async function handleCallback(url: URL) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const siteUrl = getPublicSiteUrl();

  if (error) {
    console.error('[MOLLIE OAUTH] Error from Mollie:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/instellingen/betalingen?error=${error}` },
    });
  }

  if (!code || !state) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/instellingen/betalingen?error=missing_params` },
    });
  }

  // Extract location_id from state
  const [locationId] = state.split(':');
  if (!locationId) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/instellingen/betalingen?error=invalid_state` },
    });
  }

  const admin = getAdminClient();

  // Validate state against DB (one-time use)
  const { data: conn } = await admin
    .from('mollie_connections')
    .select('id, oauth_state')
    .eq('location_id', locationId)
    .single();

  if (!conn || conn.oauth_state !== state) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/instellingen/betalingen?error=state_mismatch` },
    });
  }

  // Exchange code for tokens
  const clientId = Deno.env.get('MOLLIE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MOLLIE_CLIENT_SECRET')!;
  const redirectUri = Deno.env.get('MOLLIE_REDIRECT_URI')!;

  const tokenRes = await fetch('https://api.mollie.com/oauth2/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('[MOLLIE OAUTH] Token exchange failed:', errBody);
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/instellingen/betalingen?error=token_exchange_failed` },
    });
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  // Fetch Mollie organization + profile info
  let orgId = null;
  let profileId = null;
  let onboardingStatus = 'completed';

  try {
    const orgRes = await fetch('https://api.mollie.com/v2/organization/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    if (orgRes.ok) {
      const org = await orgRes.json();
      orgId = org.id;
    }

    const profileRes = await fetch('https://api.mollie.com/v2/profiles/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      profileId = profile.id;
      if (profile.status !== 'verified') {
        onboardingStatus = profile.status || 'pending';
      }
    }
  } catch (fetchErr) {
    console.error('[MOLLIE OAUTH] Failed to fetch org/profile:', fetchErr);
  }

  // Update connection — clear oauth_state (one-time use)
  await admin
    .from('mollie_connections')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token,
      token_expires_at: expiresAt,
      mollie_organization_id: orgId,
      mollie_profile_id: profileId,
      onboarding_status: onboardingStatus,
      oauth_state: null, // Clear state — one-time use
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  // Audit log
  await admin.from('audit_log').insert({
    location_id: locationId,
    entity_type: 'mollie_connection',
    entity_id: conn.id,
    action: 'mollie_connected',
    actor_type: 'system',
    changes: { mollie_organization_id: orgId, mollie_profile_id: profileId },
    metadata: {},
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `${siteUrl}/instellingen/betalingen?connected=true` },
  });
}
