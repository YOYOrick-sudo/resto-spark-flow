// supabase/functions/parse-pakbon/index.ts
// Sprint Pakbon V1 — AI-extractie van pakbon-PDF/image, matching naar
// ingredienten, vullen van goods_receipt_lines.
//
// AUTHENTICATIE:
//   Service-role only. verify_jwt=false in config.toml + IN-CODE check:
//   Authorization header MOET matchen met SUPABASE_SERVICE_ROLE_KEY,
//   anders 403. Dit voorkomt dat externe partijen direct kunnen triggeren.
//
// FLOW:
//   1. Auth check (service-role only)
//   2. Download attachment uit storage
//   3. AI-extractie via Lovable Gateway (Gemini 2.5 Pro, multimodal)
//   4. Match-cascade per regel via _shared/ingredientMatcher.ts
//   5. Bulk insert goods_receipt_lines (status=verwacht)
//   6. Update goods_receipts (ai_parse_status, totaal_regels_verwacht, etc.)
//   7. Update pakbon_email_intake.ai_parse_status
//   8. Link met openstaande interne_bestellingen indien mogelijk (best-effort)
//   9. Broadcast realtime update
//
// MULTI-LEVERANCIER:
//   Match-cascade kan ingredient hitten dat bij ANDERE leverancier hoort
//   (Tier-3 hit). NIET blokkeren — markeer is_nieuw_ingredient=false +
//   ingredient_id=bestaande. UI behandelt "extra leverancier vs nieuw" later.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai.ts";
import {
  matchIngredientLines,
  type MatchableLine,
} from "../_shared/ingredientMatcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =====================================================
// AI Schema voor pakbon-extractie
// =====================================================
const PAKBON_SCHEMA = {
  type: "object",
  properties: {
    extractie_status: { type: "string", enum: ["success", "partial", "failed"] },
    leverancier_naam: { type: "string" },
    pakbon_nummer: { type: ["string", "null"] },
    levering_datum: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    bestelnummer_referentie: { type: ["string", "null"] },
    regels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          artikelnummer: { type: ["string", "null"] },
          product_naam: { type: "string" },
          hoeveelheid_geleverd: {
            type: ["number", "null"],
            description: "Aantal verpakkingen besteld (kolom 'aantal' op pakbon).",
          },
          verpakking_eenheid: {
            type: ["string", "null"],
            enum: ["L", "kg", "stuk", null],
            description: "Voorraad-eenheid van het PRODUCT IN de verpakking (na g→kg / ml→l conversie).",
          },
          verpakking_hoeveelheid: {
            type: ["number", "null"],
            description: "Hoeveelheid per verpakking in voorraad-eenheid (bv. doos 14 stuks → 14, kist 20 kg → 20, zak 450 g → 0.45). null als verpakking-eenheid zelf de telbare eenheid is (bv. 1 bos = 1 bos).",
          },
          totaal_ontvangen_hoeveelheid: {
            type: ["number", "null"],
            description: "Berekende totaal in voorraad-eenheid: hoeveelheid_geleverd × verpakking_hoeveelheid (of hoeveelheid_geleverd als verpakking_hoeveelheid null is).",
          },
          is_weighted: {
            type: "boolean",
            description: "true als pakbon variabel gewicht aanduidt met ± / ca. / ~ / ongeveer.",
          },
          lotnummer: { type: ["string", "null"] },
          tht_datum: { type: ["string", "null"], description: "ISO date" },
          haccp_categorie: {
            type: ["string", "null"],
            enum: ["ambient", "gekoeld", "vries", "vis_op_ijs", null],
          },
          confidence: { type: ["string", "null"], enum: ["hoog", "medium", "laag", null] },
          confidence_score: {
            type: ["number", "null"],
            description: "Numerieke confidence 0.0-1.0. 0.95+ = standaard NL-pattern, 0.80-0.94 = kleine afkorting, 0.60-0.79 = afgeleid uit context, <0.60 = onzeker.",
          },
          reasoning: {
            type: ["string", "null"],
            description: "1 korte zin waarom je deze verpakking-factor koos.",
          },
        },
        required: ["product_naam", "verpakking_eenheid", "is_weighted"],
        additionalProperties: false,
      },
    },
  },
  required: ["extractie_status", "leverancier_naam", "regels"],
  additionalProperties: false,
} as const;

