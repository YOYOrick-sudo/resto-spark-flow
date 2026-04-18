import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAI, callAIWithTools, resolveOrgId } from '../_shared/ai.ts';
import { isOpenAt, getSchedule, type OperatingDayRow } from '../_shared/operating-hours.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

interface OperatingHoursContext {
  isOpenNow: boolean;
  nextOpening: { date: string; open_time: string; label: string | null } | null;
  schedule14d: OperatingDayRow[];
  timezone: string;
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
  organizationId: string;
  operatingHours: OperatingHoursContext;
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
    if (now - entry.lastAt < 2000) {
      return { allowed: false, reason: 'Too fast' };
    }
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
    supabase.from('locations').select('name, tone_of_voice, guest_greeting, description_short, timezone')
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
      supabase.from('reservations')
        .select('id, reservation_date, start_time, party_size, status, guest_notes, manage_token')
        .eq('customer_id', conversation.customer_id)
        .eq('location_id', input.location_id)
        .gte('reservation_date', new Date().toISOString().split('T')[0])
        .order('reservation_date', { ascending: true })
        .limit(5),
    ]);
    customer = custRes.data;
    upcomingReservations = resRes.data || [];
  }

  const organizationId = await resolveOrgId(input.location_id);

  // Operating hours context (14d schedule + isOpenNow)
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const in14dIso = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  const [isOpenNow, schedule14d] = await Promise.all([
    isOpenAt(supabase, input.location_id, now.toISOString(), 'general'),
    getSchedule(supabase, input.location_id, todayIso, in14dIso, 'general'),
  ]);

  // Bereken eerstvolgende opening (eerste !is_closed met open_time in de toekomst)
  const nowHHMM = now.toTimeString().slice(0, 5);
  let nextOpening: OperatingHoursContext['nextOpening'] = null;
  for (const row of schedule14d) {
    if (row.is_closed || !row.open_time) continue;
    const isFuture = row.date > todayIso || (row.date === todayIso && row.open_time.slice(0, 5) > nowHHMM);
    if (isFuture) {
      nextOpening = { date: row.date, open_time: row.open_time.slice(0, 5), label: row.label };
      break;
    }
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
    organizationId,
    operatingHours: {
      isOpenNow,
      nextOpening,
      schedule14d,
      timezone: (brandRes.data as any)?.timezone || 'Europe/Amsterdam',
    },
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
    const result = await callAIWithTools({
      featureKey: 'ai_respond_intent',
      organizationId: ctx.organizationId,
      locationId: ctx.locationId,
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
      toolChoice: { type: 'function', function: { name: 'classify_intent' } },
      temperature: 0,
    });

    if (result.toolCalls?.length) {
      return result.toolCalls[0].arguments;
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

  const recentOutbound = ctx.messages.slice(-6)
    .filter(m => m.direction === 'outbound' && m.is_ai_generated)
    .filter(m => m.content?.includes('niet helemaal') || m.content?.includes('even doorverbinden'));
  if (recentOutbound.length >= 3) {
    return { escalate: true, tone: 'honest', reason: 'Meerdere keren niet begrepen' };
  }

  return { escalate: false };
}

function getEscalationMessage(tone: string, config: any, _branding: any): string {
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

  if (toolName === 'create_reservation') {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/public-booking-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          route: 'book',
          location_id: ctx.locationId,
          date: toolInput.date,
          start_time: toolInput.time,
          party_size: toolInput.party_size,
          first_name: ctx.customer?.first_name || toolInput.first_name || 'Gast',
          last_name: ctx.customer?.last_name || toolInput.last_name || '',
          email: ctx.customer?.email || toolInput.email || '',
          phone: ctx.customer?.phone_number || toolInput.phone || '',
          ticket_id: toolInput.ticket_id,
          channel: ctx.conversation.channel === 'whatsapp' ? 'whatsapp' : 'webchat',
          guest_notes: toolInput.notes || '',
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return { response: `Je reservering is bevestigd! ${toolInput.party_size} personen op ${toolInput.date} om ${toolInput.time}. Tot dan! 🎉` };
      }
      return { response: data.error || 'Er ging iets mis bij het aanmaken van de reservering. Probeer het opnieuw.' };
    } catch (err) {
      console.error('[AI-RESPOND] create_reservation error:', err);
      return { response: 'Er ging iets mis. Probeer het zo opnieuw.' };
    }
  }

  if (toolName === 'modify_reservation') {
    const reservation = ctx.upcomingReservations.find((r: any) => r.id === toolInput.reservation_id);
    if (!reservation?.manage_token) {
      return { response: 'Ik kan de reservering niet vinden om te wijzigen. Kun je meer details geven?' };
    }
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/public-booking-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          route: 'manage',
          token: reservation.manage_token,
          action: 'modify',
          new_date: toolInput.new_date || reservation.reservation_date,
          new_start_time: toolInput.new_time || reservation.start_time,
          new_party_size: toolInput.new_party_size || reservation.party_size,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return { response: `Je reservering is aangepast! De nieuwe details: ${toolInput.new_party_size || reservation.party_size} personen op ${toolInput.new_date || reservation.reservation_date} om ${toolInput.new_time || reservation.start_time}. ✅` };
      }
      return { response: data.error || 'Het wijzigen is helaas niet gelukt. Wil je dat ik een collega inschakel?' };
    } catch (err) {
      console.error('[AI-RESPOND] modify_reservation error:', err);
      return { response: 'Er ging iets mis bij het wijzigen. Ik schakel een collega in.' };
    }
  }

  if (toolName === 'cancel_reservation') {
    const reservation = ctx.upcomingReservations.find((r: any) => r.id === toolInput.reservation_id);
    if (!reservation?.manage_token) {
      return { response: 'Ik kan de reservering niet vinden om te annuleren. Kun je meer details geven?' };
    }
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/public-booking-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          route: 'manage',
          token: reservation.manage_token,
          action: 'cancel',
          cancellation_reason: toolInput.reason || 'Geannuleerd via chat',
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return { response: 'Je reservering is geannuleerd. Mocht je toch weer willen komen, boek gerust opnieuw!' };
      }
      return { response: data.error || 'Het annuleren is helaas niet gelukt. Ik schakel een collega in.' };
    } catch (err) {
      console.error('[AI-RESPOND] cancel_reservation error:', err);
      return { response: 'Er ging iets mis bij het annuleren. Ik schakel een collega in.' };
    }
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
  await supabase.rpc('increment_knowledge_hit', { question_text: question, loc_id: ctx.locationId });

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

