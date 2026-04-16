// Eenmalige edge function: activeert de Custom Access Token Hook via Supabase Management API.
// Wordt na succesvol gebruik weer verwijderd.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_REF = 'igqcfxizgtdkwnajvers';
const HOOK_URI = 'pg-functions://postgres/public/custom_access_token_hook';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const pat = Deno.env.get('MANAGEMENT_PAT_TOKEN');
  if (!pat) {
    return new Response(
      JSON.stringify({ error: 'MANAGEMENT_PAT_TOKEN not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

    // First: GET current config so we can report before/after
    const beforeRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
    });
    const beforeBody = await beforeRes.json().catch(() => ({}));

    if (!beforeRes.ok) {
      return new Response(
        JSON.stringify({
          step: 'GET config',
          status: beforeRes.status,
          error: beforeBody,
        }),
        { status: beforeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH: enable hook
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: HOOK_URI,
      }),
    });
    const patchBody = await patchRes.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: patchRes.ok,
        status: patchRes.status,
        before: {
          hook_custom_access_token_enabled: beforeBody?.hook_custom_access_token_enabled,
          hook_custom_access_token_uri: beforeBody?.hook_custom_access_token_uri,
        },
        after: {
          hook_custom_access_token_enabled: patchBody?.hook_custom_access_token_enabled,
          hook_custom_access_token_uri: patchBody?.hook_custom_access_token_uri,
        },
        raw_response: patchBody,
      }, null, 2),
      {
        status: patchRes.ok ? 200 : patchRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
