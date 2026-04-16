

# Sprint D.0.2 — Ronde 2B: Refactor 9 Edge Functions + UX Fix

## Stap 0: UX Fix PersoneelsmaaltijdModal

Add early return in `handleSuggestMeal()` (line 355-358):

```typescript
const handleSuggestMeal = async () => {
  if (!currentLocation?.id) {
    nestoToast.error("Geen actieve locatie geselecteerd");
    return;
  }
  setAiLoading(true);
  // ...rest
```

---

## Overzicht: 9 functies, 13 AI call-sites

| # | Function | Call-sites | featureKey(s) | Variant | Complexiteit |
|---|----------|-----------|---------------|---------|-------------|
| 1 | `ai-respond` | 4 | `ai_respond_intent`, `ai_respond_generate`, `ai_respond_tools`, `ai_respond_tool_followup` | callAIWithTools (intent) + callAI (generate, followup) + callAIWithTools (tools) | **Hoog** — messages array, multi-step tool flow |
| 2 | `marketing-analyze-brand` | 4 | `marketing_analyze_caption_style`, `marketing_analyze_visual_style`, `marketing_analyze_review_style`, `marketing_analyze_caption_edits` | callAIWithTools (all 4) | **Hoog** — multimodal images, loop per location |
| 3 | `marketing-generate-content` | 2 | `marketing_generate_social`, `marketing_generate_email` | callAIWithTools (both) | Medium — has its own `callAI` local function to replace |
| 4 | `marketing-generate-weekplan` | 2 | `marketing_generate_weekplan`, `marketing_generate_popup` | callAIWithTools (both) | Medium — two separate AI sub-functions |
| 5 | `marketing-generate-coaching` | 1 | `marketing_generate_coaching` | callAIWithTools | Laag |
| 6 | `generate-styled-templates` | 1 | `generate_styled_templates` | callAI (jsonMode or text parse) | Laag |
| 7 | `suggest-widget-colors` | 1 | `suggest_widget_colors` | callAIWithTools | Laag |
| 8 | `marketing-onboard-instagram` | 1 | `marketing_classify_captions` | callAIWithTools | Laag |
| 9 | `marketing-sync-reviews` | 2 | `marketing_sentiment_analysis`, `marketing_generate_review_response` | callAI (jsonMode for sentiment) + callAI (text for response) | Medium — **fix missing Authorization header** |

Total: 16 call-sites across 9 functions.

---

## Per-function refactor details

### 1. ai-respond (1028 lines, 4 call-sites)

**Call-site A: `classifyIntent()` (line 160)**
- Current: `fetch(AI_GATEWAY, ...)` met `gemini-2.5-flash-lite` + tools
- Refactor to: `callAIWithTools({ featureKey: "ai_respond_intent", messages: [...], tools: [...], toolChoice: ..., temperature: 0 })`
- Note: uses `flash-lite` model currently — `callAI` helper forces `flash` as primary. This is acceptable (flash is better).

**Call-site B: `generateResponse()` (line 577)**
- Current: `fetch(AI_GATEWAY, ...)` met `gemini-3-flash-preview` + messages array
- Refactor to: `callAI({ featureKey: "ai_respond_generate", messages: conversationMessages, maxTokens: 500, temperature: 0.7 })`

**Call-site C: `generateWithBookingTools()` first call (line 693)**
- Current: `fetch(AI_GATEWAY, ...)` met tools + messages
- Refactor to: `callAIWithTools({ featureKey: "ai_respond_tools", messages: [...], tools: bookingTools, temperature: 0.3, maxTokens: 500 })`

**Call-site D: `generateWithBookingTools()` second call (line 750)**
- Current: feeds tool result back to AI for natural response
- Refactor to: `callAI({ featureKey: "ai_respond_tool_followup", messages: messagesWithToolResult, maxTokens: 500 })`

**Cleanup:**
- Remove `LOVABLE_API_KEY` constant (line 10)
- Remove `AI_GATEWAY` constant (line 11)
- Remove `logAiCall()` function (lines 1020-1028)
- Add `import { callAI, callAIWithTools, resolveOrgId } from "../_shared/ai.ts";`
- Call `resolveOrgId(ctx.locationId)` once at start of main handler, pass to all calls

### 2. marketing-analyze-brand (525 lines, 4 sub-calls)

**Sub-call A: `analyzeCaptionStyle()` (line 284)**
- featureKey: `marketing_analyze_caption_style`
- callAIWithTools with tool `return_caption_style`

**Sub-call B: `analyzeVisualStyle()` (line 339)**
- featureKey: `marketing_analyze_visual_style`
- callAIWithTools with `images` parameter (image_url content parts)
- Note: current code uses `image_url` format in messages — need to use the `messages` array approach (not the `images` base64 option) since these are URLs not base64

**Sub-call C: `analyzeReviewResponseStyle()` (line 399)**
- featureKey: `marketing_analyze_review_style`
- callAIWithTools with tool `return_review_response_style`

**Sub-call D: `analyzeCaptionEdits()` (line 473)**
- featureKey: `marketing_analyze_caption_edits`
- callAIWithTools with tool `return_refined_caption_style`

**Cleanup:**
- Remove `LOVABLE_API_KEY` passing through function signatures
- Each sub-function gets `organizationId` parameter
- Use `resolveOrgId(locationId)` once per location in the loop
- Handle rate limiting via catch on the callAI error (both models failed = stop loop)

### 3-9: Simpler functions

Each follows the same pattern:
- Replace `fetch(AI_GATEWAY, ...)` with `callAI` or `callAIWithTools`
- Remove `LOVABLE_API_KEY` references
- Add `import { callAI/callAIWithTools, resolveOrgId } from "../_shared/ai.ts";`
- Call `resolveOrgId(locationId)` for `organizationId`

**marketing-sync-reviews** special fix: add `Authorization: Bearer ${apiKey}` to both `analyzeSentiment()` and `generateResponse()` fetch headers (currently missing — requests fail silently).

---

## Model mapping

| Current model | New model (via helper) |
|---|---|
| `google/gemini-2.5-flash-lite` | `google/gemini-2.5-flash` (primary) |
| `google/gemini-2.5-flash` | `google/gemini-2.5-flash` (primary) |
| `google/gemini-3-flash-preview` | `google/gemini-2.5-flash` (primary) |
| `openai/gpt-5-mini` | `google/gemini-2.5-flash` (primary) |

All standardized to one model with automatic fallback to `gemini-2.5-pro`.

---

## Pricing table update needed in `_shared/ai.ts`

Current `MODEL_PRICING` only has `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`. Since all functions now use the helper with fixed primary/fallback, this is sufficient.

---

## Deliverables

1. **Volledige code**: `ai-respond/index.ts` en `marketing-analyze-brand/index.ts`
2. **Overige 7 functies**: volledige code (alle aanpassingen in één keer)
3. **Test**: trigger 2-3 features, check `ai_logs` rows
4. **UX fix**: PersoneelsmaaltijdModal early return

