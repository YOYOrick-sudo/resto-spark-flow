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

// ─── TYPES ───

interface AiRespondInput {
  conversation_id: string;
  message_id: string;
  location_id: string;
}

interface Context {
  conversation: any;
  messages: any[];
  customer: any;
  config: any;
  branding: any;
  knowledgeBase: any[];
  upcomingReservations: any[];
  locationId: string;
}

interface Intent {
  type: string;
  subtype: string;
  confidence: number;
}

// ─── RATE LIMITING ───

const recentResponses = new Map<string, { count: number; lastAt: number }>();

function checkRateLimit(conversationId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const entry = recentResponses.get(conversationId);

  if (entry) {
    // Max 1 response per 2 seconds
    if (now - entry.lastAt < 2000) {
      return { allowed: false, reason: 'Too fast' };
    }
    // Max 50 per day (reset every 24h)
    if (now - entry.lastAt > 86400000) {
      recentResponses.set(conversationId, { count: 1, lastAt: now });
      return { allowed: true };
    }
    if (entry.count >= 50) {
      return { allowed: false, reason: 'Daily limit reached' };
    }
    entry.count++;
    entry.lastAt = now;
  } else {
    recentResponses.set(conversationId, { count: 1, lastAt: now });
  }
  return { allowed: true };
}

// ─── CONTEXT LOADING ───

async function loadContext(input: AiRespondInput): Promise<Context> {
  const [convRes, msgsRes, configRes, brandRes, kbRes] = await Promise.all([
    supabase.from('conversations').select('*').eq('id', input.conversation_id).single(),
    supabase.from('messages').select('direction, content, is_ai_generated, created_at')
      .eq('conversation_id', input.conversation_id)
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('messaging_config').select('*').eq('location_id', input.location_id).maybeSingle(),
    supabase.from('locations').select('name, tone_of_voice, guest_greeting, description_short')
      .eq('id', input.location_id).single(),
    supabase.from('knowledge_base').select('category, question, answer')
      .eq('location_id', input.location_id).eq('is_active', true),
  ]);

  const conversation = convRes.data;
  let customer = null;
  let upcomingReservations: any[] = [];
  if (conversation?.customer_id) {
    const [custRes, resRes] = await Promise.all([
      supabase.from('customers').select('*')
        .eq('id', conversation.customer_id).single(),
      supabase.from('reservations').select('id, date, time, party_size, status, notes')
        .eq('customer_id', conversation.customer_id)
        .eq('location_id', input.location_id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5),
    ]);
    customer = custRes.data;
    upcomingReservations = resRes.data || [];
  }

  return {
    conversation,
    messages: (msgsRes.data || []).reverse(),
    customer,
    config: configRes.data || {},
    branding: brandRes.data || {},
    knowledgeBase: kbRes.data || [],
    upcomingReservations,
    locationId: input.location_id,
  };
}

// ─── ACTIVE WINDOW CHECK ───

