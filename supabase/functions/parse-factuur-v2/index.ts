// supabase/functions/parse-factuur-v2/index.ts
// Sprint Factuur Enterprise Pass — orchestreert AI-extractie met:
//   * Retry-loop (max 1×) bij sum-mismatch — bespaart kosten via shouldRetryParse()
//   * Persisteert nieuwe DB-velden:
//       factuur_uploads.subtotaal_excl_btw / btw_bedrag / btw_percentage /
//       totaal_incl_btw / validation_retries / validation_blocked_reason
//       factuur_regels.validation_error / validation_error_reden
//   * Bij onhandelbare mismatch → status='review_blocked'
//   * Signal-creatie gedelegeerd aan evaluate-signals (fire-and-forget POST)
//       - dedup_key='inkoop_factuur_blocked:{factuur_id}'
//       - evaluate-signals doet zelf dedup + role-routing via RLS
//       - cron is safety net wanneer fire-and-forget faalt
//
// AI-route = Lovable AI Gateway via _shared/ai.ts callAI() (geen Vertex/direct).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { extractTextPerPage } from "../_shared/pdf-text.ts";
import { extractFactuur } from "../_shared/factuur-v2/extractor.ts";
import {
  shouldRetryParse,
  validateFactuur,
  type ValidationStatus,
} from "../_shared/factuur-v2/validator.ts";
import { buildRetryHint } from "../_shared/factuur-v2/prompt.ts";
import {
  lookupTier1,
  lookupTier2_3_4,
  type MatchHit,
  upsertLeverancier,
  upsertLeverancierArtikelFromMatch,
} from "../_shared/factuur-v2/cache.ts";
import { normalizeMatchKey } from "../_shared/factuur-v2/normalize.ts";
import { isEmballageRegel } from "../_shared/factuur-v2/emballageDetector.ts";
import type {
  FactuurV2Output,
  FactuurV2Regel,
  SumMismatchInfo,
} from "../_shared/factuur-v2/types.ts";
import type { SumCheckResult } from "../_shared/factuur-v2/sumCheckMultiBTW.ts";

declare const EdgeRuntime:
  | { waitUntil: (p: Promise<unknown>) => void }
  | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================
// Broadcast helper — hergebruik bestaand channel-formaat
// =====================================================
async function broadcastFactuurStatus(
  supabase: SupabaseClient,
  locationId: string,
  payload: { factuurId: string; aiParsingStatus: string; status?: string },
) {
  try {
    const channel = supabase.channel(`inkoop:${locationId}`);
    await channel.send({ type: "broadcast", event: "factuur.status", payload });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.warn("[parse-factuur-v2] broadcast failed:", err);
  }
}

// =====================================================
// PDF → base64 (zonder data:-prefix)
// =====================================================
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// =====================================================
// ai_parsing_status → factuur_uploads.ai_parsing_status mapping
// =====================================================
function aiStatusFromValidation(v: ValidationStatus): string {
  if (v === "invalid") return "failed";
  return "completed";
}

// =====================================================
// Sprint Enterprise Pass — bouw chef-leesbare reden bij block
// =====================================================
function buildBlockedReason(sm: SumMismatchInfo): string {
  const verschil = sm.verschil.toFixed(2);
  const pct = sm.verschil_pct.toFixed(1);
  if (sm.type === "onverklaarbaar") {
    return `De bedragen op deze factuur konden niet automatisch bevestigd worden. ` +
      `Verschil van €${verschil} (${pct}%) tussen de som van de regels en het ` +
      `factuur-totaal — kon ook niet via 9% of 21% BTW verklaard worden. ` +
      `Vereist handmatige controle.`;
  }
  return `De bedragen op deze factuur konden niet automatisch bevestigd worden. ` +
    `Verschil van €${verschil} (${pct}%) tussen de som van de regels en het ` +
    `factuur-totaal. Vereist handmatige controle.`;
}