// TODO: timezone-aware day-boundaries bij multi-land support (gebruik locations.timezone).
// Nu: server-tijd (UTC) = Nederland-day binnen ~2u marge. Edge case 23:45 CET kan
// "vandaag" verkeerd labelen. Acceptabel voor MVP / Pura Vida (NL-only).
function formatOperatingHours(oh: OperatingHoursContext, language: 'nl' | 'en'): string {
  const dayNamesNl = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = language === 'en' ? dayNamesEn : dayNamesNl;

  const status = oh.isOpenNow
    ? (language === 'en' ? 'Currently OPEN.' : 'Op dit moment GEOPEND.')
    : (language === 'en' ? 'Currently CLOSED.' : 'Op dit moment GESLOTEN.');

  const lines: string[] = [];
  for (const row of oh.schedule14d) {
    const d = new Date(row.date + 'T00:00:00Z');
    const dn = days[d.getUTCDay()];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    if (row.is_closed || !row.open_time || !row.close_time) {
      const closedWord = language === 'en' ? 'closed' : 'gesloten';
      lines.push(`  ${dn} ${dd}-${mm}: ${closedWord}${row.label ? ` (${row.label})` : ''}`);
    } else {
      lines.push(`  ${dn} ${dd}-${mm}: ${row.open_time.slice(0, 5)}–${row.close_time.slice(0, 5)}${row.label ? ` (${row.label})` : ''}`);
    }
  }

  let nextLine = '';
  if (oh.nextOpening) {
    const d = new Date(oh.nextOpening.date + 'T00:00:00Z');
    const dn = days[d.getUTCDay()];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    nextLine = language === 'en'
      ? `Next opening: ${dn} ${dd}-${mm} at ${oh.nextOpening.open_time}${oh.nextOpening.label ? ` (${oh.nextOpening.label})` : ''}.`
      : `Eerstvolgende opening: ${dn} ${dd}-${mm} om ${oh.nextOpening.open_time}${oh.nextOpening.label ? ` (${oh.nextOpening.label})` : ''}.`;
  }

  const header = language === 'en' ? 'OPENING HOURS:' : 'OPENINGSTIJDEN:';
  const usage = language === 'en'
    ? 'Use this exact data to answer hours-related questions. Never invent times.'
    : 'Gebruik deze exacte data om openingstijden-vragen te beantwoorden. Verzin nooit tijden.';

  return `${header}\n- ${status}\n${nextLine ? `- ${nextLine}\n` : ''}- ${language === 'en' ? 'Next 14 days' : 'Komende 14 dagen'}:\n${lines.join('\n')}\n${usage}`;
}