function parseTime(t: string): number {
  const [h, m] = (t || '08:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function checkActiveWindow(config: any, messageContent: string): { outsideWindow: boolean; autoReply?: string } {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(config.active_window_start || '08:00');
  const end = parseTime(config.active_window_end || '00:00');
  const endMin = end === 0 ? 1440 : end;
  const outside = current < start || current >= endMin;

  if (!outside) return { outsideWindow: false };

  // Reservation keywords bypass window
  const keywords = ['reserv', 'boek', 'tafel', 'book', 'table', 'annul', 'cancel', 'wijzig', 'change', 'modify'];
  if (keywords.some(kw => messageContent.toLowerCase().includes(kw))) {
    return { outsideWindow: false };
  }

  return {
    outsideWindow: true,
    autoReply: config.outside_window_reply || 'Bedankt voor je bericht! We reageren morgenochtend. Wil je een reservering maken? Dat kan altijd!',
  };
}

// ─── INTENT CLASSIFICATION ───

async function classifyIntent(ctx: Context): Promise<Intent> {
  const lastMessage = ctx.messages[ctx.messages.length - 1];
  const recentContext = ctx.messages.slice(-3).map(m => `${m.direction}: ${m.content}`).join('\n');

  try {
    const resp = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'system',
          content: `Classificeer het bericht van een restaurantgast. Gebruik de tool classify_intent om het resultaat te geven.

Context (laatste 3 berichten):
${recentContext}`,
        }, {
          role: 'user',
          content: lastMessage?.content || '',
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'classify_intent',
            description: 'Classificeer de intent van een gastbericht.',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['booking', 'faq', 'custom_request', 'greeting', 'complaint', 'escalate', 'unclear'] },
                subtype: { type: 'string', enum: ['new', 'modify', 'cancel', 'status', 'menu', 'hours', 'facilities', 'parking', 'allergies', 'general', 'private_event', 'special_menu', 'large_group', 'other'] },
                confidence: { type: 'number' },
              },
              required: ['type', 'subtype', 'confidence'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'classify_intent' } },
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      console.error('[AI-RESPOND] Classification error:', resp.status);
      return { type: 'unclear', subtype: 'other', confidence: 0 };
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    return { type: 'unclear', subtype: 'other', confidence: 0 };
  } catch (err) {
    console.error('[AI-RESPOND] Classification failed:', err);
    return { type: 'unclear', subtype: 'other', confidence: 0 };
  }
}

// ─── ESCALATION CHECK ───

function shouldEscalate(content: string, intent: Intent, ctx: Context): { escalate: boolean; tone?: string; reason?: string } {
  const lc = content.toLowerCase();

  const personKeywords = ['iemand spreken', 'een persoon', 'medewerker', 'manager', 'speak to someone', 'human', 'real person'];
  if (personKeywords.some(kw => lc.includes(kw))) {
    return { escalate: true, tone: 'neutral', reason: 'Gast wil een persoon spreken' };
  }

  if (intent.type === 'complaint') {
    return { escalate: true, tone: 'empathetic', reason: 'Gast lijkt ontevreden' };
  }

  if (intent.type === 'custom_request') {
    return { escalate: true, tone: 'enthusiastic', reason: 'Maatwerk verzoek' };
  }

  // 3+ fallbacks
  const recentOutbound = ctx.messages.slice(-6)
    .filter(m => m.direction === 'outbound' && m.is_ai_generated)
    .filter(m => m.content?.includes('niet helemaal') || m.content?.includes('even doorverbinden'));
  if (recentOutbound.length >= 3) {
    return { escalate: true, tone: 'honest', reason: 'Meerdere keren niet begrepen' };
  }

  return { escalate: false };
}

function getEscalationMessage(tone: string, config: any, branding: any): string {
  switch (tone) {
    case 'empathetic':
      return 'Ik begrijp dat dit vervelend is. Ik schakel je door naar een collega die je verder kan helpen.';
    case 'enthusiastic':
      return 'Wat een leuk idee! Dit is iets wat we graag persoonlijk met je bespreken. Een collega neemt zo contact met je op.';
    case 'honest':
      return 'Ik merk dat ik je niet helemaal goed begrijp. Laat me een collega erbij halen die je beter kan helpen.';
    default:
      return config.escalation_message || 'Een moment, ik schakel je door naar een collega.';
  }
}

// ─── AUTONOMY CHECK ───

async function checkAutonomy(locationId: string, taskKey: string): Promise<{ autonomy_level: string; is_enabled: boolean }> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/check-autonomy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ location_id: locationId, task_key: taskKey }),
    });
    return await resp.json();
  } catch {
    return { autonomy_level: 'recommend', is_enabled: true };
  }
}

// ─── TOOL EXECUTION ───

