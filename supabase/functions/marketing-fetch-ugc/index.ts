import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { location_id } = await req.json();
    if (!location_id) {
      return new Response(JSON.stringify({ error: 'location_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Instagram account for location
    const { data: igAccount } = await supabaseAdmin
      .from('marketing_social_accounts')
      .select('id, access_token, account_id')
      .eq('location_id', location_id)
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .maybeSingle();

    if (!igAccount?.access_token || !igAccount?.account_id) {
      return new Response(JSON.stringify({ posts: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch tagged posts from Instagram Graph API
    // Note: requires instagram_manage_comments permission (not just instagram_basic)
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccount.account_id}/tags?fields=id,caption,media_url,media_type,timestamp,username,permalink&limit=30&access_token=${igAccount.access_token}`
    );

    if (!igRes.ok) {
      const errBody = await igRes.text();
      console.error('Instagram API error:', errBody);
      // Return empty rather than failing — might be permission issue
      return new Response(JSON.stringify({ posts: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const igData = await igRes.json();
    const posts = (igData.data ?? []).map((p: any) => ({
      id: p.id,
      caption: p.caption ?? null,
      media_url: p.media_url ?? '',
      media_type: p.media_type ?? 'IMAGE',
      timestamp: p.timestamp,
      username: p.username ?? 'unknown',
      permalink: p.permalink ?? '',
    }));

    return new Response(JSON.stringify({ posts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('UGC fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
