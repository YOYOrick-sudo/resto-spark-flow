

# Sprint E.3: AI Agent — Implementation Plan

## Overview

Build the AI agent that automatically handles guest conversations across WhatsApp and webchat. Uses Lovable AI (not external OpenAI/Anthropic keys) for intent classification, tool calling, and response generation.

## Key Architecture Decision: Lovable AI Gateway

The sprint spec references OpenAI and Anthropic keys, but we use **Lovable AI** (already configured via `LOVABLE_API_KEY`):
- **Intent classification**: `google/gemini-2.5-flash-lite` (fast, cheap)
- **Tool calling + response generation**: `google/gemini-3-flash-preview` (balanced speed/capability)

No additional API keys needed.

---

## Implementation Blocks

### Block 1: Database — `increment_knowledge_hit` RPC function

Migration to add:
- `increment_knowledge_hit(question_text, loc_id)` — upserts hit_count for gap detection
- No new tables needed; all existing tables (`agent_configurations`, `agent_actions`, `knowledge_base`, `ai_logs`, `messaging_config`) are sufficient

### Block 2: Edge Function — `ai-respond/index.ts` (the core)

Single edge function (~400 lines) with this flow:

```text
inbound message → load context (parallel) → check active window
  → classify intent (Lovable AI, flash-lite)
  → route by type:
    booking → tool calling (check-availability, create/modify/cancel via public-booking-api)
    faq → knowledge base lookup → respond or gap-detect
    custom_request/complaint/escalate → escalate
    greeting/unclear → respond directly
  → check autonomy (check-autonomy function)
  → generate response (Lovable AI, flash-preview, with system prompt from branding/tone)
  → send via send-message or direct insert
  → log to ai_logs
```

Key sub-functions:
- `loadContext()` — parallel fetch of conversation, messages (last 10), customer, config, branding, knowledge_base
- `checkActiveWindow()` — reservation keywords bypass window check
- `classifyIntent()` — Lovable AI call with structured output via tool calling
- `executeTool()` — calls check-availability/public-booking-api, checks autonomy first, respects large_party_threshold
- `buildSystemPrompt()` — uses `getSystemPromptTone()`, customer context, knowledge base
- `detectLanguage()` — simple keyword-based NL/EN detection
- `shouldEscalate()` — person keywords, complaint, 3x fallback detection
- `handleUnknownFaq()` — inserts gap_detection entry + agent_action card
- Rate limiting: max 1 response per 2s per conversation, max 50/day → auto-escalate

### Block 3: Trigger ai-respond from webhooks

**`whatsapp-webhook/index.ts`**: After `processInboundMessage()`, check `messaging_config.ai_agent_enabled` + `conversation.handled_by === 'ai'`, then call `ai-respond` via fetch.

**`webchat-message/index.ts`**: Same trigger logic after message insert. Also add webchat email notification (throttled, max 1 per 10 min).

### Block 4: Approval execution flow

When manager clicks "Goedkeuren" on an agent_action (already wired in `useAgentActions.approve`), the agent needs to execute the pending action. Add a new edge function **`execute-agent-action/index.ts`** that:
1. Reads the action's `action_type` and `action_data`
2. Executes the tool (e.g., cancel reservation via public-booking-api)
3. Sends confirmation to the guest via `send-message`
4. Updates action status
5. Checks for autonomy suggestion (20+ approvals, 90%+ rate → suggest upgrading to autonomous)

Update `useAgentActions.approve` to call this edge function instead of just updating status.

### Block 5: Bevoegdheden UI — New tab in Settings > Assistent

New tab **"Bevoegdheden"** in `SettingsAssistent.tsx` showing per-task autonomy dropdowns:

| Task | Dropdown |
|---|---|
| FAQ beantwoorden | Zelfstandig / Vraag eerst / Uit |
| Reserveringen boeken | Zelfstandig / Vraag eerst / Uit |
| Reserveringen wijzigen | ... |
| Reserveringen annuleren | ... |
| Reminders versturen | ... |
| Bevestigingen versturen | ... |

Reads/writes `agent_configurations` table. Only visible for owner/manager roles.

New component: `src/components/settings/assistant/PermissionsTab.tsx`

### Block 6: OverviewTab — New card types

Extend `OverviewTab.tsx` to render:
- **Knowledge gap cards**: "Gast vroeg: '...'. Wil je een antwoord toevoegen?" with [Toevoegen] button → opens knowledge base editor
- **Autonomy suggestion cards**: "Je hebt X van Y keer goedgekeurd. Zal ik dit voortaan zelf doen?" with [Ja] / [Nee, liever niet]
- **New capability cards**: For `agent_configurations` with `is_enabled = false` → "Nieuw: je Assistent kan nu [label]. Hoe wil je dit instellen?" with [Zelfstandig] / [Vraag eerst] / [Uit]

All only visible for owner/manager.

### Block 7: Template restyling — `generate-styled-templates/index.ts`

Edge function that:
1. Loads branding (tone_of_voice, name, description)
2. Loads `message_templates` with `is_default = true`
3. Calls Lovable AI to restyle templates in the restaurant's tone
4. Returns preview (old vs new)

UI: Button in Settings > Communicatie branding tab. Preview modal with side-by-side comparison and Save/Cancel.

---

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/ai-respond/index.ts` | New — core AI agent |
| `supabase/functions/execute-agent-action/index.ts` | New — approval execution |
| `supabase/functions/generate-styled-templates/index.ts` | New — template restyling |
| `supabase/functions/whatsapp-webhook/index.ts` | Edit — add ai-respond trigger |
| `supabase/functions/webchat-message/index.ts` | Edit — add ai-respond trigger + email notification |
| `supabase/config.toml` | Edit — add new function entries |
| `src/pages/settings/SettingsAssistent.tsx` | Edit — add Bevoegdheden tab |
| `src/components/settings/assistant/PermissionsTab.tsx` | New — autonomy level management UI |
| `src/components/assistant/OverviewTab.tsx` | Edit — knowledge gap, autonomy suggestion, capability cards |
| `src/hooks/useAgentActions.ts` | Edit — approve calls execute-agent-action |
| Migration | `increment_knowledge_hit` RPC function |

## Order

1. Migration (increment_knowledge_hit RPC)
2. `ai-respond` edge function
3. `execute-agent-action` edge function
4. Webhook triggers (whatsapp-webhook + webchat-message)
5. PermissionsTab + SettingsAssistent update
6. OverviewTab card types (gap, suggestion, capability)
7. `generate-styled-templates` + UI button
8. Deploy + config.toml

