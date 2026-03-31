import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const VALID_ALLERGIES = [
  'gluten', 'schaaldieren', 'eieren', 'vis', 'pinda', 'soja',
  'lactose', 'noten', 'selderij', 'mosterd', 'sesam',
  'sulfieten', 'lupine', 'weekdieren',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const token = url.searchParams.get('token');
      if (!token) return json({ error: 'Token required' }, 400);

      const { data: reservation } = await supabase
        .from('reservations')
        .select('customer_id')
        .eq('manage_token', token)
        .single();

      if (!reservation?.customer_id) return json({ error: 'Invalid token' }, 403);

      const { data: customer } = await supabase
        .from('customers')
        .select('dietary_preferences')
        .eq('id', reservation.customer_id)
        .single();

      return json({ preferences: customer?.dietary_preferences || null });
    }

    if (req.method === 'POST') {
      const { manage_token, preferences } = await req.json();
      if (!manage_token) return json({ error: 'manage_token required' }, 400);

      const { data: reservation } = await supabase
        .from('reservations')
        .select('customer_id')
        .eq('manage_token', manage_token)
        .single();

      if (!reservation?.customer_id) return json({ error: 'Invalid token' }, 403);

      // Validate preferences structure
      const sanitized: Record<string, unknown> = {};
      if (preferences?.allergies && Array.isArray(preferences.allergies)) {
        sanitized.allergies = preferences.allergies.filter(
          (a: string) => typeof a === 'string' && VALID_ALLERGIES.includes(a)
        );
      } else {
        sanitized.allergies = [];
      }
      sanitized.vegetarian = !!preferences?.vegetarian;
      sanitized.vegan = !!preferences?.vegan;
      sanitized.other = typeof preferences?.other === 'string'
        ? preferences.other.slice(0, 500).trim()
        : '';

      const { error } = await supabase
        .from('customers')
        .update({ dietary_preferences: sanitized })
        .eq('id', reservation.customer_id);

      if (error) {
        console.error('[WEBCHAT-PREFS] Update error:', error);
        return json({ error: 'Failed to save preferences' }, 500);
      }

      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[WEBCHAT-PREFS] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
