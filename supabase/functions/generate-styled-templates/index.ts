import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { location_id } = await req.json();
    if (!location_id) return json({ error: 'location_id required' }, 400);

    // Load branding
    const { data: location } = await supabase
      .from('locations')
      .select('name, tone_of_voice, description_short')
      .eq('id', location_id)
      .single();

    if (!location) return json({ error: 'Location not found' }, 404);

    // Load default templates
    const { data: templates } = await supabase
      .from('message_templates')
      .select('id, template_key, channel, body, subject')
      .eq('location_id', location_id)
      .eq('is_active', true);

    if (!templates || templates.length === 0) {
      return json({ error: 'No templates found' }, 404);
    }

    // Build prompt
    const templateList = templates.map(t =>
      `[${t.template_key} / ${t.channel}]\nSubject: ${t.subject || '(geen)'}\nBody: ${t.body}`
    ).join('\n\n---\n\n');

    const toneDesc = {
      formeel: 'Formeel — gebruik "u", geen emoji\'s, professioneel maar warm',
      informeel: 'Informeel — gebruik "je/jij", vriendelijk en warm, max 1 emoji',
      casual: 'Casual — relaxed, kort, speels, max 1 emoji',
    }[location.tone_of_voice || 'informeel'] || 'Informeel — gebruik "je/jij", vriendelijk';

    const resp = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{
          role: 'system',
          content: `Je bent een copywriter voor ${location.name || 'een restaurant'}.
${location.description_short ? `Over het restaurant: ${location.description_short}` : ''}

Stijl: ${toneDesc}

REGELS:
- Herschrijf elke template in de juiste stijl
- Placeholders ({{naam}}, {{datum}}, etc.) moeten EXACT intact blijven
- WhatsApp berichten: max 2-3 zinnen
- Email berichten: mogen iets langer maar bondig
- Klinkt als een mens, niet als een systeem
- Retourneer ALLEEN een JSON array met objecten: { "id": "...", "new_body": "...", "new_subject": "..." }`,
        }, {
          role: 'user',
          content: `Herschrijf deze templates:\n\n${templateList}`,
        }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[GENERATE-TEMPLATES] AI error:', resp.status, err);
      return json({ error: 'AI generation failed' }, 500);
    }

    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let previews: any[];
    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      previews = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error('[GENERATE-TEMPLATES] Failed to parse AI response:', rawContent);
      return json({ error: 'Failed to parse AI response' }, 500);
    }

    // Combine with original for side-by-side preview
    const result = templates.map(t => {
      const preview = previews.find((p: any) => p.id === t.id);
      return {
        id: t.id,
        template_key: t.template_key,
        channel: t.channel,
        original_body: t.body,
        original_subject: t.subject,
        new_body: preview?.new_body || t.body,
        new_subject: preview?.new_subject || t.subject,
      };
    });

    return json({ previews: result });
  } catch (err) {
    console.error('[GENERATE-TEMPLATES] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
