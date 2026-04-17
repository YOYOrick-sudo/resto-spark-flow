// supabase/functions/_shared/ai.ts
// Centrale AI-helper voor alle Nesto Edge Functions
// Sprint D.0.2 — callAI, callAIWithTools, resolveOrgId

import { supabaseAdmin } from "./supabaseAdmin.ts";

// =====================================================
// CENTRAAL AI CONFIG — wijzig hier om overal te updaten
// =====================================================

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const FALLBACK_MODEL = "google/gemini-2.5-pro";
const TIMEOUT_MS = 20_000;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// EUR-cents per 1M tokens (benaderingen voor relatief inzicht)
// calculateCost() deelt door 100 → kolom bevat EUR-decimals (0.0023 = €0,0023)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 15, output: 60 },
  "google/gemini-2.5-pro": { input: 125, output: 1000 },
  "google/gemini-2.5-flash-lite": { input: 7, output: 30 },
};

// =====================================================
// Types
// =====================================================

interface BaseAIOptions {
  featureKey: string;
  organizationId: string;
  locationId?: string;

  // Optie A: simpel (prompt + optioneel systemPrompt)
  prompt?: string;
  systemPrompt?: string;

  // Optie B: volledige conversatie-array (voor ai-respond)
  // Als messages aanwezig is, worden prompt/systemPrompt genegeerd
  messages?: Array<{ role: string; content: any }>;

  maxTokens?: number;       // default 1000
  temperature?: number;     // default 0.7
  images?: string[];        // base64, voor multimodal (marketing-analyze-brand)

  // Override default primary model (bv. 'google/gemini-2.5-pro' voor documentparsing).
  // Fallback blijft FALLBACK_MODEL bij failure.
  modelOverride?: string;
}

export interface AICallOptions extends BaseAIOptions {
  jsonMode?: boolean;
}

export interface AIToolsOptions extends BaseAIOptions {
  tools: any[];
  toolChoice?: any;
}

export interface AIResponse {
  text: string;
  model: string;
  wasFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  costEur: number;          // EUR-decimals (0.0023 = €0,0023)
}

export interface AIToolsResponse extends AIResponse {
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
}

// =====================================================
// resolveOrgId — haalt organization_id op via location
// In-memory cache voorkomt N+1 queries binnen één function invocation
// =====================================================

const orgIdCache = new Map<string, string>();

export async function resolveOrgId(locationId: string): Promise<string> {
  if (orgIdCache.has(locationId)) return orgIdCache.get(locationId)!;

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select("organization_id")
    .eq("id", locationId)
    .single();

  if (error || !data?.organization_id) {
    throw new Error(`Cannot resolve org for location ${locationId}: ${error?.message}`);
  }

  orgIdCache.set(locationId, data.organization_id);
  return data.organization_id;
}

// =====================================================
// Public API
// =====================================================

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  return (await callWithFallback(options, false)) as AIResponse;
}

export async function callAIWithTools(options: AIToolsOptions): Promise<AIToolsResponse> {
  return (await callWithFallback(options, true)) as AIToolsResponse;
}

// =====================================================
// Interne fallback + logging logica
// =====================================================

async function callWithFallback(
  options: BaseAIOptions & (AICallOptions | AIToolsOptions),
  withTools: boolean
): Promise<AIResponse | AIToolsResponse> {
  const startTime = Date.now();
  const primaryModel = options.modelOverride ?? DEFAULT_MODEL;

  // 1. Primary model
  try {
    const result = await callGateway(primaryModel, options, withTools);
    const durationMs = Date.now() - startTime;

    await logCall({
      featureKey: options.featureKey,
      organizationId: options.organizationId,
      locationId: options.locationId,
      model: primaryModel,
      wasFallback: false,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs,
      success: true,
    });

    return buildResponse(result, primaryModel, false, withTools);
  } catch (primaryError) {
    console.warn(
      `[callAI] ${primaryModel} failed for ${options.featureKey}, trying ${FALLBACK_MODEL}:`,
      primaryError
    );

    // 2. Fallback model
    try {
      const result = await callGateway(FALLBACK_MODEL, options, withTools);
      const durationMs = Date.now() - startTime;

      await logCall({
        featureKey: options.featureKey,
        organizationId: options.organizationId,
        locationId: options.locationId,
        model: FALLBACK_MODEL,
        wasFallback: true,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs,
        success: true,
      });

      return buildResponse(result, FALLBACK_MODEL, true, withTools);
    } catch (fallbackError) {
      // 3. Beide gefaald — log en throw
      const durationMs = Date.now() - startTime;

      await logCall({
        featureKey: options.featureKey,
        organizationId: options.organizationId,
        locationId: options.locationId,
        model: FALLBACK_MODEL,
        wasFallback: true,
        durationMs,
        success: false,
        errorMessage: `Primary: ${String(primaryError)}\nFallback: ${String(fallbackError)}`,
      });

      throw new Error(`AI call failed for ${options.featureKey}: both models failed`);
    }
  }
}

