// supabase/functions/_shared/factuur-v2/extractor.ts
// Sprint Factuur-AI V2 — Generieke extractor via Lovable AI Gateway.
//
// AI-route = Lovable Gateway (https://ai.gateway.lovable.dev/v1/chat/completions)
// via bestaande callAI() helper. GEEN Vertex AI, geen direct provider call.
//
// Sprint Factuur Enterprise Pass — extra `retryHint` parameter voor 2e poging
// bij sum-mismatch. Hint wordt achter de gewone prompt geplakt zodat de AI
// weet wáár hij naar moet kijken.

import { type AIResponse, callAI } from "../ai.ts";
import { FACTUUR_V2_SCHEMA } from "./schema.ts";
import { FACTUUR_V2_SYSTEM_PROMPT } from "./prompt.ts";
import type { FactuurV2Output } from "./types.ts";

// =====================================================
// Token-budget centralisatie (V2)
// =====================================================
const MAX_TOKENS_V2 = 60000;
const MAX_TOKENS_V2_FALLBACK = 60000;

export interface ExtractorInput {
  /** Volledige PDF-tekst (gejoined per pagina). Leeg bij scan-PDF. */
  text: string;
  /** True → multimodal call met PDF base64 als document-attachment. */
  isScanPdf: boolean;
  /** PDF base64 zonder data:-prefix. Alleen vereist bij isScanPdf=true. */
  pdfBase64?: string;
  /** Voor logging/cost-attribution. */
  organizationId: string;
  locationId?: string;
  /** Override default model. */
  modelOverride?: string;
  /**
   * Sprint Factuur Enterprise Pass — extra hint die achter de prompt wordt
   * geplakt bij retry-poging. Bevat verschil + tips waar AI op moet letten.
   */
  retryHint?: string;
}

export interface ExtractorResult {
  data: FactuurV2Output;
  raw: AIResponse;
}

/**
 * Tolerant JSON-parse — strip markdown fences en pak {…} segment.
 * Mirror van tryParseJSON in _shared/ai.ts (callGateway valideerde al).
 */
function parseJsonStrict(text: string): FactuurV2Output {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as FactuurV2Output;
}

export async function extractFactuur(
  input: ExtractorInput,
): Promise<ExtractorResult> {
  const isMultimodal = input.isScanPdf && !!input.pdfBase64;
  const hint = input.retryHint ?? "";

  const baseOpts = {
    featureKey: "parse-factuur-v2",
    organizationId: input.organizationId,
    locationId: input.locationId,
    systemPrompt: FACTUUR_V2_SYSTEM_PROMPT,
    temperature: 0.0,
    maxTokens: input.modelOverride === "google/gemini-2.5-pro"
      ? MAX_TOKENS_V2_FALLBACK
      : MAX_TOKENS_V2,
    timeoutMs: 300_000,
    modelOverride: input.modelOverride,
    responseSchema: {
      name: "factuur_extractie",
      strict: true,
      schema: FACTUUR_V2_SCHEMA,
    },
  };

  const response = isMultimodal
    ? await callAI({
      ...baseOpts,
      prompt: `Extraheer deze factuur volgens het schema.${hint}`,
      documents: [{ data: input.pdfBase64!, mimeType: "application/pdf" }],
    })
    : await callAI({
      ...baseOpts,
      prompt: `Factuur-tekst:\n\n${input.text}\n\nExtraheer volgens schema.${hint}`,
    });

  const data = parseJsonStrict(response.text);
  return { data, raw: response };
}