const PAKBON_SYSTEM_PROMPT = `Je bent een expert in het uitlezen van Nederlandse horeca-pakbonnen.
Een pakbon is een leveringsdocument zonder prijzen — alleen producten + aantallen.

EXTRACTIE-REGELS:
- product_naam: exacte productomschrijving zoals op pakbon (behoud haakjes/leestekens)
- artikelnummer: leverancier-eigen code (mag null zijn)
- hoeveelheid_geleverd: aantal eenheden geleverd (bv. 5 dozen → 5)
- verpakking_eenheid: STRIKT één van: "L" (liter), "kg" (gewicht), "stuk" (per item)
- verpakking_hoeveelheid: inhoud per verpakking (bv. doos 12×1L → 12)
- lotnummer: indien vermeld (verplicht voor HACCP-traceability)
- tht_datum: T.H.T. of "houdbaar tot" datum (ISO YYYY-MM-DD)
- haccp_categorie: schat in op basis van producttype:
    * "vries" voor diepvries (-18°C)
    * "gekoeld" voor zuivel/vlees/vis (2-7°C)
    * "vis_op_ijs" voor verse vis op ijs (0-2°C)
    * "ambient" voor droge waar (kamertemperatuur)
- confidence: "hoog" (zekere extractie), "medium" (kleine twijfel), "laag" (onleesbaar)

CRITICAL:
- Pakbonnen hebben GEEN prijzen — extraheer ALLEEN aantallen + producten
- Bij twijfel over verpakking: kies "stuk" en confidence "laag"
- Negeer kop/voet-tekst, leveringsadres, handtekening-velden
- bestelnummer_referentie = order/PO-nummer indien vermeld (voor matching)`;

// =====================================================
// Helpers
// =====================================================

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function parseJsonStrict<T>(text: string): T {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  return JSON.parse(cleaned) as T;
}

// =====================================================
// Mini-sprint 2C-3: Leverancier-naam normalisatie + matching
// =====================================================

/**
 * Normaliseer leverancier-naam voor vergelijking:
 * - lowercase
 * - strip B.V. / BV / N.V. / NV / V.O.F. / VOF (rechtsvormen)
 * - strip leestekens
 * - collapse whitespace
 */
function normalizeLeverancierNaam(s: string | null | undefined): string {
  if (!s) return "";
  let n = s.toLowerCase();
  // strip rechtsvormen (met/zonder punten/spaties, alleen aan einde-ish)
  n = n.replace(/\b(b\.?\s*v\.?|n\.?\s*v\.?|v\.?\s*o\.?\s*f\.?|holding|group|nederland)\b/gi, " ");
  // strip leestekens
  n = n.replace(/[^\p{L}\p{N}\s]/gu, " ");
  // collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter((t) => t.length >= 2);
}

/** Jaccard token-set overlap. */
function tokenSetOverlap(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : inter / union;
}

/** True als a in b zit, of b in a (na normalisatie, beide non-trivial). */
function isSubstringMatch(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  return a.includes(b) || b.includes(a);
}

interface LeverancierCandidate {
  id: string;
  naam: string;
}

/**
 * Match PDF-extracted leverancier-naam tegen lijst van bekende leveranciers.
 * Returns HIT (id+naam) of null (MISS).
 *
 * HIT-criteria (in volgorde):
 *   1. Exact match na normalisatie
 *   2. Token-set overlap >= 80%
 *   3. Substring beide kanten
 */
