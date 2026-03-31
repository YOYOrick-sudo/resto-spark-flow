import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AutonomyResult {
  autonomy_level: 'recommend' | 'notify' | 'autonomous';
  is_enabled: boolean;
  configuration: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location_id, task_key } = await req.json();

    if (!location_id || !task_key) {
      return new Response(
        JSON.stringify({ error: 'location_id and task_key required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('agent_configurations')
      .select('autonomy_level, is_enabled, configuration')
      .eq('location_id', location_id)
      .eq('task_key', task_key)
      .single();

    if (error || !data) {
      // Default: recommend (safest option)
      const result: AutonomyResult = {
        autonomy_level: 'recommend',
        is_enabled: true,
        configuration: {},
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: AutonomyResult = {
      autonomy_level: data.autonomy_level as AutonomyResult['autonomy_level'],
      is_enabled: data.is_enabled ?? true,
      configuration: (data.configuration as Record<string, unknown>) || {},
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
