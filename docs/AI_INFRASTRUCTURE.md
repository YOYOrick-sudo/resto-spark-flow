# Nesto AI Infrastructure

> Upload dit als project knowledge in Lovable. Dit document beschrijft HOE AI technisch werkt in Nesto. Raadpleeg dit bij elke fase die AI-kolommen, Edge Functions, of LLM-calls bevat.

## Architectuur: Drie Lagen

Nesto gebruikt een hybrid AI-architectuur met drie lagen. Elke laag wordt alleen gebruikt als de vorige onvoldoende is.

```
Laag 0: PostgreSQL (gratis, <1ms)
  → SQL functies, triggers, window functions, pg_trgm, pgvector
  → Geschikt voor: risicoscores, forecasts, aggregaties, fuzzy search

Laag 1: Goedkoop LLM (GPT-4o-mini / GPT-4.1-nano, ~€0.0002/call, <1s)
  → Via Edge Function → OpenAI/Anthropic API
  → Geschikt voor: intent classificatie, entity extractie, simpele samenvattingen

Laag 2: Premium LLM (Claude Sonnet / GPT-4o, ~€0.003/call, 1-3s)
  → Via Edge Function → Anthropic/OpenAI API
  → Geschikt voor: complexe reasoning, WhatsApp conversaties, menu-analyse
```

### Beslisregel: welke laag?

| Taak | Laag | Waarom |
|------|------|--------|
| No-show risicoscore berekenen | 0 (SQL) | Gewogen formule, deterministische input |
| Forecast covers per dag | 0 (SQL) | Window functions over historische data |
| Customer stats bijwerken | 0 (SQL trigger) | Status change → increment counter |
| Shift risk summary | 0 (SQL view) | Aggregatie over reserveringen |
| Menu item BCG scoring | 0 (SQL) | Popularity × margin berekening |
| Ochtend-briefing genereren | 1 of 2 (LLM) | Natuurlijke taal samenvatting van data |
| WhatsApp intent detectie | 1 (goedkoop LLM) | Classificatie: booking/cancel/faq/other |
| WhatsApp conversatie response | 2 (premium LLM) | Tool calling + nuance nodig |
| Guidance suggesties | 1 (goedkoop LLM) | Max 1 zin, gestructureerd |

## LLM API Calls vanuit Edge Functions

### Hoe het werkt

Edge Functions (Deno runtime) roepen externe LLM APIs aan via HTTP fetch. De LLM draait NIET in de Edge Function — het is een API call naar OpenAI/Anthropic servers.

### API Keys opslaan

```bash
# In Supabase CLI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

### Basispatroon Edge Function

```typescript
// supabase/functions/generate-briefing/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Haal data op uit Postgres
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, customers(*)')
    .eq('reservation_date', today)

  // 2. Bouw context voor LLM
  const context = buildBriefingContext(reservations)

  // 3. Call LLM API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: BRIEFING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }]
    })
  })

  const result = await response.json()

  // 4. Sla resultaat op
  await supabase.from('briefings').insert({
    location_id: locationId,
    content: result.content[0].text,
    generated_at: new Date().toISOString()
  })

  return new Response(JSON.stringify({ success: true }))
})
```

### Aanbevolen SDK: Vercel AI SDK

Voor complexere patterns (streaming, tool calling, structured outputs) gebruik de Vercel AI SDK. Werkt native in Deno.

```typescript
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// Structured output met type safety
const { object } = await generateObject({
  model: anthropic('claude-haiku-4-5-20251001'),
  schema: z.object({
    priority_items: z.array(z.object({
      title: z.string(),
      severity: z.enum(['info', 'warning', 'urgent']),
      description: z.string(),
      suggested_action: z.string().optional()
    })),
    summary: z.string()
  }),
  prompt: `Analyseer deze restaurantdata en genereer een briefing: ${context}`
})
```

### Tool Calling (voor WhatsApp AI Agent)

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const { text, toolCalls } = await generateText({
  model: anthropic('claude-sonnet-4-5-20250514'),
  tools: {
    check_availability: {
      description: 'Check beschikbaarheid voor datum, tijd, groepsgrootte',
      parameters: z.object({
        date: z.string(),
        time: z.string(),
        party_size: z.number()
      }),
      execute: async ({ date, time, party_size }) => {
        // Roep je eigen availability engine aan
        return await checkAvailability(supabase, locationId, date, time, party_size)
      }
    },
    modify_reservation: {
      description: 'Wijzig een bestaande reservering',
      parameters: z.object({
        reservation_id: z.string(),
        new_date: z.string().optional(),
        new_time: z.string().optional(),
        new_party_size: z.number().optional()
      }),
      execute: async (params) => {
        return await modifyReservation(supabase, params)
      }
    },
    escalate_to_human: {
      description: 'Schakel door naar menselijke operator',
      parameters: z.object({ reason: z.string() }),
      execute: async ({ reason }) => {
        return { escalated: true, reason }
      }
    }
  },
  messages: conversationHistory
})
```

## Edge Function Limieten