async function executeBookingTool(toolName: string, toolInput: any, ctx: Context): Promise<{ response?: string; pending?: boolean; escalate?: boolean; reason?: string }> {
  const taskKeyMap: Record<string, string | null> = {
    check_availability: null,
    create_reservation: 'whatsapp_create_reservation',
    modify_reservation: 'whatsapp_modify_reservation',
    cancel_reservation: 'whatsapp_cancel_reservation',
  };

  const taskKey = taskKeyMap[toolName];

  if (taskKey) {
    const autonomy = await checkAutonomy(ctx.locationId, taskKey);
    if (!autonomy.is_enabled) {
      return { escalate: true, reason: 'Functie uitgeschakeld door management' };
    }
    if (autonomy.autonomy_level === 'recommend') {
      await supabase.from('agent_actions').insert({
        location_id: ctx.locationId,
        action_type: toolName,
        title: getToolTitle(toolName, toolInput, ctx),
        beschrijving: getToolDescription(toolName, toolInput, ctx),
        status: 'concept',
        action_data: { tool: toolName, input: toolInput, conversation_id: ctx.conversation.id, customer_id: ctx.customer?.id },
      });
      return { pending: true };
    }
  }

  // Large party check
  if (toolName === 'create_reservation' && toolInput.party_size > (ctx.config.large_party_threshold || 8)) {
    await supabase.from('agent_actions').insert({
      location_id: ctx.locationId,
      action_type: toolName,
      title: `Grote groep: ${toolInput.party_size} personen`,
      beschrijving: `${ctx.customer?.first_name || 'Een gast'} wil reserveren voor ${toolInput.party_size} personen. Dat is boven de drempel van ${ctx.config.large_party_threshold || 8}.`,
      status: 'concept',
      action_data: { tool: toolName, input: toolInput, conversation_id: ctx.conversation.id, customer_id: ctx.customer?.id },
    });
    return { pending: true };
  }

  // Execute the tool
  if (toolName === 'check_availability') {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ location_id: ctx.locationId, date: toolInput.date, party_size: toolInput.party_size }),
      });
      const data = await resp.json();
      const availableSlots = data.shifts?.flatMap((s: any) => s.slots?.filter((sl: any) => sl.available)) || [];
      if (availableSlots.length === 0) {
        return { response: `Er zijn helaas geen beschikbare tijdslots op ${toolInput.date} voor ${toolInput.party_size} personen.` };
      }
      const times = availableSlots.slice(0, 5).map((s: any) => s.time).join(', ');
      return { response: `Er zijn plekken beschikbaar op ${toolInput.date}! Mogelijke tijden: ${times}. Welk tijdstip past je het best?` };
    } catch (err) {
      console.error('[AI-RESPOND] check_availability error:', err);
      return { response: 'Ik kon de beschikbaarheid even niet checken. Probeer het zo opnieuw.' };
    }
  }

  // For create/modify/cancel we call public-booking-api
  // These require a reservation context; for now we provide a helpful message
  if (toolName === 'create_reservation') {
    return { response: `Ik maak een reservering voor je: ${toolInput.party_size} personen op ${toolInput.date} om ${toolInput.time}. Een moment...` };
  }
  if (toolName === 'modify_reservation') {
    return { response: `Ik pas je reservering aan. Even geduld...` };
  }
  if (toolName === 'cancel_reservation') {
    return { response: `Ik annuleer je reservering. Even geduld...` };
  }

  return { response: 'Ik ga dit voor je regelen.' };
}

function getToolTitle(tool: string, input: any, ctx: Context): string {
  const name = ctx.customer?.first_name || 'Een gast';
  switch (tool) {
    case 'create_reservation': return `${name} wil reserveren voor ${input.party_size} personen`;
    case 'modify_reservation': return `${name} wil de reservering wijzigen`;
    case 'cancel_reservation': return `${name} wil de reservering annuleren`;
    default: return `Actie: ${tool}`;
  }
}