function buildDietInfo(customer: any): string {
  if (!customer?.dietary_preferences) return '';
  const prefs = customer.dietary_preferences;
  const parts: string[] = [];
  if (prefs.vegetarian) parts.push('Vegetarisch');
  if (prefs.vegan) parts.push('Veganistisch');
  if (prefs.allergies?.length) parts.push(`allergieën: ${prefs.allergies.join(', ')}`);
  if (prefs.other) parts.push(prefs.other);
  return parts.length > 0 ? `Dieet: ${parts.join(', ')}` : '';
}

function buildSystemPrompt(ctx: Context, language: 'nl' | 'en'): string {
  const tone = getSystemPromptTone(ctx.branding.tone_of_voice);
  const dietInfo = buildDietInfo(ctx.customer);
  const customerInfo = ctx.customer ? `
GAST: ${ctx.customer.first_name || 'Onbekende gast'}${ctx.customer.last_name ? ` ${ctx.customer.last_name}` : ''}
${ctx.customer.phone_number ? `Tel: ${ctx.customer.phone_number}` : ''}
${ctx.customer.email ? `Email: ${ctx.customer.email}` : ''}
Bezoeken: ${ctx.customer.total_visits || 0}
${dietInfo}
${ctx.customer.notes ? `Notities: ${ctx.customer.notes}` : ''}
${ctx.customer.total_visits > 5 ? 'Dit is een vaste gast.' : ''}` : '';

  const kbSection = ctx.knowledgeBase.length > 0
    ? ctx.knowledgeBase.map(kb => `V: ${kb.question || kb.category}\nA: ${kb.answer}`).join('\n\n')
    : 'Geen kennisbank beschikbaar.';

  const langInstruction = language === 'en' ? 'Antwoord in het Engels.' : 'Antwoord in het Nederlands.';

  const reservationSection = ctx.upcomingReservations.length > 0
    ? `\nRESERVERINGEN VAN DEZE GAST:\n${ctx.upcomingReservations.map(r =>
        `- ${r.reservation_date} om ${r.start_time?.slice(0, 5)}, ${r.party_size} personen (${r.status})${r.guest_notes ? ` — ${r.guest_notes}` : ''}`
      ).join('\n')}\nGebruik deze info als de gast vraagt over een bestaande reservering. Benoem de specifieke reservering bij wijzigings- of annuleringsverzoeken.`
    : '';

  const operatingHoursSection = formatOperatingHours(ctx.operatingHours, language);

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

${operatingHoursSection}

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
    const result = await callAI({
      featureKey: 'ai_respond_generate',
      organizationId: ctx.organizationId,
      locationId: ctx.locationId,
      messages,
      maxTokens: 500,
      temperature: 0.7,
    });
    return result.text || 'Even geduld, ik kom zo bij je terug.';
  } catch (err) {
    console.error('[AI-RESPOND] Generation failed:', err);
    return 'Even geduld, ik kom zo bij je terug.';
  }
}