// =====================================================
// Response builder
// =====================================================

interface GatewayResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; arguments: any }>;
  inputTokens: number;
  outputTokens: number;
}

function buildResponse(
  result: GatewayResult,
  model: string,
  wasFallback: boolean,
  withTools: boolean
): AIResponse | AIToolsResponse {
  const base: AIResponse = {
    text: result.text,
    model,
    wasFallback,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costEur: calculateCost(model, result.inputTokens, result.outputTokens),
  };
  return withTools ? { ...base, toolCalls: result.toolCalls } : base;
}

// =====================================================
// Lovable AI Gateway call (OpenAI-compatible)
// =====================================================

async function callGateway(
  model: string,
  opts: BaseAIOptions & Partial<AICallOptions & AIToolsOptions>,
  withTools: boolean
): Promise<GatewayResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  // Bouw messages: gebruik opts.messages als aanwezig, anders prompt/systemPrompt
  let messages: any[];

  if (opts.messages?.length) {
    // Optie B: volledige conversatie-array (voor ai-respond)
    messages = [...opts.messages];
  } else {
    // Optie A: bouw uit prompt + systemPrompt
    messages = [];
    if (opts.systemPrompt) {
      messages.push({ role: "system", content: opts.systemPrompt });
    }
    // User message — kan multimodal zijn (images)
    if (opts.images?.length) {
      const content: any[] = [{ type: "text", text: opts.prompt ?? "" }];
      for (const img of opts.images) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` },
        });
      }
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: opts.prompt ?? "" });
    }
  }

  const body: any = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 1000,
    temperature: opts.temperature ?? 0.7,
  };

  // Tools of JSON mode (mutual exclusive)
  if (withTools && opts.tools) {
    body.tools = opts.tools;
    if (opts.toolChoice) body.tool_choice = opts.toolChoice;
  } else if (!withTools && (opts as AICallOptions).jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message ?? {};
    const usage = data.usage ?? {};

    // Parse tool calls indien aanwezig
    const toolCalls = (message.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
      arguments: tc.function?.arguments
        ? JSON.parse(tc.function.arguments)
        : {},
    }));

    return {
      text: message.content ?? "",
      toolCalls,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// =====================================================
// Cost berekening
// =====================================================

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? { input: 0, output: 0 };
  // Pricing is in EUR-cents per 1M tokens → delen door 100 voor EUR-decimals
  return (
    ((inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output) / 100
  );
}

// =====================================================
// Logging — mag NOOIT de main call breken
// =====================================================

async function logCall(entry: {
  featureKey: string;
  organizationId: string;
  locationId?: string;
  model: string;
  wasFallback: boolean;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    const costEur =
      entry.success && entry.inputTokens && entry.outputTokens
        ? calculateCost(entry.model, entry.inputTokens, entry.outputTokens)
        : null;

    await supabaseAdmin.from("ai_logs").insert({
      organization_id: entry.organizationId,
      location_id: entry.locationId ?? null,
      feature: entry.featureKey,            // DB kolom = feature, helper param = featureKey
      model: entry.model,
      was_fallback: entry.wasFallback,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      cost_eur: costEur,                    // EUR-decimals (0.0023 = €0,0023)
      duration_ms: entry.durationMs,
      latency_ms: entry.durationMs,         // Backward compat met bestaande ai-respond logAiCall()
      status: entry.success ? "success" : "error",
      error_message: entry.errorMessage ?? null,
    });
  } catch (err) {
    // Logging mag NOOIT de main call breken
    console.error("[callAI] Failed to log:", err);
  }
}