function getToolDescription(tool: string, input: any, ctx: Context): string {
  const name = ctx.customer?.first_name || 'Een gast';
  switch (tool) {
    case 'create_reservation': return `${name} wil een tafel voor ${input.party_size} op ${input.date}${input.time ? ` om ${input.time}` : ''}. Wil je dit goedkeuren?`;
    case 'modify_reservation': return `${name} wil de reservering aanpassen${input.new_party_size ? ` naar ${input.new_party_size} personen` : ''}${input.new_date ? ` op ${input.new_date}` : ''}. Goedkeuren?`;
    case 'cancel_reservation': return `${name} wil annuleren${input.reason ? `: "${input.reason}"` : ''}. Goedkeuren?`;
    default: return `Actie ${tool} door de Assistent.`;
  }
}

// ─── KNOWLEDGE BASE LOOKUP ───

function searchKnowledgeBase(query: string, kb: any[]): string | null {
  const lc = query.toLowerCase();
  for (const entry of kb) {
    const questionMatch = entry.question && lc.includes(entry.question.toLowerCase().split(' ').slice(0, 3).join(' '));
    const categoryMatch = lc.includes(entry.category.toLowerCase());
    if (questionMatch || categoryMatch) {
      return entry.answer;
    }
  }
  return null;
}

// ─── GAP DETECTION ───

async function handleUnknownFaq(ctx: Context, question: string): Promise<string> {
  // Use RPC to upsert hit_count
  await supabase.rpc('increment_knowledge_hit', { question_text: question, loc_id: ctx.locationId });

  // Create card on Overview
  await supabase.from('agent_actions').insert({
    location_id: ctx.locationId,
    action_type: 'knowledge_gap',
    title: `Gast vroeg: "${question.slice(0, 80)}"`,
    beschrijving: 'Dit staat niet in je kennisbank. Wil je een antwoord toevoegen?',
    status: 'concept',
    action_data: { question, category: 'onbeantwoord' },
  });

  return 'Goede vraag! Dat heb ik even niet paraat. Ik vraag het na en laat het je weten.';
}

// ─── LANGUAGE DETECTION ───

function detectLanguage(content: string): 'nl' | 'en' {
  const englishWords = /\b(the|is|are|have|can|would|like|please|table|reservation|book|cancel|hello|hi|thanks|thank)\b/i;
  return englishWords.test(content) ? 'en' : 'nl';
}

// ─── SYSTEM PROMPT ───

function getSystemPromptTone(tone: string | null): string {
  switch (tone) {
    case 'formeel': return 'Je spreekt de gast aan met "u". Formeel maar warm. Geen emoji\'s.';
    case 'casual': return 'Je bent heel relaxed en informeel. "Je" en "jij". Max 1 emoji per bericht.';
    case 'informeel':
    default: return 'Je bent vriendelijk en informeel. "Je" en "jij". Max 1 emoji per bericht (of geen).';
  }
}