// ─── RESPONSE WITH TOOL CALLING ───

const bookingTools = [
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description: 'Check beschikbaarheid voor een datum en groepsgrootte.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Datum in YYYY-MM-DD formaat' },
          party_size: { type: 'number', description: 'Aantal personen' },
        },
        required: ['date', 'party_size'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_reservation',
      description: 'Maak een nieuwe reservering aan.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Datum in YYYY-MM-DD formaat' },
          time: { type: 'string', description: 'Tijdstip in HH:MM formaat' },
          party_size: { type: 'number', description: 'Aantal personen' },
          first_name: { type: 'string', description: 'Voornaam van de gast' },
          last_name: { type: 'string', description: 'Achternaam van de gast' },
          notes: { type: 'string', description: 'Opmerkingen van de gast' },
        },
        required: ['date', 'time', 'party_size'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'modify_reservation',
      description: 'Wijzig een bestaande reservering.',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: { type: 'string', description: 'ID van de reservering' },
          new_date: { type: 'string', description: 'Nieuwe datum (YYYY-MM-DD)' },
          new_time: { type: 'string', description: 'Nieuw tijdstip (HH:MM)' },
          new_party_size: { type: 'number', description: 'Nieuw aantal personen' },
        },
        required: ['reservation_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_reservation',
      description: 'Annuleer een bestaande reservering.',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: { type: 'string', description: 'ID van de reservering' },
          reason: { type: 'string', description: 'Reden voor annulering' },
        },
        required: ['reservation_id'],
      },
    },
  },
];

async function generateResponseWithTools(ctx: Context, intent: Intent, extraContext?: string): Promise<string> {
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
    // Step 1: Ask AI what tool to call
    const result = await callAIWithTools({
      featureKey: 'ai_respond_tools',
      organizationId: ctx.organizationId,
      locationId: ctx.locationId,
      messages,
      tools: bookingTools,
      temperature: 0.3,
      maxTokens: 500,
    });

    // If AI responds with text (no tool call), return that
    if (!result.toolCalls?.length) {
      return result.text || 'Even geduld, ik kom zo bij je terug.';
    }

    // Step 2: Execute the tool
    const toolCall = result.toolCalls[0];
    const toolName = toolCall.name;
    const toolInput = toolCall.arguments;
    console.log(`[AI-RESPOND] Tool call: ${toolName}`, toolInput);

    const toolResult = await executeBookingTool(toolName, toolInput, ctx);

    if (toolResult.escalate) {
      return toolResult.reason || 'Ik schakel een collega in om je verder te helpen.';
    }

    if (toolResult.pending) {
      return await generateResponse(ctx, intent, 'De actie moet eerst goedgekeurd worden door een collega. Laat de gast vriendelijk weten dat je het doorgeeft en dat er snel een reactie volgt.');
    }

    // Step 3: Feed tool result back to AI for a natural response
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: toolCall.id, type: 'function', function: { name: toolName, arguments: JSON.stringify(toolInput) } }],
    });
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResult.response || 'Actie uitgevoerd.',
    });

    try {
      const followup = await callAI({
        featureKey: 'ai_respond_tool_followup',
        organizationId: ctx.organizationId,
        locationId: ctx.locationId,
        messages,
        maxTokens: 500,
        temperature: 0.7,
      });
      return followup.text || toolResult.response || 'Even geduld, ik kom zo bij je terug.';
    } catch {
      return toolResult.response || 'Even geduld, ik kom zo bij je terug.';
    }
  } catch (err) {
    console.error('[AI-RESPOND] Tool-calling failed:', err);
    return 'Even geduld, ik kom zo bij je terug.';
  }
}