function matchPdfToLeverancier(
  pdfNaam: string | null | undefined,
  candidates: LeverancierCandidate[],
): LeverancierCandidate | null {
  if (!pdfNaam || candidates.length === 0) return null;
  const normPdf = normalizeLeverancierNaam(pdfNaam);
  if (normPdf.length === 0) return null;

  // Pass 1: exact normalized
  for (const c of candidates) {
    if (normalizeLeverancierNaam(c.naam) === normPdf) return c;
  }
  // Pass 2: token-set overlap >= 80%
  let bestOverlap: { c: LeverancierCandidate; score: number } | null = null;
  for (const c of candidates) {
    const score = tokenSetOverlap(normPdf, normalizeLeverancierNaam(c.naam));
    if (score >= 0.8 && (!bestOverlap || score > bestOverlap.score)) {
      bestOverlap = { c, score };
    }
  }
  if (bestOverlap) return bestOverlap.c;
  // Pass 3: substring beide kanten
  for (const c of candidates) {
    if (isSubstringMatch(normPdf, normalizeLeverancierNaam(c.naam))) return c;
  }
  return null;
}

interface PakbonExtractie {
  extractie_status: "success" | "partial" | "failed";
  leverancier_naam: string;
  pakbon_nummer?: string | null;
  levering_datum?: string | null;
  bestelnummer_referentie?: string | null;
  regels: Array<{
    artikelnummer?: string | null;
    product_naam: string;
    hoeveelheid_geleverd?: number | null;
    verpakking_eenheid?: "L" | "kg" | "stuk" | null;
    verpakking_hoeveelheid?: number | null;
    lotnummer?: string | null;
    tht_datum?: string | null;
    haccp_categorie?: "ambient" | "gekoeld" | "vries" | "vis_op_ijs" | null;
    confidence?: "hoog" | "medium" | "laag" | null;
  }>;
}