function buildSystemPrompt(ctx: Context, language: 'nl' | 'en'): string {
  const tone = getSystemPromptTone(ctx.branding.tone_of_voice);
  const allergies = ctx.customer?.dietary_preferences?.allergies;
  const customerInfo = ctx.customer ? `
GAST: ${ctx.customer.first_name || 'Onbekende gast'}
Bezoeken: ${ctx.customer.total_visits || 0}
${allergies?.length ? `Allergieën: ${allergies.join(', ')}` : ''}
${ctx.customer.total_visits > 5 ? 'Dit is een vaste gast.' : ''}` : '';

  const kbSection = ctx.knowledgeBase.length > 0
    ? ctx.knowledgeBase.map(kb => `V: ${kb.question || kb.category}\nA: ${kb.answer}`).join('\n\n')
    : 'Geen kennisbank beschikbaar.';

  const langInstruction = language === 'en' ? 'Antwoord in het Engels.' : 'Antwoord in het Nederlands.';

  const reservationSection = ctx.upcomingReservations.length > 0
    ? `\nRESERVERINGEN VAN DEZE GAST:\n${ctx.upcomingReservations.map(r =>
        `- ${r.date} om ${r.time}, ${r.party_size} personen (${r.status})${r.notes ? ` — ${r.notes}` : ''}`
      ).join('\n')}`
    : '';

  return `Je bent een medewerker van ${ctx.branding.name || 'het restaurant'}.
${ctx.branding.description_short ? `Over het restaurant: ${ctx.branding.description_short}` : ''}

${tone}

REGELS:
- Je klinkt als een vriendelijke collega, NIET als een robot of AI.
- Je bent behulpzaam, warm, en beknopt.
- Noem de gast bij voornaam als je die hebt.
- Als je iets niet weet: zeg dat eerlijk. Niet verzinnen.
- Bij maatwerk/complexe verzoeken: "Leuk idee! Ik laat een collega contact opnemen."
- Stel geen onnodige vragen — als je genoeg info hebt, handel direct.
- Als de gast expliciet vraagt of je een mens bent: "Ik ben de digitale assistent van ${ctx.branding.name || 'het restaurant'}. Wil je liever met een collega spreken?"
- Als de gast een reservering wil wijzigen/annuleren, benoem welke reservering je gevonden hebt en bevestig.
- ${langInstruction}

${customerInfo}
${reservationSection}

KENNISBANK:
${kbSection}`;
}

// ─── RESPONSE GENERATION ───

async function generateResponse(ctx: Context, intent: Intent, extraContext?: string): Promise<string> {
  const lastMessage = ctx.messages[ctx.messages.length - 1];
  const language = detectLanguage(lastMessage?.content || '');
  const systemPrompt = buildSystemPrompt(ctx, language);

  const conversationMessages = ctx.messages.map(m => ({
    role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: m.content || '',
  }));

  const messages: any[] = [
    { role: 'system', content: systemPrompt + (extraContext ? `\n\nADDITIONELE CONTEXT:\n${extraContext}` : '') },
    ...conversationMessages,
  ];

  try {
    const resp = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[AI-RESPOND] Generation error:', resp.status, err);
      return 'Even geduld, ik kom zo bij je terug.';
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'Even geduld, ik kom zo bij je terug.';
  } catch (err) {
    console.error('[AI-RESPOND] Generation failed:', err);
    return 'Even geduld, ik kom zo bij je terug.';
  }
}

// ─── SEND RESPONSE ───

async function sendResponse(ctx: Context, content: string) {
  // Insert outbound message
  await supabase.from('messages').insert({
    conversation_id: ctx.conversation.id,
    location_id: ctx.locationId,
    channel: ctx.conversation.channel,
    direction: 'outbound',
    message_type: 'text',
    content,
    is_ai_generated: true,
  });

  // Update conversation
  await supabase.from('conversations').update({
    last_message_at: new Date().toISOString(),
  }).eq('id', ctx.conversation.id);

  // If WhatsApp, actually send via send-whatsapp
  if (ctx.conversation.channel === 'whatsapp' && ctx.conversation.channel_contact_id) {
    await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        location_id: ctx.locationId,
        phone_number: `+${ctx.conversation.channel_contact_id}`,
        message_type: 'text',
        text_body: content,
        conversation_id: ctx.conversation.id,
      }),
    });
  }
}

// ─── ESCALATE ───

