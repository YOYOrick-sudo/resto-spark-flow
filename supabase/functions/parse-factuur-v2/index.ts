// supabase/functions/parse-factuur-v2/index.ts
// Sprint Factuur-AI V2 — Generieke AI-only extractor.
//
// AI-route = Lovable AI Gateway via _shared/ai.ts callAI().
// Geen Vertex AI, geen direct provider call.
//
// Flow:
//   1. Auth + body-validatie
//   2. Fetch factuur_uploads + locations.organization_id
//   3. Optionele race-guard (skipped voor dry_run)
//   4. Atomic claim ai_parsing_status='processing' + parse_method
//   5. EdgeRuntime.waitUntil(asyncRunV2)
//      a. Storage download
//      b. extractTextPerPage → scan-detectie
//      c. extractFactuur (Gemini Flash, structured output)
//      d. validateFactuur (5 checks)
//      e. Tier-1 cache lookup per regel (artikelnummer)
//      f. dry_run? → return preview, geen DB-writes
//      g. upsert leverancier + bulk insert factuur_regels
//      h. update factuur_uploads (status, validation_*, tokens, cost, raw)
//      i. broadcast factuur.status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { extractTextPerPage } from "../_shared/pdf-text.ts";
import { extractFactuur } from "../_shared/factuur-v2/extractor.ts";
import {
  validateFactuur,
  type ValidationStatus,
} from "../_shared/factuur-v2/validator.ts";
import { lookupTier1, upsertLeverancier } from "../_shared/factuur-v2/cache.ts";
import type {
  FactuurV2Output,
  FactuurV2Regel,
} from "../_shared/factuur-v2/types.ts";

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
  // "valid" en "warning" beide → completed (chef reviewt warnings in UI later).
  return "completed";
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

  // 3. Extract via Gemini
  const { data, raw } = await extractFactuur({
    text,
    isScanPdf,
    pdfBase64: isScanPdf ? uint8ToBase64(bytes) : undefined,
    organizationId,
    locationId,
  });

  // 4. Validatie
  const validation = validateFactuur(data);

  // 5. Dry-run → geen DB-writes
  if (dryRun) {
    return {
      data,
      validationStatus: validation.status,
      errors: validation.errors,
      warnings: validation.warnings,
      parseMethod,
      tokensInput: raw.inputTokens,
      tokensOutput: raw.outputTokens,
      costEur: raw.costEur,
    };
  }

  // 6. Upsert leverancier
  const leverancierId = await upsertLeverancier(
    supabase,
    locationId,
    data.leverancier_naam ?? "Onbekend",
    data.leverancier_btw_nummer,
  );

  // 7. Tier-1 cache lookup per regel
  const artikelnummers: string[] = (data.regels ?? [])
    .map((r) => (r.artikelnummer ?? "").trim())
    .filter((a) => a.length > 0);
  const cacheHits = leverancierId
    ? await lookupTier1(supabase, leverancierId, artikelnummers)
    : new Map();

  // 8. Bulk insert factuur_regels
  const regelRows = (data.regels ?? []).map((r: FactuurV2Regel) => {
    const artikelnummer = (r.artikelnummer ?? "").trim();
    const cacheHit = artikelnummer ? cacheHits.get(artikelnummer) : undefined;
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
      ingredient_id: cacheHit?.ingredient_id ?? null,
      is_nieuw_ingredient: !cacheHit,
      match_status: cacheHit ? "matched" : "unmatched",
      match_confidence: cacheHit ? 1.0 : null,
    };
  });

  if (regelRows.length > 0) {
    // Eerst oude regels weggooien (bij re-parse).
    await supabase.from("factuur_regels").delete().eq("factuur_id", factuurId);
    const { error: insErr } = await supabase.from("factuur_regels").insert(
      regelRows,
    );
    if (insErr) {
      console.error("[parse-factuur-v2] insert factuur_regels failed:", insErr);
      throw new Error(`Insert factuur_regels: ${insErr.message}`);
    }
  }

  // 9. Update factuur_uploads
  const aiParsingStatus = aiStatusFromValidation(validation.status);
  const { error: updErr } = await supabase
    .from("factuur_uploads")
    .update({
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
      totaalbedrag: data.totaal_incl_btw ?? null,
      validation_status: validation.status,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      ai_tokens_input: raw.inputTokens,
      ai_tokens_output: raw.outputTokens,
      ai_cost_estimate: raw.costEur,
    })
    .eq("id", factuurId);
  if (updErr) {
    console.error("[parse-factuur-v2] update factuur_uploads failed:", updErr);
    throw new Error(`Update factuur_uploads: ${updErr.message}`);
  }

  // 10. Broadcast
  await broadcastFactuurStatus(supabase, locationId, {
    factuurId,
    aiParsingStatus,
  });

  return {
    data,
    validationStatus: validation.status,
    errors: validation.errors,
    warnings: validation.warnings,
    parseMethod,
    tokensInput: raw.inputTokens,
    tokensOutput: raw.outputTokens,
    costEur: raw.costEur,
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

    // Fetch factuur + organization_id
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
    // WEL persistente shadow-velden op factuur_uploads (parallel-mode vergelijking).
    if (dryRun) {
      try {
        const result = await asyncRunV2({
          supabase,
          factuurId,
          locationId,
          organizationId,
          bestandUrl: factuur.bestand_url as string,
          dryRun: true,
        });

        // Shadow-write naar dedicated v2_shadow_* kolommen.
        // Conflict-vrij: V1 schrijft hier nooit in.
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
            } tokens=${result.tokensInput}+${result.tokensOutput} cost=€${result.costEur}`,
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
            preview: result.data,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (e) {
        console.error("[parse-factuur-v2] dry-run failed:", e);
        // Persist error voor zichtbaarheid in DB.
        await supabase
          .from("factuur_uploads")
          .update({
            v2_shadow_error: String(e).slice(0, 2000),
            v2_shadow_completed_at: new Date().toISOString(),
          })
          .eq("id", factuurId);
        return new Response(
          JSON.stringify({
            error: "extractie_mislukt",
            detail: String(e),
            factuurId,
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
        console.error("[parse-factuur-v2] async job failed:", e);
        await supabase
          .from("factuur_uploads")
          .update({
            ai_parsing_status: "failed",
            ai_raw_response: { error: "v2_async_failed", detail: String(e) },
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
      // dev fallback: just await
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