| Limiet | Waarde | Impact op AI |
|--------|--------|--------------|
| Memory | 256 MB | Geen lokale ML modellen mogelijk |
| CPU time | 2 seconden | Irrelevant — LLM API calls zijn I/O (tellen niet mee) |
| Wall clock | 150s (free) / 400s (paid) | Ruim voldoende voor 1-3 LLM calls per request |
| Idle timeout | 150s (all plans) | LLM calls duren 2-15s, geen probleem |

**Belangrijk:** pg_cron heeft een 5-seconden HTTP timeout bij het aanroepen van Edge Functions. Gebruik voor LLM-werkzaamheden altijd Supabase Queues (pgmq) als tussenlaag, of roep Edge Functions aan via een externe cron service (bijv. BetterStack cron).

## Kosten per Feature

| Feature | Model | Frequentie | Kosten/restaurant/maand |
|---------|-------|------------|------------------------|
| Risicoscore | SQL (geen LLM) | Per reservering | €0 |
| Ochtend-briefing | Haiku / GPT-4o-mini | 1x per dag | €0.03-0.10 |
| Guidance suggesties | Haiku / GPT-4o-mini | 2-5x per dag | €0.10-0.50 |
| WhatsApp AI agent | Sonnet (tool calling) | 10-30 gesprekken/dag | €3-15 |
| **Totaal** | | | **€3-16** |

## Drie Dingen om Toe te Voegen (bij eerste LLM feature)

### 1. AI Observability — `ai_logs` tabel

```sql
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  feature TEXT NOT NULL, -- 'briefing', 'whatsapp', 'guidance'
  model TEXT NOT NULL, -- 'claude-haiku-4-5', 'gpt-4o-mini'
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd NUMERIC(8,6),
  status TEXT DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Location access" ON ai_logs
  FOR ALL USING (location_id IN (
    SELECT location_id FROM location_members WHERE user_id = auth.uid()
  ));
```

### 2. Semantic Cache — `ai_cache` tabel

```sql
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  feature TEXT NOT NULL,
  query_embedding vector(384), -- gte-small embedding
  query_text TEXT NOT NULL,
  response JSONB NOT NULL,
  model TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_cache_embedding ON ai_cache 
  USING ivfflat (query_embedding vector_cosine_ops);
```

### 3. Task Queue — Supabase Queues (pgmq)

Voor AI-taken die langer duren of via pg_cron getriggerd worden:

```sql
-- Maak queue aan
SELECT pgmq.create('ai_tasks');

-- Verstuur taak
SELECT pgmq.send('ai_tasks', 
  jsonb_build_object(
    'type', 'generate_briefing',
    'location_id', '...',
    'date', CURRENT_DATE::text
  )
);
```

Worker Edge Function polled de queue:

```typescript
// supabase/functions/ai-worker/index.ts
const { data: messages } = await supabase.rpc('pgmq_read', {
  queue_name: 'ai_tasks',
  qty: 5
})

for (const msg of messages) {
  if (msg.type === 'generate_briefing') {
    await generateBriefing(msg.location_id, msg.date)
  }
  await supabase.rpc('pgmq_delete', { queue_name: 'ai_tasks', msg_id: msg.msg_id })
}
```

## Supabase Native AI Capabilities

Supabase biedt ingebouwde AI-features die GEEN externe API key vereisen:

| Feature | Wat het doet | Gebruik in Nesto |
|---------|-------------|-----------------|
| `Supabase.ai.Session('gte-small')` | 384-dim embeddings genereren | Menu item embeddings, FAQ matching |
| pgvector | Vector opslag + similarity search | Semantic cache, gastvoorkeur matching |
| pg_trgm | Fuzzy text matching | Gastnaam zoeken met typo-tolerantie |
| Full-text search (tsvector) | Taalkundige zoekopdrachten | Menu search, notities doorzoeken |

## Model Selectie

| Wanneer | Model | Waarom |
|---------|-------|--------|
| Structured output (JSON) | Claude Haiku 4.5 of GPT-4o-mini | Goedkoop, betrouwbaar met schemas |
| Tool calling (WhatsApp) | Claude Sonnet 4.5 | Beste tool use kwaliteit |
| Simpele classificatie | GPT-4.1-nano | Goedkoopst, snel |
| Embeddings | Supabase gte-small (gratis) of text-embedding-3-small | Geen externe call nodig met gte-small |

**Model-agnostisch principe:** Alle LLM calls gaan via de Vercel AI SDK. Model wisselen = 1 regel code veranderen. Geen vendor lock-in.

## Wanneer Externe Infrastructure Nodig

Supabase Edge Functions zijn voldoende tot deze drempels:

| Drempel | Oplossing |
|---------|-----------|
| Agent chains > 5 stappen | Trigger.dev (TypeScript, geen timeout limiet) |
| Python ML modellen nodig | Railway/Fly.io Python service |
| >100K concurrent requests | Rate limiting queue via pgmq |
| >500K vector embeddings | Supabase compute upgraden of pgvectorscale |

Voor de eerste 100-500 restaurants is Supabase Edge Functions + LLM API calls voldoende. Geen extra infra nodig.