async function escalateConversation(ctx: Context, reason: string, tone: string) {
  const message = getEscalationMessage(tone, ctx.config, ctx.branding);

  // Send escalation message to guest
  await sendResponse(ctx, message);

  // Update conversation status
  await supabase.from('conversations').update({
    handled_by: 'operator',
    status: 'escalated',
  }).eq('id', ctx.conversation.id);

  // Create card
  const customerName = ctx.customer?.first_name || 'Een gast';
  let cardText: string;
  switch (reason) {
    case 'Gast lijkt ontevreden':
      cardText = `💬 ${customerName} lijkt niet helemaal tevreden. Kun je even meekijken?`;
      break;
    case 'Maatwerk verzoek':
      cardText = `💬 ${customerName} heeft een speciaal verzoek. Dat is iets voor jou.`;
      break;
    case 'Gast wil een persoon spreken':
      cardText = `💬 ${customerName} wil graag iemand spreken.`;
      break;
    default:
      cardText = `💬 ${customerName} heeft een vraag waar ik niet uitkwam.`;
  }

  await supabase.from('agent_actions').insert({
    location_id: ctx.locationId,
    action_type: 'escalation',
    title: cardText,
    beschrijving: reason,
    status: 'concept',
    action_data: { conversation_id: ctx.conversation.id, customer_id: ctx.customer?.id, reason },
    referentie_id: ctx.conversation.id,
    referentie_type: 'conversation',
  });
}

