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
  const isPreview = url.searchParams.get('preview') === 'true';
  const previewPopupId = url.searchParams.get('popup_id');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
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

    let config: any = null;

    if (isPreview && previewPopupId) {
      // Preview mode: fetch specific popup regardless of status
      const { data } = await supabaseAdmin
        .from('marketing_popup_config')
        .select('*')
        .eq('id', previewPopupId)
        .eq('location_id', location.id)
        .maybeSingle();
      config = data;
    } else {
      // Normal mode: fetch all active popups, apply schedule filter, pick highest priority
      const { data: allConfigs } = await supabaseAdmin
        .from('marketing_popup_config')
        .select('*')
        .eq('location_id', location.id)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (allConfigs && allConfigs.length > 0) {
        const now = new Date();
        // Find first config that passes schedule check (or has no schedule)
        config = allConfigs.find((c: any) => {
          if (isPreview) return true; // preview mode skips schedule
          if (c.schedule_start_at && c.schedule_end_at) {
            return now >= new Date(c.schedule_start_at) && now <= new Date(c.schedule_end_at);
          } else if (c.schedule_start_at) {
            return now >= new Date(c.schedule_start_at);
          } else if (c.schedule_end_at) {
            return now <= new Date(c.schedule_end_at);
          }
          return true; // no schedule = always active
        }) || null;
      }
    }

    if (!config) {
      return new Response(JSON.stringify({ is_active: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // In preview mode, always return as active
    if (isPreview && !config.is_active) {
      config.is_active = true;
    }

    if (!config.is_active) {
      return new Response(JSON.stringify({ is_active: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: brandKit } = await supabaseAdmin
      .from('marketing_brand_kit')
      .select('logo_url, primary_color, secondary_color')
      .eq('location_id', location.id)
      .maybeSingle();

    // Fetch featured ticket if set
    let featuredTicket = null;
    if (config.featured_ticket_id) {
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select('id, display_title, short_description, color')
        .eq('id', config.featured_ticket_id)
        .eq('status', 'active')
        .maybeSingle();
      if (ticket) featuredTicket = ticket;
    }

    return new Response(JSON.stringify({
      is_active: true,
      popup_type: config.popup_type || 'newsletter',
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
      custom_button_url: config.custom_button_url || null,
      schedule_start_at: config.schedule_start_at || null,
      schedule_end_at: config.schedule_end_at || null,
      logo_url: brandKit?.logo_url || null,
      primary_color: brandKit?.primary_color || '#1d979e',
      restaurant_name: location.name,
      featured_ticket: featuredTicket,
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