// ─── SEND RESPONSE ───

async function sendResponse(ctx: Context, content: string) {
  await supabase.from('messages').insert({
    conversation_id: ctx.conversation.id,
    location_id: ctx.locationId,
    channel: ctx.conversation.channel,
    direction: 'outbound',
    message_type: 'text',
    content,
    is_ai_generated: true,
  });

  await supabase.from('conversations').update({
    last_message_at: new Date().toISOString(),
  }).eq('id', ctx.conversation.id);

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

  await sendResponse(ctx, message);

  await supabase.from('conversations').update({
    handled_by: 'operator',
    status: 'escalated',
  }).eq('id', ctx.conversation.id);

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

  try {
    const input: AiRespondInput = await req.json();
    if (!input.conversation_id || !input.location_id) {
      return json({ error: 'conversation_id and location_id required' }, 400);
    }

    // Rate limit
    const rl = checkRateLimit(input.conversation_id);
    if (!rl.allowed) {
      if (rl.reason === 'Daily limit reached') {
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
      return json({ success: true, type: 'auto_reply' });
    }

    // Classify intent
    const intent = await classifyIntent(ctx);
    console.log(`[AI-RESPOND] Intent: ${intent.type}/${intent.subtype} (${intent.confidence})`);

    // Escalation check
    const esc = shouldEscalate(content, intent, ctx);
    if (esc.escalate) {
      await escalateConversation(ctx, esc.reason!, esc.tone!);
      return json({ success: true, type: 'escalation', reason: esc.reason });
    }

    // Route by intent type
    let responseText: string;

    switch (intent.type) {
      case 'booking': {
        const resInfo = ctx.upcomingReservations.map(r =>
          `${r.reservation_date} om ${r.start_time?.slice(0, 5)}, ${r.party_size}p (${r.status})`
        ).join('; ');

        if (intent.subtype === 'new') {
          responseText = await generateResponseWithTools(ctx, intent,
            'De gast wil een reservering maken. Gebruik check_availability om beschikbaarheid te checken en create_reservation om de boeking te maken. Vraag naar datum, tijd en aantal personen als die info ontbreekt.');
        } else if (intent.subtype === 'status') {
          const resContext = resInfo
            ? `De gast heeft deze reserveringen: ${resInfo}. Geef de status.`
            : 'Er zijn geen aankomende reserveringen gevonden voor deze gast. Vraag om meer details.';
          responseText = await generateResponse(ctx, intent, resContext);
        } else if (intent.subtype === 'modify') {
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
            responseText = await generateResponseWithTools(ctx, intent,
              resContext + ' Gebruik modify_reservation om de wijziging door te voeren. Benoem welke reservering je gaat wijzigen.');
          }
        } else if (intent.subtype === 'cancel') {
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
            responseText = await generateResponseWithTools(ctx, intent,
              resContext + ' Gebruik cancel_reservation om te annuleren. Benoem welke reservering je gaat annuleren.');
          }
        } else {
          responseText = await generateResponse(ctx, intent);
        }
        break;
      }

      case 'faq': {
        const kbAnswer = searchKnowledgeBase(content, ctx.knowledgeBase);
        if (kbAnswer) {
          responseText = await generateResponse(ctx, intent, `Antwoord uit kennisbank: ${kbAnswer}`);
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
        responseText = await generateResponse(ctx, intent);
        break;
      }
    }

    // Send the response
    await sendResponse(ctx, responseText);

    return json({ success: true, type: intent.type, subtype: intent.subtype });
  } catch (err) {
    console.error('[AI-RESPOND] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