// ─── MAIN HANDLER ───

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const startTime = Date.now();

  try {
    const input: AiRespondInput = await req.json();
    if (!input.conversation_id || !input.location_id) {
      return json({ error: 'conversation_id and location_id required' }, 400);
    }

    // Rate limit
    const rl = checkRateLimit(input.conversation_id);
    if (!rl.allowed) {
      if (rl.reason === 'Daily limit reached') {
        // Auto-escalate
        const ctx = await loadContext(input);
        await escalateConversation(ctx, 'Dagelijkse AI-limiet bereikt', 'honest');
      }
      return json({ skipped: true, reason: rl.reason });
    }

    // Load context
    const ctx = await loadContext(input);
    if (!ctx.conversation) return json({ error: 'Conversation not found' }, 404);

    const lastMessage = ctx.messages[ctx.messages.length - 1];
    if (!lastMessage || lastMessage.direction !== 'inbound') {
      return json({ skipped: true, reason: 'No inbound message' });
    }

    const content = lastMessage.content || '';

    // Active window check
    const windowCheck = checkActiveWindow(ctx.config, content);
    if (windowCheck.outsideWindow && windowCheck.autoReply) {
      await sendResponse(ctx, windowCheck.autoReply);
      await logAiCall(ctx.locationId, 'auto_reply', startTime, 'success');
      return json({ success: true, type: 'auto_reply' });
    }

    // Classify intent
    const intent = await classifyIntent(ctx);
    console.log(`[AI-RESPOND] Intent: ${intent.type}/${intent.subtype} (${intent.confidence})`);

    // Escalation check
    const esc = shouldEscalate(content, intent, ctx);
    if (esc.escalate) {
      await escalateConversation(ctx, esc.reason!, esc.tone!);
      await logAiCall(ctx.locationId, `escalation_${intent.type}`, startTime, 'success');
      return json({ success: true, type: 'escalation', reason: esc.reason });
    }

    // Route by intent type
    let responseText: string;

    switch (intent.type) {
      case 'booking': {
        // Determine the booking sub-action
        if (intent.subtype === 'new' || intent.subtype === 'status') {
          // Use AI to generate a helpful response about checking availability
          responseText = await generateResponse(ctx, intent, 'De gast wil een reservering maken of checken. Help ze met beschikbaarheid.');
        } else if (intent.subtype === 'modify') {
          const resInfo = ctx.upcomingReservations.map(r =>
            `${r.date} om ${r.time}, ${r.party_size}p (${r.status})`
          ).join('; ');
          const resContext = resInfo
            ? `De gast heeft deze reserveringen: ${resInfo}. Help met wijzigen. Benoem de gevonden reservering.`
            : 'Er zijn geen aankomende reserveringen gevonden voor deze gast. Vraag om meer details.';

          const autonomy = await checkAutonomy(ctx.locationId, 'whatsapp_modify_reservation');
          if (autonomy.autonomy_level === 'recommend') {
            await supabase.from('agent_actions').insert({
              location_id: ctx.locationId,
              action_type: 'modify_reservation',
              title: `${ctx.customer?.first_name || 'Gast'} wil reservering wijzigen`,
              beschrijving: resInfo ? `Huidige reservering: ${resInfo}. Verzoek: ${content.slice(0, 150)}` : content.slice(0, 200),
              status: 'concept',
              action_data: { conversation_id: ctx.conversation.id, customer_id: ctx.customer?.id, original_message: content, current_reservations: ctx.upcomingReservations },
            });
            responseText = await generateResponse(ctx, intent, resContext + ' De wijziging moet eerst goedgekeurd worden door een collega. Laat de gast weten dat je het doorgeeft.');
          } else {
            responseText = await generateResponse(ctx, intent, resContext);
          }
        } else if (intent.subtype === 'cancel') {
          const resInfo = ctx.upcomingReservations.map(r =>
            `${r.date} om ${r.time}, ${r.party_size}p (${r.status})`
          ).join('; ');
          const resContext = resInfo
            ? `De gast heeft deze reserveringen: ${resInfo}. Help met annuleren. Benoem de gevonden reservering.`
            : 'Er zijn geen aankomende reserveringen gevonden voor deze gast. Vraag om meer details.';

          const autonomy = await checkAutonomy(ctx.locationId, 'whatsapp_cancel_reservation');
          if (autonomy.autonomy_level === 'recommend') {
            await supabase.from('agent_actions').insert({
              location_id: ctx.locationId,
              action_type: 'cancel_reservation',
              title: `${ctx.customer?.first_name || 'Gast'} wil annuleren`,
              beschrijving: resInfo ? `Huidige reservering: ${resInfo}. Verzoek: ${content.slice(0, 150)}` : content.slice(0, 200),
              status: 'concept',
              action_data: { conversation_id: ctx.conversation.id, customer_id: ctx.customer?.id, original_message: content, current_reservations: ctx.upcomingReservations },
            });
            responseText = await generateResponse(ctx, intent, resContext + ' De annulering moet eerst goedgekeurd worden door een collega. Laat de gast weten dat je het doorgeeft.');
          } else {
            responseText = await generateResponse(ctx, intent, resContext);
          }
        } else {
          responseText = await generateResponse(ctx, intent);
        }
        break;
      }

      case 'faq': {
        // Search knowledge base
        const kbAnswer = searchKnowledgeBase(content, ctx.knowledgeBase);
        if (kbAnswer) {
          responseText = await generateResponse(ctx, intent, `Antwoord uit kennisbank: ${kbAnswer}`);
          // Increment hit count for analytics
        } else {
          responseText = await handleUnknownFaq(ctx, content);
        }
        break;
      }

      case 'greeting': {
        responseText = await generateResponse(ctx, intent, 'Begroet de gast hartelijk. Kort en bondig.');
        break;
      }

      case 'unclear': {
        responseText = await generateResponse(ctx, intent, 'Je begrijpt niet helemaal wat de gast bedoelt. Vraag vriendelijk door.');
        break;
      }

      default: {
        // custom_request, complaint, escalate handled by shouldEscalate above
        responseText = await generateResponse(ctx, intent);
        break;
      }
    }

    // Send the response
    await sendResponse(ctx, responseText);

    // Log
    await logAiCall(ctx.locationId, `messaging_${intent.type}`, startTime, 'success');

    return json({ success: true, type: intent.type, subtype: intent.subtype });
  } catch (err) {
    console.error('[AI-RESPOND] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

async function logAiCall(locationId: string, feature: string, startTime: number, status: string) {
  await supabase.from('ai_logs').insert({
    location_id: locationId,
    feature,
    model: 'gemini-3-flash-preview',
    latency_ms: Date.now() - startTime,
    status,
  });
}
