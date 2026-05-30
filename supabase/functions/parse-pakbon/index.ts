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
  stripPackagingSuffix,
  type MatchableLine,
} from "../_shared/ingredientMatcher.ts";
import { extractTextPerPage } from "../_shared/pdf-text.ts";
import { isNonFoodLine } from "../_shared/nonFoodDetector.ts";

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
          verpakking_woord: {
            type: ["string", "null"],
            description: "Het verpakking-LABEL letterlijk zoals op pakbon ('kist', 'doos', 'pak', 'zak', 'fles', 'krat', 'bos', 'tray', 'emmer', 'bundel'). NIET de inhoud-eenheid. Bij 'per stuk' of geen verpakking-vorm: null.",
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
          is_non_food: {
            type: "boolean",
            description: "true als regel non-food is (wegwerp/schoonmaak/emballage/servies). false voor eten en drinken.",
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

EXTRACTIE-REGELS PER REGEL:
- product_naam: exacte productomschrijving zoals op pakbon (behoud haakjes/leestekens)
- artikelnummer: leverancier-eigen code (mag null zijn)
- hoeveelheid_geleverd: aantal VERPAKKINGEN besteld (kolom 'aantal' van pakbon, bv. 2 kisten → 2)
- verpakking_eenheid: STRIKT één van "L" | "kg" | "stuk" — de voorraad-eenheid van het PRODUCT in de verpakking
- verpakking_hoeveelheid: hoeveel product zit er PER verpakking, in voorraad-eenheid
- verpakking_woord: het LABEL van de verpakking letterlijk uit productnaam ("kist", "doos", "pak", "zak", "fles", "krat", "bos", "tray", "emmer", "bundel"). Lowercase. Null bij "per stuk" of als er geen verpakking-vorm staat.
- totaal_ontvangen_hoeveelheid: hoeveelheid_geleverd × verpakking_hoeveelheid (of = hoeveelheid_geleverd als verpakking_hoeveelheid null)
- is_weighted: true als pakbon ± / ca. / ~ / ongeveer / circa aanduidt (variabel gewicht)
- lotnummer / tht_datum: indien vermeld
- haccp_categorie: "vries" | "gekoeld" | "vis_op_ijs" | "ambient"
- is_non_food: true voor niet-eetbaar (deksels, bekers, lunchboxen, bakjes, vacuumzakken, servetten, folie, rietjes, schoonmaakmiddelen, fust/emballage/statiegeld/rolcontainer/pallet). false voor alle voedsel & drank.
- confidence: "hoog" | "medium" | "laag" (text)
- confidence_score: numeriek 0.0-1.0 (zie rubriek hieronder)
- reasoning: 1 korte zin over je verpakking-keuze

VERPAKKING-EXTRACTIE — kritisch voor voorraad-correctheid

GLOSSARIUM (afkortingen → eenheid):
  ds, doos, krt, karton  → verpakking met inhoud
  kist, kt               → kist
  krat                   → krat
  pak, pk                → pak
  zak, zk                → zak
  bs, bos                → bos (behandel als 1 stuk = 1 bos)
  bdl, bundel            → bundel
  tr, tray               → tray
  emm, emmer             → emmer
  fl, fls, fles          → fles
  st, stk, stuks, stuk   → stuks
  gr, g, gram            → g (CONVERTEER naar kg in verpakking_hoeveelheid)
  kg, kilo               → kg
  ml                     → ml (CONVERTEER naar L in verpakking_hoeveelheid)
  l, ltr, lt, liter      → L

GETALFORMAAT (Nederlandse pakbonnen):
  Komma = decimaal: "4,5 kg" → 4.5
  Punt = duizendtal in groot getal: "1.250 g" → 1250 → converteer naar 1.25 kg

CONVERSIE: ALTIJD g→kg en ml→L in verpakking_hoeveelheid + totaal_ontvangen_hoeveelheid.
"Bos" / "tray eieren" / "krat" → behandel als verpakking_eenheid="stuk".

CONFIDENCE-RUBRIEK (NIET DEFAULT 0.95!):
  0.95-1.00 → standaard NL-pattern, alle velden helder ("kist 20 kg")
  0.80-0.94 → hoge zekerheid, kleine afkorting in glossarium ("ds 4,5 kg")
  0.60-0.79 → medium, eenheid afgeleid uit context
  <0.60     → laag, vraag review

FEW-SHOT VOORBEELDEN:

Voorbeeld 1 — Multi-pack op gewicht:
  Pakbon: "Aardappel agria kist 20kg" + aantal=2
  → verpakking_eenheid="kg", verpakking_hoeveelheid=20,
     hoeveelheid_geleverd=2, totaal_ontvangen_hoeveelheid=40,
     is_weighted=false, confidence_score=0.95,
     reasoning="Kist van 20 kg, 2 kisten besteld = 40 kg totaal"

Voorbeeld 2 — Doos met stuks (klassieke conversie!):
  Pakbon: "Bosuien (kort) doos 14 stuks" + aantal=1
  → verpakking_eenheid="stuk", verpakking_hoeveelheid=14,
     hoeveelheid_geleverd=1, totaal_ontvangen_hoeveelheid=14,
     is_weighted=false, confidence_score=0.95,
     reasoning="Doos van 14 stuks, 1 doos = 14 stuks totaal"

Voorbeeld 3 — NL-decimaal:
  Pakbon: "Limoen ds 4,5 kg" + aantal=1
  → verpakking_eenheid="kg", verpakking_hoeveelheid=4.5,
     hoeveelheid_geleverd=1, totaal_ontvangen_hoeveelheid=4.5,
     is_weighted=false, confidence_score=0.92,
     reasoning="Doos van 4,5 kg (NL-comma decimaal)"

Voorbeeld 4 — Bos = eenheid zelf:
  Pakbon: "Koriander bos" + aantal=4
  → verpakking_eenheid="stuk", verpakking_hoeveelheid=null,
     hoeveelheid_geleverd=4, totaal_ontvangen_hoeveelheid=4,
     is_weighted=false, confidence_score=0.95,
     reasoning="Bos is zelf de telbare eenheid, 4 bossen besteld"

Voorbeeld 5 — Variabel gewicht (KRITIEK):
  Pakbon: "Tauge zak ca. 1 kg" + aantal=1
  → verpakking_eenheid="kg", verpakking_hoeveelheid=1.0,
     hoeveelheid_geleverd=1, totaal_ontvangen_hoeveelheid=1.0,
     is_weighted=true (BELANGRIJK!), confidence_score=0.85,
     reasoning="Variabel gewicht aangeduid met 'ca.', chef vult werkelijk gewicht in"

Voorbeeld 6 — Gram conversie:
  Pakbon: "Spinazie zak 450 gr" + aantal=1
  → verpakking_eenheid="kg", verpakking_hoeveelheid=0.45,
     hoeveelheid_geleverd=1, totaal_ontvangen_hoeveelheid=0.45,
     is_weighted=false, confidence_score=0.93,
     reasoning="Zak van 450 g geconverteerd naar 0.45 kg voorraad-eenheid"

CRITICAL:
- Pakbonnen hebben GEEN prijzen — extraheer ALLEEN aantallen + producten
- Bij twijfel over verpakking: kies "stuk", verpakking_hoeveelheid=null, confidence_score laag
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

interface PakbonExtractieRegel {
  artikelnummer?: string | null;
  product_naam: string;
  hoeveelheid_geleverd?: number | null;
  verpakking_eenheid?: "L" | "kg" | "stuk" | null;
  verpakking_hoeveelheid?: number | null;
  verpakking_woord?: string | null;
  totaal_ontvangen_hoeveelheid?: number | null;
  is_weighted?: boolean | null;
  lotnummer?: string | null;
  tht_datum?: string | null;
  haccp_categorie?: "ambient" | "gekoeld" | "vries" | "vis_op_ijs" | null;
  confidence?: "hoog" | "medium" | "laag" | null;
  confidence_score?: number | null;
  reasoning?: string | null;
  is_non_food?: boolean | null;
}

interface PakbonExtractie {
  extractie_status: "success" | "partial" | "failed";
  leverancier_naam: string;
  pakbon_nummer?: string | null;
  levering_datum?: string | null;
  bestelnummer_referentie?: string | null;
  regels: PakbonExtractieRegel[];
}

// =====================================================
// Sprint 2E Loop 1b — Hybride model-strategie
// shouldEscalateToPro(): bepaalt of een Flash-resultaat goed genoeg is.
//
// CHECKS (universeel — werkt voor ELKE leverancier, geen hardcoded namen):
//   1. Parse-failure         → lines.length === 0
//   2. Regelnummers vs lines → tel "1 ", "2 " etc. patronen in source-text;
//                              extractie < 90% van pdf-lines → escalate
//                              SKIP bij scan-PDF (geen text)
//   3. Confidence reliability → > 20% van regels heeft confidence_score < 0.65
//   4. Data-volledigheid     → lege naam OF qty <= 0 OF unit niet in
//                              [kg, g, l, ml, L, stuk]
//   5. Source-grounding      → > 2 regels waarvan productnaam (eerste 10 chars)
//                              niet voorkomt in PDF source-text
//                              SKIP bij scan-PDF
//   6. Bedragen-rekenkunde   → ALLEEN als bedragen aanwezig op pakbon
//                              (niet bij Bidfood/Sligro/Hanos pakbonnen)
//                              Skip in V1 — we extraheren geen bedragen op
//                              pakbon-niveau (alleen op factuur).
//
// Returns checksRun voor logging-transparantie.
// =====================================================

interface EscalationDecision {
  escalate: boolean;
  reason: string;
  checksRun: string[];
}

const VALID_UNITS = new Set(["kg", "g", "l", "ml", "L", "stuk"]);

function shouldEscalateToPro(
  flashResult: PakbonExtractie,
  sourceText: string | null,
): EscalationDecision {
  const checksRun: string[] = [];
  const failures: string[] = [];

  // CHECK 1: parse-failure
  checksRun.push("1");
  if (!flashResult.regels || flashResult.regels.length === 0) {
    return {
      escalate: true,
      reason: `parse_failure (checks: ${checksRun.join(",")})`,
      checksRun,
    };
  }

  // CHECK 2: regelnummers vs extractie (alleen bij text-PDF)
  if (sourceText) {
    checksRun.push("2");
    // Regex: regelnummer aan begin van een line, gevolgd door whitespace + alpha
    const lineNumberMatches = sourceText.match(/^\s*\d+\s+[A-Za-z]/gm) ?? [];
    const pdfLineCount = lineNumberMatches.length;
    if (pdfLineCount > 0) {
      const ratio = flashResult.regels.length / pdfLineCount;
      if (ratio < 0.9) {
        failures.push(
          `lines_missing (extracted=${flashResult.regels.length}/${pdfLineCount}, ratio=${ratio.toFixed(2)})`,
        );
      }
    }
  }

  // CHECK 3: confidence reliability
  checksRun.push("3");
  const lowConfRegels = flashResult.regels.filter((r) => {
    const score = r.confidence_score ?? 0;
    return score < 0.65;
  });
  const lowConfRatio = lowConfRegels.length / flashResult.regels.length;
  if (lowConfRatio > 0.2) {
    failures.push(
      `low_confidence (${lowConfRegels.length}/${flashResult.regels.length} regels < 0.65)`,
    );
  }

  // CHECK 4: data-volledigheid
  checksRun.push("4");
  const incompleteRegels = flashResult.regels.filter((r) => {
    if (!r.product_naam || r.product_naam.trim().length === 0) return true;
    if (r.hoeveelheid_geleverd != null && r.hoeveelheid_geleverd <= 0) return true;
    if (r.verpakking_eenheid && !VALID_UNITS.has(r.verpakking_eenheid)) return true;
    return false;
  });
  if (incompleteRegels.length > 0) {
    failures.push(`data_incomplete (${incompleteRegels.length} regels)`);
  }

  // CHECK 5: source-grounding (anti-hallucinatie, alleen bij text-PDF)
  if (sourceText) {
    checksRun.push("5");
    const sourceLower = sourceText.toLowerCase();
    const ungroundedRegels = flashResult.regels.filter((r) => {
      const stem = (r.product_naam ?? "").toLowerCase().slice(0, 10).trim();
      if (stem.length < 4) return false; // skip te-korte namen
      return !sourceLower.includes(stem);
    });
    if (ungroundedRegels.length > 2) {
      failures.push(`hallucination_suspected (${ungroundedRegels.length} regels niet in source)`);
    }
  }

  // CHECK 6: bedragen-rekenkunde — V1 skip (pakbonnen extraheren geen bedragen).
  // Toekomst: als we ooit subtotaal/totaal op pakbon extraheren, hier toevoegen.

  if (failures.length === 0) {
    return {
      escalate: false,
      reason: `pass (checks: ${checksRun.join(",")})`,
      checksRun,
    };
  }

  return {
    escalate: true,
    reason: `${failures.join(" | ")} (checks: ${checksRun.join(",")})`,
    checksRun,
  };
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
  // 5. AI-extractie — Sprint 2E Loop 1b: hybride model-strategie
  //    Flash default (€0.005), Pro fallback bij quality-checks fail.
  // ===========================================================
  const FLASH_MODEL = "google/gemini-2.5-flash";
  const PRO_MODEL = "google/gemini-2.5-pro";
  let extractie: PakbonExtractie;
  let aiCost = 0;
  let aiTokensIn = 0;
  let aiTokensOut = 0;
  let aiModel: string = FLASH_MODEL;
  let escalated = false;
  let escalationReason: string | null = null;

  // 5a. Extract source-text uit PDF (voor checks 2 + 5).
  // Bij scan-PDF (geen tekst-laag) → null → checks 2+5 worden geskipt.
  let sourceText: string | null = null;
  if (mimeType === "application/pdf") {
    try {
      const textResult = await extractTextPerPage(bytes);
      if (textResult.pages && textResult.pages.length > 0) {
        sourceText = textResult.pages.join("\n");
      }
      console.log(
        `[parse-pakbon] pdf-text receipt=${receipt.id} pages=${textResult.stats.total_pages} ` +
          `chars=${textResult.stats.total_chars} scan_detected=${textResult.stats.scan_detected}`,
      );
    } catch (err) {
      console.warn("[parse-pakbon] pdf-text extraction failed (treating as scan):", err);
    }
  }

  const aiCallBase = {
    featureKey: "parse-pakbon",
    organizationId: receipt.organization_id,
    locationId: receipt.location_id,
    systemPrompt: PAKBON_SYSTEM_PROMPT,
    prompt: "Extraheer deze pakbon volgens het schema.",
    documents: [{ data: base64, mimeType }],
    temperature: 0.0,
    maxTokens: 30000,
    timeoutMs: 180_000,
    responseSchema: {
      name: "pakbon_extractie",
      strict: true,
      schema: PAKBON_SCHEMA,
    },
    skipFallback: true, // wij regelen onze eigen escalation
  };

  // 5b. Eerste poging: Flash met reasoning=none
  try {
    const flashResponse = await callAI({
      ...aiCallBase,
      modelOverride: FLASH_MODEL,
      reasoningEffort: "none",
    } as any);

    const flashExtractie = parseJsonStrict<PakbonExtractie>(flashResponse.text);

    // 5c. Quality-checks
    const decision = shouldEscalateToPro(
      flashExtractie,
      sourceText,
    );
    // Als source-text ontbreekt EN andere checks passen, log dat als info
    const sourceMissingNote = !sourceText ? " | source: scan_pdf_no_text" : "";

    console.log(
      `[parse-pakbon] flash-checks receipt=${receipt.id} escalate=${decision.escalate} ` +
        `reason="${decision.reason}${sourceMissingNote}"`,
    );

    if (!decision.escalate) {
      // ✅ Flash slaagt → gebruik Flash-resultaat
      extractie = flashExtractie;
      aiModel = FLASH_MODEL;
      aiCost = flashResponse.costEur ?? 0;
      aiTokensIn = flashResponse.inputTokens ?? 0;
      aiTokensOut = flashResponse.outputTokens ?? 0;
    } else {
      // ⚠️ Escalate → markeer Flash-row + retry met Pro
      escalated = true;
      escalationReason = decision.reason + sourceMissingNote;

      // Re-log Flash met escalated_to_pro=true via een tweede dummy log call?
      // Probleem: callAI heeft Flash-row al gelogd zonder escalation flag.
      // Oplossing: directe insert in ai_logs voor de escalation-marker (Flash-row update).
      // De callAI logging gebruikt zijn eigen rij; wij voegen een aparte marker-row toe.
      try {
        await supabase.from("ai_logs").insert({
          feature: "parse-pakbon",
          organization_id: receipt.organization_id,
          location_id: receipt.location_id,
          model: FLASH_MODEL,
          status: "escalated",
          escalated_to_pro: true,
          escalation_reason: escalationReason.slice(0, 500),
          input_tokens: 0,
          output_tokens: 0,
          cost_eur: 0,
          was_fallback: false,
        });
      } catch (logErr) {
        console.warn("[parse-pakbon] kon escalation-marker niet loggen:", logErr);
      }

      // Pro retry
      const proResponse = await callAI({
        ...aiCallBase,
        modelOverride: PRO_MODEL,
        reasoningEffort: "medium",
      } as any);

      extractie = parseJsonStrict<PakbonExtractie>(proResponse.text);
      aiModel = PRO_MODEL;
      // Som: Flash + Pro kosten samen voor volledige transparantie in summary
      aiCost = (flashResponse.costEur ?? 0) + (proResponse.costEur ?? 0);
      aiTokensIn = (flashResponse.inputTokens ?? 0) + (proResponse.inputTokens ?? 0);
      aiTokensOut = (flashResponse.outputTokens ?? 0) + (proResponse.outputTokens ?? 0);
    }
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
  //    Loop 4C-FINISH:
  //      - Emballage-detect (status='emballage_skip', geen voorraad-mutatie)
  //      - Auto-link via fuzzy_match_ingredient (threshold 0.7)
  //      - Auto-create ingredient bij volledige AI-data (created_by_source='ai_pakbon')
  //      - Per-stuk default: ai_package_unit='stuk' & qty=null → qty=1
  //    Universeel: regex op productnaam-features, geen leverancier-namen.
  // ===========================================================

  // Regex pre-pass: NL-verpakking-woorden uit productnaam (universeel, geen
  // hardcoded leveranciers). Wordt alleen gebruikt als AI géén verpakking_woord
  // heeft afgegeven.
  const PACKAGING_LABEL_RE =
    /\b(kist|doos|pak|zak|fles|krat|bos|tray|emmer|bundel|ds|krt|karton|bdl|bus|fl|fls|emm)\b/i;
  const LABEL_NORMALISE: Record<string, string> = {
    ds: "doos",
    krt: "doos",
    karton: "doos",
    bdl: "bundel",
    bus: "bus",
    fl: "fles",
    fls: "fles",
    emm: "emmer",
  };
  function detectPackagingLabel(productNaam: string): string | null {
    if (!productNaam) return null;
    const m = productNaam.match(PACKAGING_LABEL_RE);
    if (!m) return null;
    const raw = m[1].toLowerCase();
    return LABEL_NORMALISE[raw] ?? raw;
  }

  // Non-food / emballage skip-detect. Generiek (geen leveranciersnamen) via
  // gedeelde helper: AI-flag is_non_food OF word-boundary keyword-match.
  // Status blijft 'emballage_skip' (semantiek "niet meegerekend" dekt zowel
  // emballage als andere non-food).
  function isSkipLine(r: PakbonExtractieRegel): boolean {
    return isNonFoodLine(r.product_naam, r.is_non_food).isNonFood;
  }

  // Normaliseer ai_package_unit naar voorraad base_unit voor auto-create.
  // DB-constraint: base_unit ∈ {'g','ml','st'}. Alle gewichten → g, alle
  // volumes → ml, alle stuks → st. Conversie-factoren komen later via
  // ai_per_package_quantity (bv. 1 fles = 0.7 L = 700 ml).
  function normalizeBaseUnit(unit: string | null | undefined): "g" | "ml" | "st" {
    const u = (unit ?? "").toLowerCase().trim();
    if (u === "g" || u === "gr" || u === "gram" || u === "kg" || u === "kilogram") return "g";
    if (u === "ml" || u === "cl" || u === "dl" || u === "l" || u === "liter") return "ml";
    if (u === "st" || u === "stuk" || u === "stuks" || u === "pcs" || u === "piece") return "st";
    return "st"; // veilige fallback
  }

  // Pas 0: per-stuk default — Koriander/Kool/Paksoi pattern.
  // Als unit='stuk' en qty=null → qty=1 (impliciet 1 verpakking = 1 stuk).
  // Veilig: dit is universeel correct voor "per stuk"-producten.
  for (const r of extractie.regels) {
    if (
      (r.verpakking_eenheid ?? "").toLowerCase() === "stuk" &&
      (r.verpakking_hoeveelheid == null || r.verpakking_hoeveelheid === 0)
    ) {
      r.verpakking_hoeveelheid = 1;
      if (!r.reasoning) {
        r.reasoning = "Per-stuk default: 1 verpakking = 1 stuk (auto)";
      }
    }
  }

  // Pas 1: fuzzy auto-link voor unmatched regels (skip emballage).
  const unmatchedFuzzyTargets: { idx: number; cleanNaam: string }[] = [];
  for (let i = 0; i < extractie.regels.length; i++) {
    if (matches[i]) continue;
    const r = extractie.regels[i];
    if (isEmballageLine(r.product_naam)) continue;
    const stripped = stripPackagingSuffix(r.product_naam ?? "").trim();
    const clean = stripped.length >= 3 ? stripped : (r.product_naam ?? "").trim();
    if (clean.length < 3) continue;
    unmatchedFuzzyTargets.push({ idx: i, cleanNaam: clean });
  }

  // Twijfelzone-vangnet (Sprint Pakbon Kok-flow, etappe 2):
  //   sim >= 0.70                 → auto-link (huidig gedrag)
  //   0.50 <= sim < 0.70          → bewaar suggestie, GEEN auto-link/auto-create
  //                                  (kok bevestigt in UI → leerlogica via alias)
  //   sim < 0.50 of geen kandidaat → auto-create (huidig gedrag)
  const FUZZY_AUTO_LINK = 0.70;
  const FUZZY_SUGGEST_MIN = 0.50;
  const suggestionMap = new Map<number, { id: string; naam: string; similarity: number }>();

  let fuzzyHits = 0;
  let fuzzySuggestions = 0;
  for (const tgt of unmatchedFuzzyTargets) {
    try {
      const { data: cands, error: fzErr } = await supabase.rpc("fuzzy_match_ingredient", {
        p_location_id: receipt.location_id,
        p_naam: tgt.cleanNaam,
      });
      if (fzErr) {
        console.warn(`[parse-pakbon][fuzzy] rpc-fail "${tgt.cleanNaam}":`, fzErr.message);
        continue;
      }
      const top = (cands ?? [])[0] as { id: string; naam: string; similarity: number } | undefined;
      if (!top) continue;
      if (top.similarity >= FUZZY_AUTO_LINK) {
        matches[tgt.idx] = {
          ingredient_id: top.id,
          tier: 4,
          confidence: top.similarity,
        } as unknown as (typeof matches)[number];
        fuzzyHits++;
        console.log(
          `[parse-pakbon][fuzzy] "${tgt.cleanNaam}" → ${top.naam} (${top.similarity.toFixed(2)})`,
        );
      } else if (top.similarity >= FUZZY_SUGGEST_MIN) {
        suggestionMap.set(tgt.idx, top);
        fuzzySuggestions++;
        console.log(
          `[parse-pakbon][fuzzy-suggest] "${tgt.cleanNaam}" → ${top.naam} (${top.similarity.toFixed(2)}) — needs_confirmation`,
        );
      }
    } catch (e) {
      console.warn(`[parse-pakbon][fuzzy] threw "${tgt.cleanNaam}":`, e);
    }
  }

  // Pas 2: auto-create voor regels die NA fuzzy nog unmatched zijn én
  // complete AI-data hebben. Skip emballage.
  let autoCreated = 0;
  for (let i = 0; i < extractie.regels.length; i++) {
    if (matches[i]) continue;
    // Twijfelzone-vangnet: regels met suggestion gaan NIET door auto-create.
    if (suggestionMap.has(i)) continue;
    const r = extractie.regels[i];
    if (isEmballageLine(r.product_naam)) continue;

    // Vereisten: productnaam + ai_package_unit
    const cleanNaam = stripPackagingSuffix(r.product_naam ?? "").trim() ||
      (r.product_naam ?? "").trim();
    if (cleanNaam.length < 2) continue;
    if (!r.verpakking_eenheid) continue;

    const baseUnit = normalizeBaseUnit(r.verpakking_eenheid);
    // Display-eenheid voor chefs: behoud leverancier-eenheid waar zinvol
    const displayUnitMap: Record<string, string> = {
      g: "kg", ml: "l", st: "stuk",
    };
    const displayEenheid = displayUnitMap[baseUnit] ?? baseUnit;
    const cap = cleanNaam.charAt(0).toUpperCase() + cleanNaam.slice(1);

    try {
      const { data: created, error: cErr } = await supabase
        .from("ingredienten")
        .insert({
          location_id: receipt.location_id,
          naam: cap,
          categorie: "overig",
          eenheid: displayEenheid,
          base_unit: baseUnit,
          is_variable_weight: !!r.is_weighted,
          created_by_source: "ai_pakbon",
        })
        .select("id, naam")
        .single();

      if (cErr) {
        console.warn(`[parse-pakbon][auto-create] failed "${cap}":`, cErr.message);
        continue;
      }

      matches[i] = {
        ingredient_id: created.id,
        tier: 4,
        confidence: 0.5,
      } as unknown as (typeof matches)[number];
      autoCreated++;

      // Best-effort: ai_logs entry voor traceerbaarheid (silent fail)
      try {
        await supabase.from("ai_logs").insert({
          location_id: receipt.location_id,
          feature: "parse_pakbon_auto_create_ingredient",
          model: "n/a",
          input_tokens: 0,
          output_tokens: 0,
          status: "success",
          error_message:
            `auto_created ingredient_id=${created.id} naam="${cap}" ` +
            `from_raw="${r.product_naam}" base_unit=${baseUnit} ` +
            `goods_receipt_id=${receipt.id} matched_to_existing=false`,
        });
      } catch (_e) {
        // niet blokkeren
      }

      console.log(`[parse-pakbon][auto-create] "${cap}" id=${created.id} base_unit=${baseUnit}`);

      // Best-effort: koppel aan leverancier_artikelen (idempotent) zodat
      // volgende pakbon Tier-2/3 hit krijgt.
      if (effectiveLeverancierId) {
        try {
          const { upsertLeverancierArtikelFromMatch } = await import(
            "../_shared/factuur-v2/cache.ts"
          );
          await upsertLeverancierArtikelFromMatch(supabase, {
            leverancierId: effectiveLeverancierId,
            ingredientId: created.id,
            artikelNummer: (r.artikelnummer ?? "").trim() || null,
            artikelNaam: r.product_naam,
            prijsPerEenheid: null,
            verpakkingEenheid: r.verpakking_eenheid ?? null,
            verpakkingHoeveelheid: r.verpakking_hoeveelheid ?? null,
          });
        } catch (e) {
          console.warn(`[parse-pakbon][auto-create] la-upsert skipped:`, e);
        }
      }
    } catch (e) {
      console.warn(`[parse-pakbon][auto-create] threw "${cap}":`, e);
    }
  }

  console.log(
    `[parse-pakbon][loop4c-finish] receipt=${receipt.id} fuzzy_hits=${fuzzyHits} fuzzy_suggestions=${fuzzySuggestions} auto_created=${autoCreated}`,
  );

  const lineRows = extractie.regels.map((r, idx) => {
    const hit = matches[idx];
    const suggestion = suggestionMap.get(idx) ?? null;
    const conf = r.confidence === "hoog" ? 0.95 : r.confidence === "medium" ? 0.7 : 0.4;
    // Resolve verpakking-label: AI > regex > null
    const aiLabel = (r.verpakking_woord ?? "").trim().toLowerCase() || null;
    const regexLabel = aiLabel ? null : detectPackagingLabel(r.product_naam);
    const aiPackageLabel = aiLabel ?? regexLabel;
    const isEmballage = isEmballageLine(r.product_naam);
    // Twijfelzone-regels (0.50-0.70 fuzzy): suggested_ingredient_id gevuld,
    // ingredient_id leeg, match_status='needs_confirmation'. Kok bevestigt in UI.
    const isSuggestion = !hit && !!suggestion && !isEmballage;
    return {
      goods_receipt_id: receipt.id,
      product_naam_herkend: r.product_naam,
      ai_raw_naam: r.product_naam,
      ai_raw_artikelnummer: (r.artikelnummer ?? "").trim() || null,
      ai_confidence: conf,
      hoeveelheid_verwacht: r.hoeveelheid_geleverd ?? null,
      eenheid_verwacht: r.verpakking_eenheid ?? null,
      ingredient_id: hit?.ingredient_id ?? null,
      suggested_ingredient_id: isSuggestion ? suggestion!.id : null,
      is_nieuw_ingredient: !hit && !isSuggestion && !isEmballage,
      match_status: hit ? "matched" : isSuggestion ? "needs_confirmation" : "unmatched",
      match_confidence: hit ? hit.confidence : isSuggestion ? suggestion!.similarity : null,
      haccp_categorie: r.haccp_categorie ?? null,
      lotnummer: r.lotnummer ?? null,
      tht_datum: r.tht_datum ?? null,
      // Loop 4C-FINISH: emballage-regels krijgen aparte status zodat ze
      // niet in voorraad-mutatie of counter terechtkomen.
      status: (isEmballage ? "emballage_skip" : "verwacht") as
        | "verwacht"
        | "emballage_skip",
      // Loop 4C ROOT-CAUSE FIX: AI-extractie persist
      ai_per_package_quantity: r.verpakking_hoeveelheid ?? null,
      ai_package_unit: r.verpakking_eenheid ?? null,
      ai_total_packages: r.hoeveelheid_geleverd ?? null,
      ai_total_received_quantity: r.totaal_ontvangen_hoeveelheid ?? null,
      ai_total_received_unit: r.verpakking_eenheid ?? null,
      ai_is_weighted: r.is_weighted ?? false,
      ai_reasoning: r.reasoning ?? null,
      ai_package_label: aiPackageLabel,
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
  // 9. Dedup-precheck + Update goods_receipts
  // ===========================================================
  const aiParseStatus = extractie.extractie_status === "partial" ? "partial" : "success";
  const overallConfidence = extractie.regels.length > 0
    ? extractie.regels.reduce((s, r) => {
        const c = r.confidence === "hoog" ? 0.95 : r.confidence === "medium" ? 0.7 : 0.4;
        return s + c;
      }, 0) / extractie.regels.length
    : null;

  // Dedup: zelfde fysieke pakbon bestaat al? Partial unique index op
  // (location_id, leverancier_id, pakbon_nummer) WHERE pakbon_nummer NOT NULL.
  // Conditie c: alleen deleten als bestaande receipt status='success' of
  // 'partial' (nooit 'pending' → race-veilig).
  if (extractie.pakbon_nummer && effectiveLeverancierId) {
    const { data: dups, error: dupErr } = await supabase
      .from("goods_receipts")
      .select("id, ai_parse_status")
      .eq("location_id", receipt.location_id)
      .eq("leverancier_id", effectiveLeverancierId)
      .eq("pakbon_nummer", extractie.pakbon_nummer)
      .neq("id", receipt.id)
      .in("ai_parse_status", ["success", "partial"])
      .limit(1);

    if (dupErr) {
      console.warn("[parse-pakbon][dedup] precheck failed:", dupErr.message);
    } else if (dups && dups.length > 0) {
      const original = dups[0];
      console.log(
        `[parse-pakbon][dedup] receipt=${receipt.id} duplicate of ${original.id} ` +
        `(loc=${receipt.location_id} lev=${effectiveLeverancierId} nr=${extractie.pakbon_nummer}) — auto-deleting`,
      );

      // Audit-log naar ai_logs vóór delete (idempotent: error_message bevat
      // JSON-payload met alle context voor latere "waar is mijn pakbon"-vragen).
      try {
        await supabase.from("ai_logs").insert({
          location_id: receipt.location_id,
          organization_id: receipt.organization_id,
          feature: "parse_pakbon_dedup_skip",
          model: aiModel,
          status: "skipped",
          error_message: JSON.stringify({
            reasoning: `Duplicate van receipt ${original.id} — auto-deleted`,
            attempted_receipt_id: receipt.id,
            original_receipt_id: original.id,
            original_status: original.ai_parse_status,
            location_id: receipt.location_id,
            leverancier_id: effectiveLeverancierId,
            pakbon_nummer: extractie.pakbon_nummer,
            email_intake_id: body.intake_id ?? null,
          }),
        });
      } catch (logErr) {
        console.warn("[parse-pakbon][dedup] ai_logs insert failed:", logErr);
      }

      // Update intake-status zodat email-pipeline weet wat er gebeurd is
      if (body.intake_id) {
        await supabase
          .from("pakbon_email_intake")
          .update({ ai_parse_status: "rejected_duplicate" })
          .eq("id", body.intake_id);
      }

      // CASCADE delete (goods_receipt_lines volgt automatisch)
      const { error: delErr } = await supabase
        .from("goods_receipts")
        .delete()
        .eq("id", receipt.id);

      if (delErr) {
        console.error("[parse-pakbon][dedup] delete failed:", delErr);
      }

      return new Response(
        JSON.stringify({
          status: "duplicate",
          attempted_receipt_id: receipt.id,
          original_receipt_id: original.id,
          message: `Duplicate van pakbon ${extractie.pakbon_nummer} (receipt ${original.id}) — opgeruimd.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

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
      ai_model: aiModel,
      ai_escalated: escalated,
      ai_escalation_reason: escalationReason,
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
