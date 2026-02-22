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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Lookup location by slug
    const { data: location, error: locErr } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (locErr || !location) {
      return new Response(JSON.stringify({ error: 'Location not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch popup config
    const { data: config } = await supabaseAdmin
      .from('marketing_popup_config')
      .select('*')
      .eq('location_id', location.id)
      .maybeSingle();

    if (!config || !config.is_active) {
      return new Response(JSON.stringify({ is_active: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch brand kit
    const { data: brandKit } = await supabaseAdmin
      .from('marketing_brand_kit')
      .select('logo_url, primary_color, secondary_color')
      .eq('location_id', location.id)
      .maybeSingle();

    return new Response(JSON.stringify({
      is_active: config.is_active,
      exit_intent_enabled: config.exit_intent_enabled,
      timed_popup_enabled: config.timed_popup_enabled,
      timed_popup_delay_seconds: config.timed_popup_delay_seconds,
      sticky_bar_enabled: config.sticky_bar_enabled,
      sticky_bar_position: config.sticky_bar_position,
      headline: config.headline,
      description: config.description,
      button_text: config.button_text,
      success_message: config.success_message,
      gdpr_text: config.gdpr_text,
      logo_url: brandKit?.logo_url || null,
      primary_color: brandKit?.primary_color || '#1d979e',
      restaurant_name: location.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POPUP-CONFIG] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