// =====================================================
// Hoofdverwerking — draait asynchroon via EdgeRuntime.waitUntil
// =====================================================
async function asyncRunV2(args: {
  supabase: SupabaseClient;
  factuurId: string;
  locationId: string;
  organizationId: string;
  bestandUrl: string;
  dryRun: boolean;
}): Promise<{
  data: FactuurV2Output;
  validationStatus: ValidationStatus;
  errors: string[];
  warnings: string[];
  parseMethod: "ai_v2_text" | "ai_v2_multimodal";
  tokensInput: number;
  tokensOutput: number;
  costEur: number;
  retries: number;
  blocked: boolean;
  blockedReason: string | null;
  sumMismatch: SumMismatchInfo | null;
}> {
  const {
    supabase,
    factuurId,
    locationId,
    organizationId,
    bestandUrl,
    dryRun,
  } = args;

  // 1. Storage download
  let storagePath = bestandUrl;
  if (bestandUrl.includes("/facturen/")) {
    storagePath = bestandUrl.split("/facturen/").pop()!;
  }
  const { data: fileData, error: dlError } = await supabase.storage
    .from("facturen")
    .download(storagePath);
  if (dlError || !fileData) {
    throw new Error(
      `Storage download failed: ${dlError?.message ?? "no data"}`,
    );
  }
  const bytes = new Uint8Array(await fileData.arrayBuffer());

  // 2. Text extract → scan-detectie
  const textResult = await extractTextPerPage(bytes);
  const isScanPdf = textResult.pages == null;
  const text = textResult.pages ? textResult.pages.join("\n\n") : "";
  const parseMethod: "ai_v2_text" | "ai_v2_multimodal" = isScanPdf
    ? "ai_v2_multimodal"
    : "ai_v2_text";

  // ===========================================================
  // 3. AI EXTRACT + VALIDATE met retry-lus (max 1×)
  // ===========================================================
  // Aanscherping 1: shouldRetryParse() blokkeert retry bij failed/laag-confidence
  // → bespaart kosten als AI zelf zegt dat het niks kan worden.
  let retries = 0;
  let aggregatedTokensIn = 0;
  let aggregatedTokensOut = 0;
  let aggregatedCost = 0;
  let data: FactuurV2Output;
  let validation: ReturnType<typeof validateFactuur>;
  let lastRetryHint: string | undefined;

  while (true) {
    const { data: parsed, raw } = await extractFactuur({
      text,
      isScanPdf,
      pdfBase64: isScanPdf ? uint8ToBase64(bytes) : undefined,
      organizationId,
      locationId,
      retryHint: lastRetryHint,
    });
    data = parsed;
    validation = validateFactuur(data);

    aggregatedTokensIn += raw.inputTokens;
    aggregatedTokensOut += raw.outputTokens;
    aggregatedCost += raw.costEur;

    const wantRetry = shouldRetryParse({
      data,
      sumMismatch: validation.sumMismatch,
      currentRetries: retries,
    });
    if (!wantRetry) break;

    // Bouw hint voor 2e poging
    const sm = validation.sumMismatch!;
    lastRetryHint = buildRetryHint({
      somRegels: sm.som_regels,
      vergelijkBasis: sm.vergelijk_basis,
      basisLabel: sm.type === "netto_mismatch" ? "subtotaal" : "totaal",
      verschil: sm.verschil,
    });
    retries += 1;
    console.log(
      `[parse-factuur-v2] retry ${retries} factuurId=${factuurId} reden=${sm.type} verschil=${sm.verschil}`,
    );
  }

  // Bepaal of factuur geblokkeerd moet worden — Sprint Multi-BTW + Emballage:
  // sumCheck (3-strategieën) is leidend. Pas blocked als ALLE strategieën falen
  // EN de oude sumMismatch ook significant is (>€2 + >1%).
  const sumCheck: SumCheckResult = validation.sumCheck;
  const sumMismatch = validation.sumMismatch;
  console.log(
    `[sum-check] factuurId=${factuurId} strategy=${sumCheck.strategy} passed=${sumCheck.passed} verschil=€${sumCheck.details.verschil.toFixed(2)} n_btw=${sumCheck.details.n_btw_tarieven} emballage=€${sumCheck.details.totaal_regels_emballage.toFixed(2)}`,
  );
  const blocked = !sumCheck.passed && !!(
    sumMismatch &&
    sumMismatch.type !== "klein" &&
    sumMismatch.verschil > 2 &&
    sumMismatch.verschil_pct > 1
  );
  const blockedReason = blocked && sumMismatch
    ? buildBlockedReason(sumMismatch)
    : null;

  // 4. Dry-run → geen DB-writes (behalve shadow-velden door caller)
  if (dryRun) {
    return {
      data,
      validationStatus: validation.status,
      errors: validation.errors,
      warnings: validation.warnings,
      parseMethod,
      tokensInput: aggregatedTokensIn,
      tokensOutput: aggregatedTokensOut,
      costEur: aggregatedCost,
      retries,
      blocked,
      blockedReason,
      sumMismatch,
    };
  }

  // 5. Upsert leverancier
  const leverancierId = await upsertLeverancier(
    supabase,
    locationId,
    data.leverancier_naam ?? "Onbekend",
    data.leverancier_btw_nummer,
  );

  // 6. Match-cascade per regel: Tier-1 → Tier-2 → Tier-3 → Tier-4.
  const regels = data.regels ?? [];
  const artikelnummers: string[] = regels
    .map((r) => (r.artikelnummer ?? "").trim())
    .filter((a) => a.length > 0);
  const namen: string[] = regels
    .map((r) => (r.product_naam ?? "").trim())
    .filter((n) => n.length > 0);

  const [tier1Map, tier234Map] = await Promise.all([
    leverancierId
      ? lookupTier1(supabase, leverancierId, artikelnummers)
      : Promise.resolve(new Map<string, MatchHit>()),
    lookupTier2_3_4(supabase, locationId, leverancierId, namen),
  ]);

  const matches: Array<MatchHit | null> = regels.map((r) => {
    const artnr = (r.artikelnummer ?? "").trim();
    const naamKey = normalizeMatchKey(r.product_naam);
    if (artnr && tier1Map.has(artnr)) return tier1Map.get(artnr)!;
    if (naamKey && tier234Map.has(naamKey)) return tier234Map.get(naamKey)!;
    return null;
  });

  // 6b. Auto-upsert leveranciers_artikelen voor Tier-3/4 hits.
  if (leverancierId) {
    await Promise.all(
      regels.map(async (r, idx) => {
        const hit = matches[idx];
        if (!hit) return;
        if (hit.tier !== 3 && hit.tier !== 4) return;
        await upsertLeverancierArtikelFromMatch(supabase, {
          leverancierId: leverancierId!,
          ingredientId: hit.ingredient_id,
          artikelNummer: (r.artikelnummer ?? "").trim() || null,
          artikelNaam: r.product_naam,
          prijsPerEenheid: r.prijs_per_basiseenheid ?? null,
          verpakkingEenheid: r.verpakking_eenheid ?? null,
          verpakkingHoeveelheid: r.verpakking_hoeveelheid ?? null,
        });
      }),
    );
  }

  // ===========================================================
  // 7. Bulk insert factuur_regels — incl. validation_error/_reden
  // ===========================================================
  //
  // IDEMPOTENT: DELETE+INSERT op factuur_id. Re-parse vervangt alle regels
  // — chef heeft nog niets goedgekeurd want status='review' is nog niet bereikt.
  const regelRows = regels.map((r: FactuurV2Regel, idx: number) => {
    const artikelnummer = (r.artikelnummer ?? "").trim();
    const hit = matches[idx];
    return {
      factuur_id: factuurId,
      product_naam_herkend: r.product_naam,
      ai_raw_naam: r.product_naam,
      ai_raw_artikelnummer: artikelnummer || null,
      product_omschrijving_kort: r.product_omschrijving_kort ?? null,
      hoeveelheid: r.hoeveelheid_besteld ?? null,
      eenheid: r.verpakking_eenheid ?? null,
      verpakking_hoeveelheid: r.verpakking_hoeveelheid ?? null,
      verpakking_eenheid: r.verpakking_eenheid ?? null,
      prijs_per_eenheid: r.prijs_per_besteld_item ?? null,
      prijs_per_basiseenheid: r.prijs_per_basiseenheid ?? null,
      totaal: r.prijs_totaal ?? null,
      ai_confidence: r.confidence === "hoog"
        ? 0.95
        : r.confidence === "medium"
        ? 0.7
        : 0.4,
      extract_confidence: r.confidence ?? null,
      is_emballage: r.is_emballage ?? false,
      is_credit: r.is_credit ?? false,
      ingredient_id: hit?.ingredient_id ?? null,
      is_nieuw_ingredient: !hit,
      match_status: hit ? "matched" : "unmatched",
      match_confidence: hit ? hit.confidence : null,
      // Sprint Enterprise Pass — validator-output per regel
      validation_error: r.validation_error === true,
      validation_error_reden: r.validation_error_reden ?? null,
      // Sprint Validator-Slim — auto-correctie metadata
      validation_corrected: r.validation_corrected === true,
      validation_correction_path: r.validation_correction_path ?? null,
      validation_ambiguous: r.validation_ambiguous === true,
    };
  });

  if (regelRows.length > 0) {
    await supabase.from("factuur_regels").delete().eq("factuur_id", factuurId);
    const { error: insErr } = await supabase.from("factuur_regels").insert(
      regelRows,
    );
    if (insErr) {
      console.error("[parse-factuur-v2] insert factuur_regels failed:", insErr);
      throw new Error(`Insert factuur_regels: ${insErr.message}`);
    }
  }

  // ===========================================================
  // 8. Update factuur_uploads — incl. nieuwe BTW + blocked velden
  // ===========================================================
  //
  // IDEMPOTENT: UPDATE op factuur_id. Re-run met identieke AI-output schrijft
  // exact dezelfde waardes (no-op in praktijk).
  const aiParsingStatus = aiStatusFromValidation(validation.status);
  const finalStatus = blocked ? "review_blocked" : "review";

  // Eén uniform BTW-percentage afleiden uit btw_regels (NULL bij meerdere)
  let uniformBtwPct: number | null = null;
  let totaalBtwBedrag: number | null = null;
  if (data.btw_regels && data.btw_regels.length > 0) {
    if (data.btw_regels.length === 1) {
      uniformBtwPct = data.btw_regels[0].percentage;
    }
    totaalBtwBedrag = data.btw_regels.reduce(
      (s, r) => s + (r.btw_bedrag ?? 0),
      0,
    );
  }

  // ===========================================================
  // Defensive guards — voorkom CHECK-constraint violations
  // ===========================================================
  // CHECK: btw_percentage IN (0, 9, 21) OR NULL → forceer NULL bij andere waardes
  if (
    uniformBtwPct !== null && uniformBtwPct !== 0 && uniformBtwPct !== 9 &&
    uniformBtwPct !== 21
  ) {
    console.warn(
      `[parse-factuur-v2] btw_percentage ${uniformBtwPct} buiten {0,9,21} — forceer NULL`,
    );
    uniformBtwPct = null;
  }
  // Numeric guards: negatieve totalen zijn ongeldig (creditfacturen worden per-regel gemarkeerd)
  const safeSubtotaal =
    typeof data.subtotaal_excl_btw === "number" && data.subtotaal_excl_btw >= 0
      ? data.subtotaal_excl_btw
      : null;
  const safeTotaal =
    typeof data.totaal_incl_btw === "number" && data.totaal_incl_btw >= 0
      ? data.totaal_incl_btw
      : null;
  const safeBtwBedrag =
    typeof totaalBtwBedrag === "number" && totaalBtwBedrag >= 0
      ? totaalBtwBedrag
      : null;

  const updatePayload = {
    status: finalStatus,
    ai_parsing_status: aiParsingStatus,
    ai_parsed_at: new Date().toISOString(),
    ai_confidence_overall: data.regels && data.regels.length > 0
      ? data.regels.reduce(
        (sum, r) =>
          sum +
          (r.confidence === "hoog"
            ? 0.95
            : r.confidence === "medium"
            ? 0.7
            : 0.4),
        0,
      ) / data.regels.length
      : null,
    ai_raw_response: data as unknown as Record<string, unknown>,
    parse_method: parseMethod,
    leverancier_id: leverancierId,
    leverancier_naam_herkend: data.leverancier_naam ?? null,
    factuurnummer: data.factuur_nummer ?? null,
    factuurdatum: data.factuur_datum ?? null,
    totaalbedrag: safeTotaal,
    // Sprint Enterprise Pass — BTW kolommen
    subtotaal_excl_btw: safeSubtotaal,
    btw_bedrag: safeBtwBedrag,
    btw_percentage: uniformBtwPct,
    totaal_incl_btw: safeTotaal,
    // Sprint Enterprise Pass — block-info
    validation_retries: retries,
    validation_blocked_reason: blockedReason,
    // Bestaand: validator legacy fields
    validation_status: validation.status,
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    ai_tokens_input: aggregatedTokensIn,
    ai_tokens_output: aggregatedTokensOut,
    ai_cost_estimate: aggregatedCost,
  };

  // Defensive pre-update log: complete payload zichtbaar in edge function logs
  // — bij volgende crash weten we onmiddellijk wat we probeerden te schrijven.
  console.log("[parse-factuur-v2] about to update factuur_uploads:", {
    factuurId,
    status: finalStatus,
    ai_parsing_status: aiParsingStatus,
    retries,
    blocked,
    blockedReason: blockedReason?.slice(0, 120) ?? null,
    subtotaal_excl_btw: safeSubtotaal,
    btw_regels_count: data.btw_regels?.length ?? 0,
    btw_percentage_uniform: uniformBtwPct,
    btw_bedrag_totaal: safeBtwBedrag,
    totaal_incl_btw: safeTotaal,
    regels_count: regels.length,
    validation_status: validation.status,
    n_errors: validation.errors.length,
    n_warnings: validation.warnings.length,
  });

  const { error: updErr } = await supabase
    .from("factuur_uploads")
    .update(updatePayload)
    .eq("id", factuurId);
  if (updErr) {
    console.error("[parse-factuur-v2] update factuur_uploads failed:", updErr);
    throw new Error(`Update factuur_uploads: ${updErr.message}`);
  }

  // ===========================================================
  // 9. Signal-evaluatie triggeren (fire-and-forget)
  // ===========================================================
  // IDEMPOTENT: evaluate-signals doet zelf dedup via dedup_key
  // ('inkoop_factuur_blocked:{factuur_id}'). Cron is safety net
  // wanneer deze trigger faalt; daarom non-fatal.
  try {
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/evaluate-signals`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location_id: locationId }),
      },
    );
  } catch (e) {
    console.warn(
      "[parse-factuur-v2] signal-evaluation trigger faalde (non-fatal):",
      e,
    );
  }

  // 10. Broadcast — incl. status zodat realtime UI direct refresh-t
  await broadcastFactuurStatus(supabase, locationId, {
    factuurId,
    aiParsingStatus,
    status: finalStatus,
  });

  return {
    data,
    validationStatus: validation.status,
    errors: validation.errors,
    warnings: validation.warnings,
    parseMethod,
    tokensInput: aggregatedTokensIn,
    tokensOutput: aggregatedTokensOut,
    costEur: aggregatedCost,
    retries,
    blocked,
    blockedReason,
    sumMismatch,
  };
}

// =====================================================
// Handler
// =====================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Ongeldige sessie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { factuurId?: string; dry_run?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Body moet JSON zijn" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const factuurId = body.factuurId;
    const dryRun = body.dry_run === true;

    if (!factuurId || typeof factuurId !== "string" || factuurId.length < 36) {
      return new Response(
        JSON.stringify({ error: "factuurId (uuid) is verplicht" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: factuur, error: fetchError } = await supabase
      .from("factuur_uploads")
      .select("*, locations!factuur_uploads_location_id_fkey(organization_id)")
      .eq("id", factuurId)
      .single();

    if (fetchError || !factuur) {
      return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const locationId = factuur.location_id as string;
    const organizationId = (factuur as any).locations?.organization_id as
      | string
      | undefined;
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Kan organisatie niet bepalen" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // DRY-RUN: synchronous, no claim, no factuur_regels writes.
    if (dryRun) {
      const startedAt = Date.now();

      try {
        await supabase
          .from("factuur_uploads")
          .update({
            v2_shadow_validation_status: "processing",
            v2_shadow_completed_at: null,
            v2_shadow_error: null,
            v2_shadow_response: null,
            v2_shadow_duration_ms: null,
          })
          .eq("id", factuurId);
      } catch (markerErr) {
        console.warn(
          "[parse-factuur-v2] start-marker write failed (non-blocking):",
          markerErr,
        );
      }

      try {
        const result = await asyncRunV2({
          supabase,
          factuurId,
          locationId,
          organizationId,
          bestandUrl: factuur.bestand_url as string,
          dryRun: true,
        });

        const durationMs = Date.now() - startedAt;

        const { error: shadowErr } = await supabase
          .from("factuur_uploads")
          .update({
            v2_shadow_response: result.data as unknown as Record<
              string,
              unknown
            >,
            v2_shadow_validation_status: result.validationStatus,
            v2_shadow_tokens_input: result.tokensInput,
            v2_shadow_tokens_output: result.tokensOutput,
            v2_shadow_cost_eur: result.costEur,
            v2_shadow_parse_method: result.parseMethod,
            v2_shadow_completed_at: new Date().toISOString(),
            v2_shadow_duration_ms: durationMs,
            v2_shadow_error: null,
          })
          .eq("id", factuurId);
        if (shadowErr) {
          console.warn(
            "[parse-factuur-v2] shadow persist failed (non-blocking):",
            shadowErr,
          );
        } else {
          console.log(
            `[parse-factuur-v2] shadow persisted factuurId=${factuurId} regels=${
              result.data.regels?.length ?? 0
            } tokens=${result.tokensInput}+${result.tokensOutput} cost=€${result.costEur} retries=${result.retries} blocked=${result.blocked} duration=${durationMs}ms`,
          );
        }

        return new Response(
          JSON.stringify({
            dry_run: true,
            factuurId,
            parse_method: result.parseMethod,
            validation_status: result.validationStatus,
            validation_errors: result.errors,
            validation_warnings: result.warnings,
            tokens_input: result.tokensInput,
            tokens_output: result.tokensOutput,
            cost_eur: result.costEur,
            duration_ms: durationMs,
            retries: result.retries,
            blocked: result.blocked,
            blocked_reason: result.blockedReason,
            sum_mismatch: result.sumMismatch,
            preview: result.data,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (e) {
        const durationMs = Date.now() - startedAt;
        const errName = (e as Error)?.name ?? "Error";
        const errMsg = (e as Error)?.message ?? String(e);
        console.error(
          `[parse-factuur-v2] dry-run failed factuurId=${factuurId} duration=${durationMs}ms:`,
          e,
        );
        await supabase
          .from("factuur_uploads")
          .update({
            v2_shadow_error: `${errName}: ${errMsg}`.slice(0, 2000),
            v2_shadow_completed_at: new Date().toISOString(),
            v2_shadow_duration_ms: durationMs,
            v2_shadow_validation_status: null,
            v2_shadow_response: null,
          })
          .eq("id", factuurId);
        return new Response(
          JSON.stringify({
            error: "extractie_mislukt",
            detail: `${errName}: ${errMsg}`,
            factuurId,
            duration_ms: durationMs,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // FULL RUN — race-guard + atomic claim
    if (factuur.ai_parsing_status === "processing") {
      return new Response(
        JSON.stringify({
          accepted: false,
          factuurId,
          reason: "already_processing",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (factuur.ai_parsing_status === "completed") {
      return new Response(
        JSON.stringify({
          accepted: false,
          factuurId,
          reason: "already_completed",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: claimed, error: claimErr } = await supabase
      .from("factuur_uploads")
      .update({ ai_parsing_status: "processing", parse_method: "ai_v2_text" })
      .eq("id", factuurId)
      .in("ai_parsing_status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (claimErr) {
      return new Response(
        JSON.stringify({ error: "Kon factuur niet claimen" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!claimed) {
      return new Response(
        JSON.stringify({ accepted: false, factuurId, reason: "race_lost" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "processing",
    });

    const job = (async () => {
      try {
        await asyncRunV2({
          supabase,
          factuurId,
          locationId,
          organizationId,
          bestandUrl: factuur.bestand_url as string,
          dryRun: false,
        });
      } catch (e) {
        // Verbeterde error-capture: stack-trace wordt opgeslagen voor post-mortem
        const errName = (e as Error)?.name ?? "Error";
        const errMsg = (e as Error)?.message ?? String(e);
        const errStack = (e as Error)?.stack ?? "";
        const detail = `${errName}: ${errMsg}`;
        console.error(
          `[parse-factuur-v2] async job failed factuurId=${factuurId}:`,
          detail,
          "\nstack:",
          errStack.slice(0, 1500),
        );
        await supabase
          .from("factuur_uploads")
          .update({
            ai_parsing_status: "failed",
            ai_raw_response: {
              error: "v2_async_failed",
              detail,
              stack: errStack.slice(0, 500),
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", factuurId);
        await broadcastFactuurStatus(supabase, locationId, {
          factuurId,
          aiParsingStatus: "failed",
        });
      }
    })();

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(job);
    } else {
      await job;
    }

    return new Response(
      JSON.stringify({ accepted: true, factuurId, version: "v2" }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[parse-factuur-v2] handler error:", err);
    return new Response(
      JSON.stringify({ error: "Interne fout", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