// =====================================================
// Handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ===========================================================
  // 1. Service-role auth check (verify_jwt=false vereist in-code check)
  // ===========================================================
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    console.warn("[parse-pakbon] unauthorized request");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 2. Parse + validate body
  // ===========================================================
  let body: {
    goods_receipt_id?: string;
    intake_id?: string;
    attachment_path?: string;
    sender_match_leverancier_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.goods_receipt_id || !body.attachment_path) {
    return new Response(
      JSON.stringify({ error: "Missing goods_receipt_id or attachment_path" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const senderMatchIds: string[] = Array.isArray(body.sender_match_leverancier_ids)
    ? body.sender_match_leverancier_ids
    : [];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ===========================================================
  // 3. Fetch goods_receipt voor context
  // ===========================================================
  const { data: receipt, error: recErr } = await supabase
    .from("goods_receipts")
    .select("id, location_id, organization_id, leverancier_id, bestelling_id")
    .eq("id", body.goods_receipt_id)
    .maybeSingle();

  if (recErr || !receipt) {
    console.error("[parse-pakbon] goods_receipt niet gevonden:", recErr);
    return new Response(JSON.stringify({ error: "Receipt not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 4. Download attachment uit storage
  // ===========================================================
  const { data: blob, error: dlErr } = await supabase.storage
    .from("pakbonnen")
    .download(body.attachment_path);

  if (dlErr || !blob) {
    console.error("[parse-pakbon] attachment download failed:", dlErr);
    await markFailed(supabase, receipt.id, body.intake_id, "Attachment download failed");
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64 = uint8ToBase64(bytes);
  const mimeType = blob.type || "application/pdf";

  // ===========================================================
  // 5. AI-extractie via Lovable Gateway (Gemini 2.5 Pro)
  // ===========================================================
  const aiModel = "google/gemini-2.5-pro";
  let extractie: PakbonExtractie;
  let aiCost = 0;
  let aiTokensIn = 0;
  let aiTokensOut = 0;

  try {
    const aiResponse = await callAI({
      featureKey: "parse-pakbon",
      organizationId: receipt.organization_id,
      locationId: receipt.location_id,
      systemPrompt: PAKBON_SYSTEM_PROMPT,
      prompt: "Extraheer deze pakbon volgens het schema.",
      documents: [{ data: base64, mimeType }],
      modelOverride: aiModel,
      temperature: 0.0,
      maxTokens: 30000,
      timeoutMs: 180_000,
      responseSchema: {
        name: "pakbon_extractie",
        strict: true,
        schema: PAKBON_SCHEMA,
      },
    } as any);

    extractie = parseJsonStrict<PakbonExtractie>(aiResponse.text);
    aiCost = aiResponse.costEur ?? 0;
    aiTokensIn = aiResponse.inputTokens ?? 0;
    aiTokensOut = aiResponse.outputTokens ?? 0;
  } catch (err) {
    console.error("[parse-pakbon] AI extractie failed:", err);
    await markFailed(
      supabase,
      receipt.id,
      body.intake_id,
      `AI extractie faalde: ${(err as Error).message?.slice(0, 200)}`,
    );
    return new Response(JSON.stringify({ error: "AI extraction failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (extractie.extractie_status === "failed" || extractie.regels.length === 0) {
    await markFailed(
      supabase,
      receipt.id,
      body.intake_id,
      "AI kon geen regels extraheren",
    );
    return new Response(
      JSON.stringify({ status: "failed", reason: "no_regels" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 5b. Mini-sprint 2C-3: Sender + PDF cross-verificatie leverancier
  // ===========================================================
  // Fetch alle actieve leveranciers van de location
  const { data: alleLeveranciers, error: levErr } = await supabase
    .from("leveranciers")
    .select("id, naam")
    .eq("location_id", receipt.location_id)
    .eq("is_actief", true);

  if (levErr) {
    console.warn("[parse-pakbon] kon leveranciers niet ophalen:", levErr);
  }

  const allCandidates: LeverancierCandidate[] = (alleLeveranciers ?? []) as LeverancierCandidate[];
  const senderCandidates: LeverancierCandidate[] = allCandidates.filter((c) =>
    senderMatchIds.includes(c.id)
  );
  const senderNames = senderCandidates.map((c) => c.naam);

  const pdfNaam = extractie.leverancier_naam ?? null;
  // PDF-match wordt ALTIJD getest tegen ALLE leveranciers (niet alleen sender-candidates)
  const pdfMatchAll = matchPdfToLeverancier(pdfNaam, allCandidates);
  // Voor scenario c: PDF-match binnen de sender-candidates
  const pdfMatchInSender = matchPdfToLeverancier(pdfNaam, senderCandidates);

  let chosen: LeverancierCandidate | null = null;
  let warning = false;
  let warningReason: string | null = null;
  let scenario: "a" | "b1" | "b2" | "b3" | "c" | "d" | "e" | "f" = "f";

  if (senderCandidates.length === 1) {
    const sender = senderCandidates[0];
    if (pdfMatchAll && pdfMatchAll.id === sender.id) {
      // a: 1 sender, PDF bevestigt
      scenario = "a";
      chosen = sender;
    } else if (!pdfMatchAll) {
      // b1: 1 sender, PDF onbekend
      scenario = "b1";
      chosen = sender;
    } else if (pdfMatchAll && pdfMatchAll.id !== sender.id) {
      // b2: 1 sender, PDF matcht ANDERE bekende leverancier (HIGH-CONF) → PDF wint
      scenario = "b2";
      chosen = pdfMatchAll;
      warning = true;
      warningReason =
        `Afzenderdomein hoort bij ${sender.naam}, maar PDF lijkt van ${pdfMatchAll.naam}. ` +
        `Toegewezen op basis van PDF-inhoud.`;
    } else {
      // b3 fallback (low-conf zou hier landen, maar matchPdfToLeverancier returnt of HIT of null)
      scenario = "b3";
      chosen = sender;
      warning = true;
      warningReason = `PDF-leverancier "${pdfNaam ?? "?"}" kon niet met zekerheid worden gekoppeld.`;
    }
  } else if (senderCandidates.length > 1) {
    if (pdfMatchInSender) {
      // c: meerdere senders, PDF resolveert
      scenario = "c";
      chosen = pdfMatchInSender;
    } else {
      // d: meerdere senders, PDF herkent geen
      scenario = "d";
      chosen = senderCandidates[0];
      warning = true;
      warningReason =
        `Afzenderdomein matcht meerdere leveranciers (${senderNames.join(", ")}). ` +
        `Eerste match gekozen — controleer leverancier.`;
    }
  } else {
    // 0 sender matches
    if (pdfMatchAll) {
      // e: geen sender, PDF herkent
      scenario = "e";
      chosen = pdfMatchAll;
      warning = true;
      warningReason =
        `Afzender onbekend — leverancier toegewezen op basis van PDF-inhoud (${pdfMatchAll.naam}).`;
    } else {
      // f: geen sender, geen PDF-match → houd null (huidig fallback gedrag)
      scenario = "f";
      chosen = null;
    }
  }

  console.log(
    `[leverancier-decision] receipt=${receipt.id} scenario=${scenario} ` +
      `sender_matches=[${senderMatchIds.join(",")}] sender_names=[${senderNames.join("|")}] ` +
      `pdf_name="${pdfNaam ?? ""}" pdf_match_id=${pdfMatchAll?.id ?? "null"} ` +
      `pdf_match_name=${pdfMatchAll?.naam ?? "null"} ` +
      `chosen=${chosen?.id ?? "null"} chosen_name=${chosen?.naam ?? "null"} warning=${warning}`,
  );

  // Effectieve leverancier voor matching (kan null zijn bij scenario f)
  const effectiveLeverancierId = chosen?.id ?? null;

  // ===========================================================
  // 6. Match-cascade per regel via shared matcher
  // ===========================================================
  const matchableLines: MatchableLine[] = extractie.regels.map((r) => ({
    artikelnummer: r.artikelnummer ?? null,
    product_naam: r.product_naam,
    verpakking_eenheid: r.verpakking_eenheid ?? null,
    verpakking_hoeveelheid: r.verpakking_hoeveelheid ?? null,
  }));

  const { matches, stats } = await matchIngredientLines(supabase, {
    locationId: receipt.location_id,
    leverancierId: effectiveLeverancierId,
    lines: matchableLines,
    autoUpsertOnTier34: true,
  });

  console.log(
    `[parse-pakbon] match-stats receipt=${receipt.id} tier1=${stats.tier1} tier2=${stats.tier2} tier3=${stats.tier3} tier4=${stats.tier4} unmatched=${stats.unmatched}`,
  );

  // ===========================================================
  // 7. Best-effort: link met openstaande interne_bestelling
  // (alleen als bestelnummer_referentie matcht en nog geen bestelling_id)
  // ===========================================================
  let bestellingId: string | null = receipt.bestelling_id;
  if (!bestellingId && extractie.bestelnummer_referentie) {
    const { data: bestMatch } = await supabase
      .from("interne_bestellingen")
      .select("id")
      .eq("location_id", receipt.location_id)
      .ilike("bestelnummer", extractie.bestelnummer_referentie.trim())
      .maybeSingle();
    if (bestMatch?.id) bestellingId = bestMatch.id;
  }

  // ===========================================================
  // 8. Bulk insert goods_receipt_lines
  // ===========================================================
  const lineRows = extractie.regels.map((r, idx) => {
    const hit = matches[idx];
    const conf = r.confidence === "hoog" ? 0.95 : r.confidence === "medium" ? 0.7 : 0.4;
    return {
      goods_receipt_id: receipt.id,
      product_naam_herkend: r.product_naam,
      ai_raw_naam: r.product_naam,
      ai_raw_artikelnummer: (r.artikelnummer ?? "").trim() || null,
      ai_confidence: conf,
      hoeveelheid_verwacht: r.hoeveelheid_geleverd ?? null,
      eenheid_verwacht: r.verpakking_eenheid ?? null,
      ingredient_id: hit?.ingredient_id ?? null,
      is_nieuw_ingredient: !hit,
      match_status: hit ? "matched" : "unmatched",
      match_confidence: hit ? hit.confidence : null,
      haccp_categorie: r.haccp_categorie ?? null,
      lotnummer: r.lotnummer ?? null,
      tht_datum: r.tht_datum ?? null,
      status: "verwacht" as const,
    };
  });

  // Idempotent: delete existing → insert (re-run scenario)
  await supabase.from("goods_receipt_lines").delete().eq("goods_receipt_id", receipt.id);
  const { error: insErr } = await supabase
    .from("goods_receipt_lines")
    .insert(lineRows);

  if (insErr) {
    console.error("[parse-pakbon] insert lines failed:", insErr);
    await markFailed(supabase, receipt.id, body.intake_id, `Insert lines: ${insErr.message}`);
    return new Response(JSON.stringify({ error: "Insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 9. Update goods_receipts
  // ===========================================================
  const aiParseStatus = extractie.extractie_status === "partial" ? "partial" : "success";
  const overallConfidence = extractie.regels.length > 0
    ? extractie.regels.reduce((s, r) => {
        const c = r.confidence === "hoog" ? 0.95 : r.confidence === "medium" ? 0.7 : 0.4;
        return s + c;
      }, 0) / extractie.regels.length
    : null;

  const { error: updErr } = await supabase
    .from("goods_receipts")
    .update({
      ai_parse_status: aiParseStatus,
      ai_raw_response: extractie as unknown as Record<string, unknown>,
      ai_model_version: aiModel,
      ai_parse_confidence: overallConfidence,
      pakbon_nummer: extractie.pakbon_nummer ?? null,
      levering_datum: extractie.levering_datum ?? null,
      bestelling_id: bestellingId,
      totaal_regels_verwacht: extractie.regels.length,
      leverancier_id: effectiveLeverancierId,
      leverancier_warning: warning,
      leverancier_warning_reason: warningReason,
    })
    .eq("id", receipt.id);

  if (updErr) {
    console.error("[parse-pakbon] update receipt failed:", updErr);
  }

  // ===========================================================
  // 10. Update pakbon_email_intake
  // ===========================================================
  if (body.intake_id) {
    await supabase
      .from("pakbon_email_intake")
      .update({ ai_parse_status: aiParseStatus })
      .eq("id", body.intake_id);
  }

  // ===========================================================
  // 11. Broadcast realtime update
  // ===========================================================
  try {
    const channel = supabase.channel(`inkoop:${receipt.location_id}`);
    await channel.send({
      type: "broadcast",
      event: "goods_receipt.parsed",
      payload: {
        goods_receipt_id: receipt.id,
        ai_parse_status: aiParseStatus,
        regels_count: extractie.regels.length,
        unmatched: stats.unmatched,
      },
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.warn("[parse-pakbon] broadcast failed:", err);
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      goods_receipt_id: receipt.id,
      ai_parse_status: aiParseStatus,
      regels_count: extractie.regels.length,
      match_stats: stats,
      ai_cost_eur: aiCost,
      ai_tokens: { input: aiTokensIn, output: aiTokensOut },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

// =====================================================
// Helper: markeer als failed (gebruikt in alle error-paden)
// =====================================================
async function markFailed(
  supabase: ReturnType<typeof createClient>,
  receiptId: string,
  intakeId: string | undefined,
  reason: string,
) {
  await supabase
    .from("goods_receipts")
    .update({ ai_parse_status: "failed" })
    .eq("id", receiptId);
  if (intakeId) {
    await supabase
      .from("pakbon_email_intake")
      .update({ ai_parse_status: "failed", error_reason: reason.slice(0, 500) })
      .eq("id", intakeId);
  }
}
