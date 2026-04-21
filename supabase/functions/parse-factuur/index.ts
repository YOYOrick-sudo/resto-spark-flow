// supabase/functions/parse-factuur/index.ts
// Sprint D.6b — Factuur AI Parser (Gemini Vision)
// Parst geüploade facturen via multimodal AI en slaat gestructureerde data op
//
// === BACKGROUND PROCESSING (Sprint factuur-async) ===
// Handler valideert + downloadt + returnt direct 202. Echte AI-call + matching
// loopt in EdgeRuntime.waitUntil() zodat exec-budget tot ~400s mag duren
// (handler-cap is 150s). UI luistert via Broadcast op channel
// `inkoop:{locationId}` met event-type `factuur.status` voor live updates.
//
// Smart model-routing op pagina-aantal (pdf-lib):
//   ≤4 pagina's → Flash-first (snel, cheap), Pro-fallback bij truncation
//   >4 pagina's → direct Pro (hogere capaciteit), geen Flash-poging
//
// Race-guard: ai_parsing_status='processing' check vóór AI-call voorkomt
// dubbele invoke (bv. retry-knop dubbel-klik) en dubbele AI-kosten.
//
// R3.5 — Verpakking → basiseenheid conversie
// SOURCE OF TRUTH (kritiek!):
//   - AI levert: prijs_per_eenheid (= prijs zoals op factuur, meestal per verpakking)
//                + verpakking_aantal + verpakking_eenheid + basiseenheid_per_item
//   - Nesto berekent ALTIJD ZELF: prijs_per_basiseenheid = prijs_per_eenheid / verpakking_aantal
//   - Zelfs als AI ooit prijs_per_stuk teruggeeft → NEGEER. Eén bron voorkomt afronding-conflicten.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { callAI } from "../_shared/ai.ts";
import { extractTextPerPage, type TextExtractStats } from "../_shared/pdf-text.ts";
import {
  detectLeverancier,
  parseFactuur as parseFactuurText,
  thresholdForSlug,
  type ParserResult as TextParserResult,
} from "../_shared/factuur-parsers/index.ts";
import { chooseVerpakking, cleanIngredientNaam, cleanProductNaamPrefix, cleanBidfoodProductNaam } from "../_shared/factuur-parsers/shared.ts";

// FIX 2 — Whitelist voor verpakking_eenheid: alleen basiseenheden mogen DB in.
// Tokens als "krat"/"doos"/"zak" zijn verpakking-vorm, geen meet-eenheid.
const VERPAKKING_EENHEID_WHITELIST = new Set(["L", "kg", "stuk"]);
function safeVerpakking(hvh: number | null, eenheid: string | null): { hvh: number | null; eenheid: string | null } {
  if (eenheid && VERPAKKING_EENHEID_WHITELIST.has(eenheid)) {
    return { hvh, eenheid };
  }
  return { hvh: null, eenheid: null };
}

// EdgeRuntime is door Supabase geïnjecteerd in productie maar niet getypeerd
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Threshold voor smart-routing — boven 4 pagina's gaat Flash bijna altijd
// truncaten (gebaseerd op Kooyman-test: 6 pagina's hit 24k tokens precies).
const PAGE_THRESHOLD_FOR_PRO = 4;

const SYSTEM_PROMPT = `Je bent een factuur-parser voor de horeca. Analyseer de factuurafbeelding en extraheer alle informatie.

=== VERPAKKING PARSING — WERKENDE VOORBEELDEN (LEES EERST) ===

Input: "Gyoza DIM SUM CHEF 6×41×18gr 1 doos"
Output: verpakking_aantal=246 (= 6 × 41), verpakking_eenheid="doos", basiseenheid_per_item="stuk"
Redenering: "18gr" is stukgewicht, NIET meetellen in totaal.

Input: "Nina Large Pitabrood 10×7×95gr"
Output: verpakking_aantal=70 (= 10 × 7), verpakking_eenheid="doos", basiseenheid_per_item="stuk"
Redenering: "95gr" is stukgewicht per pitabrood, NIET meetellen.

Input: "Havermout Gemberkoekjes 4×150st"
Output: verpakking_aantal=600 (= 4 × 150), verpakking_eenheid="doos", basiseenheid_per_item="stuk"
Redenering: "st" = expliciet stuks per verpakking.

Input: "Frituurolie LEVO 2×5lt"
Output: verpakking_aantal=10, verpakking_eenheid="doos", basiseenheid_per_item="L"

Input: "Ricotta LATTE CARSO 1,5kg"
Output: verpakking_aantal=1.5, verpakking_eenheid="bak", basiseenheid_per_item="kg"

Input: "Melk volle 12×1L"
Output: verpakking_aantal=12, verpakking_eenheid="krat", basiseenheid_per_item="L"

Input: "Tomaten los 1 kg"
Output: verpakking_aantal=null, verpakking_eenheid=null, basiseenheid_per_item="kg"
Redenering: losse verkoop, geen verpakking.

REGELS:
- Patroon Xx"Yx"Zgr/ml met telbaar product: totaal STUKS = X × Y, Z (stukgewicht) NEGEREN.
- Patroon Xx"Yeenheid (geen 3e cijfer): totaal = X × Y in die eenheid.
- Losse gewicht zonder ×: totaal = dat gewicht (bv "1,5kg" → 1.5 kg).
- Expliciet "st" in naam: dat is stuksaantal per verpakking.
- Onduidelijk: verpakking_aantal=null, NIET raden.
- Lever GEEN prijs-per-stuk berekening; alleen prijs zoals op factuur (per verpakking). Nesto berekent zelf.
=== EINDE VERPAKKING PARSING ===

Geef een JSON-object terug met exact deze structuur:
{
  "leverancier_naam": "naam van de leverancier op de factuur",
  "factuurnummer": "het factuurnummer",
  "factuurdatum": "YYYY-MM-DD formaat",
  "totaalbedrag": 123.45,
  "regels": [
    {
      "product_naam": "naam van het product zoals letterlijk op factuur (incl. merk/verpakking)",
      "clean_ingredient_naam": "schone ingredient-naam zonder merk/verpakking, bv. 'Falafel' i.p.v. 'Falafel Party Pure Orient NINA BAKERY 2x1,5kg'",
      "category_hint": "exact één van: groenten, vlees, vis, zuivel, kruiden, olie, droog, overig — null als onzeker",
      "basiseenheid": "exact één van: kg, g, L, ml, stuk — de eenheid waarin dit ingredient in recepten gebruikt wordt (NIET de leveranciers-doos)",
      "verpakking_aantal": 246,
      "verpakking_eenheid": "doos",
      "verpakking_raw": "6×41×18gr",
      "artikelnummer": "artikelnummer indien zichtbaar, anders null",
      "hoeveelheid": 10,
      "eenheid": "kg, liter, stuk, doos, etc. — zoals op de factuur staat",
      "prijs_per_eenheid": 64.57,
      "totaal": 64.57,
      "confidence": 0.95
    }
  ],
  "confidence_overall": 0.90
}

Regels:
- Alle bedragen in euro's als decimalen (geen valuta-symbolen)
- Alle datums in YYYY-MM-DD formaat
- confidence per regel: 0.0 tot 1.0 (hoe zeker ben je over de herkenning)
- confidence_overall: gemiddelde zekerheid over hele factuur
- Als iets onleesbaar is, gebruik null en lagere confidence
- Negeer BTW-regels, korting-regels en subtotalen — alleen productregels
- Eenheden (factuur-veld 'eenheid'): kg, g, l, ml, stuk, doos, pak, bos, fles

EXTRA VELDEN — voor "Nieuw ingrediënt" suggesties:
- clean_ingredient_naam: strip merk, gewicht, aantal-per-doos en verpakking.
  Voorbeelden: "Slagroom DEBIC 1ltr" → "Slagroom"; "Falafel NINA BAKERY 2x1,5kg" → "Falafel".
  Geen merknamen, geen aantallen, geen eenheden in deze naam.
- category_hint: lower-case, exact uit lijst (groenten, vlees, vis, zuivel, kruiden, olie, droog, overig).
  Bij twijfel of onbekend: null. NIET gokken.
- basiseenheid: kies de natuurlijke recept-eenheid, NIET de leveranciers-verpakking.
  "Eieren 30st doos" → "stuk"; "Olie 5L jerrycan" → "L"; "Bloem 25kg zak" → "kg"; "Melk 6x1L" → "L".

VERPAKKING — zie de WERKENDE VOORBEELDEN bovenaan deze prompt. Vul altijd verpakking_raw in als origineel tekstfragment.
verpakking_eenheid mag zijn: doos | pak | fles | krat | zak | jerrycan | bak | bos | null.`;

// =====================================================
// Broadcast helper — channel `inkoop:{locationId}`,
// event-type expliciet gescoped: `factuur.status`.
// Faalt silent — broadcast is best-effort, mag parse niet breken.
// =====================================================
async function broadcastFactuurStatus(
  supabase: ReturnType<typeof createClient>,
  locationId: string,
  payload: {
    factuurId: string;
    aiParsingStatus: string;
    status?: string;
  }
) {
  try {
    const channel = supabase.channel(`inkoop:${locationId}`);
    await channel.send({
      type: "broadcast",
      event: "factuur.status",
      payload,
    });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.warn("[parse-factuur] broadcast failed:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Ongeldige sessie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Request body ---
    const { factuurId } = await req.json();
    if (!factuurId) {
      return new Response(JSON.stringify({ error: "factuurId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fetch factuur record ---
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

    const locationId = factuur.location_id;
    const organizationId = (factuur as any).locations?.organization_id;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Kan organisatie niet bepalen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- FIX 4: Stale-guard — ruim zombies >20min op die nog niet echt gestart zijn ---
    // parse_method IS NULL of 'text_preview' = nog geen AI-call gedaan → veilig om te cleanen.
    // Actieve 'text'/'multimodal'/'text_then_multimodal' blijven ongemoeid (kunnen legitiem 5-8 min duren).
    // Aanpak 1: gesplitst in 2 queries (PostgREST .or() na meerdere .eq() faalt met
    // "column parse_method does not exist" — bekende quirk in filter-parsing).
    try {
      const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const cleanupPayload = {
        ai_parsing_status: "failed" as const,
        ai_raw_response: {
          error: "stale_processing_auto_cleanup",
          cleaned_at: new Date().toISOString(),
          threshold_minutes: 20,
        },
      };

      // Tak 1: parse_method IS NULL (nog nooit gestart)
      const { data: zombiesNull, error: zombieNullErr } = await supabase
        .from("factuur_uploads")
        .update(cleanupPayload)
        .eq("location_id", locationId)
        .eq("ai_parsing_status", "processing")
        .is("parse_method", null)
        .lt("created_at", twentyMinAgo)
        .select("id");
      if (zombieNullErr) {
        console.warn(
          `[parse-factuur] stale-guard (null) failed (soft):`,
          zombieNullErr.message
        );
      } else if (zombiesNull && zombiesNull.length > 0) {
        console.warn(
          `[parse-factuur] stale-guard cleaned ${zombiesNull.length} zombie(s) (parse_method=null) for location ${locationId}`
        );
      }

      // Tak 2: parse_method = 'text_preview' (alleen PDF-extract gehad, geen AI-call)
      const { data: zombiesPrev, error: zombiePrevErr } = await supabase
        .from("factuur_uploads")
        .update(cleanupPayload)
        .eq("location_id", locationId)
        .eq("ai_parsing_status", "processing")
        .eq("parse_method", "text_preview")
        .lt("created_at", twentyMinAgo)
        .select("id");
      if (zombiePrevErr) {
        console.warn(
          `[parse-factuur] stale-guard (text_preview) failed (soft):`,
          zombiePrevErr.message
        );
      } else if (zombiesPrev && zombiesPrev.length > 0) {
        console.warn(
          `[parse-factuur] stale-guard cleaned ${zombiesPrev.length} zombie(s) (parse_method=text_preview) for location ${locationId}`
        );
      }
    } catch (staleErr: any) {
      console.warn(
        `[parse-factuur] stale-guard threw (soft, doorgaan):`,
        staleErr?.message ?? String(staleErr)
      );
    }

    // --- Race-guard: voorkom dubbele AI-kosten ---
    // Als parse al loopt (processing), of net afgerond (completed), return 200/409.
    if (factuur.ai_parsing_status === "processing") {
      console.log(`[parse-factuur] race-guard: ${factuurId} is al processing, skip.`);
      return new Response(
        JSON.stringify({
          accepted: false,
          factuurId,
          reason: "already_processing",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (factuur.ai_parsing_status === "completed") {
      console.log(`[parse-factuur] race-guard: ${factuurId} al completed, skip.`);
      return new Response(
        JSON.stringify({
          accepted: false,
          factuurId,
          reason: "already_completed",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Atomic claim: zet status='processing' alleen als nog 'pending' of 'failed' ---
    // Voorkomt race tussen twee gelijktijdige invokes — slechts één wint.
    const { data: claimed, error: claimErr } = await supabase
      .from("factuur_uploads")
      .update({ ai_parsing_status: "processing" })
      .eq("id", factuurId)
      .in("ai_parsing_status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error("[parse-factuur] claim failed:", claimErr);
      return new Response(
        JSON.stringify({ error: "Kon factuur niet claimen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!claimed) {
      console.log(`[parse-factuur] race lost on ${factuurId}, andere invoke wint.`);
      return new Response(
        JSON.stringify({ accepted: false, factuurId, reason: "race_lost" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Broadcast: processing started
    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "processing",
    });

    // --- file_hash race-guard: voorkom dubbele Pro-calls bij snel-meermaals upload ---
    // Soft guard: bij infrastructure-error doorgaan met parse (liever 2× parse dan geen parse).
    if (factuur.file_hash) {
      try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: dup, error: dupErr } = await supabase
          .from("factuur_uploads")
          .select("id, factuurnummer, bestandsnaam")
          .eq("location_id", locationId)
          .eq("file_hash", factuur.file_hash)
          .eq("ai_parsing_status", "processing")
          .neq("id", factuurId)
          .gte("created_at", tenMinAgo)
          .limit(1)
          .maybeSingle();

        if (dupErr) {
          console.warn(
            `[parse-factuur] file_hash dup-check failed (soft, doorgaan met parse):`,
            dupErr.message
          );
        } else if (dup) {
          console.log(
            `[parse-factuur] duplicate detected ${factuurId} → original ${dup.id}, mark failed.`
          );
          await supabase
            .from("factuur_uploads")
            .update({
              ai_parsing_status: "failed",
              ai_raw_response: {
                error: "duplicate_upload",
                message: `Zelfde factuur wordt al verwerkt (id=${dup.id})`,
                original_factuur_id: dup.id,
                original_factuurnummer: (dup as any).factuurnummer ?? null,
                original_bestandsnaam: (dup as any).bestandsnaam ?? null,
              },
            })
            .eq("id", factuurId);
          await broadcastFactuurStatus(supabase, locationId, {
            factuurId,
            aiParsingStatus: "failed",
          });
          return new Response(
            JSON.stringify({
              accepted: false,
              factuurId,
              reason: "duplicate_upload",
              originalFactuurId: dup.id,
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (guardErr: any) {
        console.warn(
          `[parse-factuur] file_hash dup-check threw (soft, doorgaan met parse):`,
          guardErr?.message ?? String(guardErr)
        );
      }
    }

    // --- Download file from storage (in handler — snel, telt mee in 150s budget) ---
    const filePath = factuur.bestand_url;
    let storagePath = filePath;
    if (filePath.includes("/facturen/")) {
      storagePath = filePath.split("/facturen/").pop()!;
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("facturen")
      .download(storagePath);

    if (downloadError || !fileData) {
      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: { error: `Download failed: ${downloadError?.message}` },
        })
        .eq("id", factuurId);
      await broadcastFactuurStatus(supabase, locationId, {
        factuurId,
        aiParsingStatus: "failed",
      });
      return new Response(JSON.stringify({ error: "Bestand niet gevonden in storage" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 (chunked)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryStr = "";
    const CHUNK = 8192;
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
      binaryStr += String.fromCharCode(...uint8Array.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binaryStr);

    const ext = factuur.bestandsnaam.toLowerCase().split(".").pop() ?? "";
    const isPDF = ext === "pdf";
    const mimeType = isPDF
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : "image/jpeg";

    // --- Page count voor smart routing (alleen PDFs) ---
    let pageCount: number | null = null;
    if (isPDF) {
      try {
        const pdfDoc = await PDFDocument.load(uint8Array, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch (e) {
        console.warn("[parse-factuur] pdf-lib page-count failed, fall back to Flash-first:", e);
      }
    }

    console.log(
      `[parse-factuur] file=${factuur.bestandsnaam} ext=${ext} mime=${mimeType} ` +
        `bytes=${uint8Array.length} pages=${pageCount ?? "n/a"} ` +
        `path=${isPDF ? "documents[]" : "images[]"}`
    );

    // --- Schedule background processing en return 202 direct ---
    const processPromise = processInvoice({
      supabase,
      factuurId,
      locationId,
      organizationId,
      factuur,
      base64,
      uint8Array,
      isPDF,
      pageCount,
    });

    // Production: EdgeRuntime.waitUntil houdt de runtime-instance levend
    // tot de promise klaar is (max ~400s). In lokale dev is EdgeRuntime
    // undefined → fire-and-forget zonder await (acceptabel voor dev).
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(processPromise);
    } else {
      // Dev fallback — log errors, niet blokkeren
      processPromise.catch((e) =>
        console.error("[parse-factuur] background process failed:", e)
      );
    }

    return new Response(
      JSON.stringify({
        accepted: true,
        factuurId,
        pages: pageCount,
        routedTo: pickModel(pageCount),
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("parse-factuur handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Onbekende fout" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// =====================================================
// Smart model selectie — bepaalt primary model.
// pages onbekend (image of pdf-lib failure) → Flash-first (huidige flow).
// =====================================================
function pickModel(pageCount: number | null): string {
  if (pageCount != null && pageCount > PAGE_THRESHOLD_FOR_PRO) {
    return "google/gemini-2.5-pro";
  }
  return "google/gemini-2.5-flash";
}

// =====================================================
// Background processor — draait in EdgeRuntime.waitUntil()
// Mag tot ~400s duren. Update status + broadcast bij elke transitie.
// =====================================================
interface ProcessParams {
  supabase: ReturnType<typeof createClient>;
  factuurId: string;
  locationId: string;
  organizationId: string;
  factuur: any;
  base64: string;
  uint8Array: Uint8Array;
  isPDF: boolean;
  pageCount: number | null;
}

async function processInvoice(params: ProcessParams) {
  const {
    supabase,
    factuurId,
    locationId,
  } = params;

  try {
    await processInvoiceInner(params);
  } catch (err: any) {
    // Defense-in-depth: outer catch vangt onverwachte runtime-fouten die
    // de inner blocks missen (crash in fuzzy-match, supabase-throw, etc.).
    // Inner catches blijven hun eigen specifieke error-handling doen — dit
    // is alleen een vangnet zodat ai_parsing_status NOOIT op 'processing'
    // blijft hangen (geen zombie-rows meer).
    console.error(
      `[parse-factuur] processInvoice unhandled error for ${factuurId}:`,
      err
    );
    try {
      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: {
            error: "unhandled_error",
            message: err?.message ?? String(err),
            stack: err?.stack?.slice(0, 500) ?? null,
          },
        })
        .eq("id", factuurId);
      await broadcastFactuurStatus(supabase, locationId, {
        factuurId,
        aiParsingStatus: "failed",
      });
    } catch (cleanupErr) {
      console.error(
        `[parse-factuur] outer-catch cleanup ALSO failed for ${factuurId}:`,
        cleanupErr
      );
    }
  }
}

async function processInvoiceInner(params: ProcessParams) {
  const {
    supabase,
    factuurId,
    locationId,
    organizationId,
    factuur,
    base64,
    uint8Array,
    isPDF,
    pageCount,
  } = params;

  // ===========================================================
  // SPRINT: Slimme factuur-AI Stap 1 — text-extractie pre-flight
  // -----------------------------------------------------------
  // Probeer eerst gratis text-extract + leverancier-parser. Resultaat
  // wordt OPGESLAGEN als preview (text_pad_preview) + diagnostiek
  // (text_extract_stats) in ai_raw_response. De échte regel-insert
  // blijft via de bestaande multimodal flow lopen — Stap 2 zal het
  // text-pad als primaire bron gaan gebruiken.
  // ===========================================================
  let textPadPreview: TextParserResult | null = null;
  let textExtractStats: TextExtractStats | null = null;
  // TIJDELIJK DEBUG — ruwe text-extract output om parser-bug te diagnosticeren
  let pdfExtractedTextDebug: Record<string, any> | null = null;
  let textParseMethod: "text_preview" | "multimodal" | "text_then_multimodal" =
    "multimodal";
  let textParseConfidence: number | null = null;
  let textLeverancierSlug: "kooyman" | "bidfood" | "generic" | null = null;
  let textThresholdApplied: number | null = null;

  if (isPDF) {
    try {
      const extract = await extractTextPerPage(uint8Array);
      textExtractStats = extract.stats;

      // TIJDELIJK DEBUG — ruwe text dump zodat we via SQL kunnen zien wat parser krijgt
      if (extract.pages != null) {
        pdfExtractedTextDebug = {
          pages_count: extract.pages.length,
          page_1_first_2000_chars: extract.pages[0]?.slice(0, 3000) ?? null,
          page_2_first_500_chars: extract.pages[1]?.slice(0, 2000) ?? null,
          line_count_per_page: extract.pages.map((p) => p.split(/\r?\n/).length),
          total_chars_per_page: extract.pages.map((p) => p.length),
        };
      }

      if (extract.pages != null) {
        // Niet-scan PDF → parser draaien
        const slug = detectLeverancier(extract.pages[0] ?? "");
        textLeverancierSlug = slug;
        const threshold = thresholdForSlug(slug);
        textThresholdApplied = threshold;

        const parserResult = parseFactuurText(extract.pages, slug);
        textParseConfidence = parserResult.confidence;
        textPadPreview = parserResult;

        if (parserResult.confidence >= threshold) {
          textParseMethod = "text_preview";
          console.log(
            `[parse-factuur] ${factuurId} text-pad PASS — slug=${slug} ` +
              `confidence=${parserResult.confidence} regels=${parserResult.regels.length}`
          );
        } else {
          textParseMethod = "text_then_multimodal";
          // Toevoeging B uit sprint: monitoring-warning voor parser-tuning
          console.warn(
            `[parse-factuur] text-pad fallback`,
            JSON.stringify({
              factuurId,
              leverancierSlug: slug,
              confidence: parserResult.confidence,
              threshold,
              regels: parserResult.regels.length,
            })
          );
        }
      } else {
        // Scan-PDF → géén parser, géén preview
        textParseMethod = "multimodal";
        console.log(
          `[parse-factuur] ${factuurId} scan-PDF detected — avg=${extract.stats.avg_chars_per_content_page} chars/page`
        );
      }
    } catch (e: any) {
      // Pre-flight mag NOOIT de hele flow breken — log en val terug op multimodal
      console.warn(
        `[parse-factuur] ${factuurId} text-extract pre-flight failed:`,
        e?.message ?? String(e)
      );
      textParseMethod = "multimodal";
    }
  }

  const primaryModel = pickModel(pageCount);
  // Pro krijgt meer headroom (factuur is groot), Flash krijgt 48k.
  const maxTokens = primaryModel === "google/gemini-2.5-pro" ? 60000 : 48000;
  // Pro is langzaam bij grote PDFs — 5 min budget.
  const timeoutMs = primaryModel === "google/gemini-2.5-pro" ? 300_000 : 120_000;

  console.log(
    `[parse-factuur] background start factuurId=${factuurId} ` +
      `model=${primaryModel} maxTokens=${maxTokens} timeoutMs=${timeoutMs} ` +
      `parseMethod=${textParseMethod} parseConfidence=${textParseConfidence ?? "n/a"}`
  );

  // ===========================================================
  // Helper: verrijk ai_raw_response met text-pad diagnostiek.
  // -----------------------------------------------------------
  // Áltijd uitvoeren bij elke update van ai_raw_response binnen
  // processInvoiceInner — zo zien we via SQL ook bij failures wat
  // de text-parser gevonden heeft (toevoeging clarification:
  // text_pad_preview ook bij text_then_multimodal opslaan).
  //
  // Scan-PDFs (stats.scan_detected=true): text_pad_preview blijft
  // weg (parser draaide niet) — alleen stats worden opgeslagen.
  // ===========================================================
  const enrichRaw = (base: Record<string, any>): Record<string, any> => {
    const enriched: Record<string, any> = { ...base };
    if (textExtractStats) {
      enriched.text_extract_stats = {
        ...textExtractStats,
        leverancier_slug_detected: textLeverancierSlug,
        parser_confidence: textParseConfidence,
        threshold_applied: textThresholdApplied,
        meets_threshold: textParseMethod === "text_preview",
      };
    }
    // Preview opslaan zodra parser draaide — dus ook bij text_then_multimodal
    // (clarification user). Niet bij scan-PDF (textPadPreview = null).
    if (textPadPreview) {
      enriched.text_pad_preview = {
        leverancier_naam_raw: textPadPreview.leverancier_naam_raw,
        factuurnummer: textPadPreview.factuurnummer,
        factuurdatum: textPadPreview.factuurdatum,
        totaalbedrag: textPadPreview.totaalbedrag,
        confidence: textPadPreview.confidence,
        candidate_rows_per_page: textPadPreview.candidate_rows_per_page,
        regels: textPadPreview.regels,
      };
    }
    // TIJDELIJK DEBUG
    if (pdfExtractedTextDebug) {
      enriched.pdf_extracted_text_debug = pdfExtractedTextDebug;
    }
    return enriched;
  };

  // Top-level kolommen die bij elke update meegaan
  const parseMethodFields = {
    parse_method: textParseMethod,
    parse_confidence: textParseConfidence,
  };

  // ===========================================================
  // SPRINT Stap 1 — Persist text-pad preview DIRECT na pre-flight.
  // -----------------------------------------------------------
  // Reden: als de multimodal AI-call hangt of de runtime hard wordt
  // gekilled (Pro op grote facturen), draait geen enkele latere
  // update meer en blijft DB leeg. Door hier al te schrijven is
  // text_extract_stats + text_pad_preview altijd zichtbaar via SQL,
  // ongeacht wat er hierna met multimodal gebeurt.
  //
  // Latere updates (failure/completion) gebruiken enrichRaw() met
  // verse base-objecten en re-injecteren de text-velden vanuit dezelfde
  // closure-vars, dus geen overschrijf-risico.
  // ===========================================================
  try {
    await supabase
      .from("factuur_uploads")
      .update({
        ai_raw_response: enrichRaw(
          (factuur.ai_raw_response as Record<string, any>) ?? {}
        ),
        ...parseMethodFields,
      })
      .eq("id", factuurId);
    console.log(
      `[parse-factuur] ${factuurId} pre-flight persisted — ` +
        `parseMethod=${textParseMethod} confidence=${textParseConfidence ?? "n/a"} ` +
        `previewRegels=${textPadPreview?.regels.length ?? 0}`
    );
  } catch (persistErr: any) {
    // Niet-fataal: latere updates re-injecteren de data alsnog via enrichRaw.
    console.warn(
      `[parse-factuur] ${factuurId} pre-flight persist failed (non-fatal):`,
      persistErr?.message ?? String(persistErr)
    );
  }

  // ===========================================================
  // SPRINT Stap 2 — TEXT PAD als primaire insert-flow
  // -----------------------------------------------------------
  // Bij text-pad SUCCES (meetsThreshold=true) skippen we multimodal
  // volledig en doen de échte regel-insert via runTextPath().
  // Bij failure binnen runTextPath (bv. DB-error op bulk insert)
  // vallen we terug op de bestaande multimodal flow met
  // parse_method='text_then_multimodal'.
  // Ronde 2 AI-failures worden BINNEN runTextPath gracefully
  // afgevangen en throwen NIET (degradation: regels blijven unmatched).
  // ===========================================================
  if (textParseMethod === "text_preview" && textPadPreview) {
    try {
      await runTextPath({
        supabase,
        factuurId,
        locationId,
        organizationId,
        factuur,
        parsedData: textPadPreview,
        textParseConfidence,
        enrichRaw,
      });
      return; // Skip multimodal volledig
    } catch (textPathErr: any) {
      console.warn(
        `[parse-factuur] ${factuurId} text-path failed, falling back to multimodal:`,
        textPathErr?.message ?? String(textPathErr)
      );
      textParseMethod = "text_then_multimodal";
      // val door naar bestaande multimodal flow
    }
  }

  // --- Call AI ---
  let aiResult;
  try {
    aiResult = await callAI({
      featureKey: "factuur_parse",
      organizationId,
      locationId,
      systemPrompt: SYSTEM_PROMPT,
      prompt: "Analyseer deze factuur en extraheer alle productregels en metadata.",
      ...(isPDF
        ? { documents: [{ data: base64, mimeType: "application/pdf" }] }
        : { images: [base64] }),
      jsonMode: true,
      maxTokens,
      temperature: 0.2,
      modelOverride: primaryModel,
      timeoutMs,
    });
  } catch (aiError: any) {
    const errorMsg = aiError?.message || String(aiError);
    console.error(`[parse-factuur] AI call failed for ${factuurId}:`, errorMsg);

    await supabase
      .from("factuur_uploads")
      .update({
        ai_parsing_status: "failed",
        ai_raw_response: enrichRaw({ error: errorMsg }),
        ...parseMethodFields,
      })
      .eq("id", factuurId);

    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "failed",
    });
    return;
  }

  // --- Parse AI response ---
  console.log(
    `[parse-factuur] ${factuurId} AI response length=${aiResult.text.length}, ` +
      `model=${aiResult.model}, fallback=${aiResult.wasFallback}, ` +
      `outputTokens=${aiResult.outputTokens}`
  );

  if (aiResult.outputTokens && aiResult.outputTokens >= maxTokens * 0.9) {
    console.warn(
      `[parse-factuur] Output near maxTokens limit (${aiResult.outputTokens}/${maxTokens}) — risk of truncation.`
    );
  }

  const extractJSON = (text: string): any => {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned);
  };

  let parsed: any;
  try {
    parsed = extractJSON(aiResult.text);
  } catch (parseErr: any) {
    console.error(
      `[parse-factuur] ${factuurId} JSON parse failed. Raw (first 500):`,
      aiResult.text.slice(0, 500)
    );
    await supabase
      .from("factuur_uploads")
      .update({
        ai_parsing_status: "failed",
        ai_raw_response: enrichRaw({
          error: "json_parse_failed",
          parse_error: parseErr?.message ?? String(parseErr),
          raw_preview: aiResult.text.slice(0, 1000),
        }),
        ...parseMethodFields,
      })
      .eq("id", factuurId);
    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "failed",
    });
    return;
  }

  // --- Fuzzy match leverancier ---
  let leverancierId = factuur.leverancier_id;
  let fuzzyKandidaten: Array<{ id: string; naam: string; similarity: number }> = [];
  const leverancierNaam = parsed.leverancier_naam;

  if (!leverancierId && leverancierNaam) {
    const { data: exactMatch } = await supabase
      .from("leveranciers")
      .select("id")
      .eq("location_id", locationId)
      .ilike("naam", leverancierNaam)
      .limit(1)
      .maybeSingle();

    if (exactMatch) {
      leverancierId = exactMatch.id;
    } else {
      const { data: aliasMatch } = await supabase
        .from("leverancier_aliassen")
        .select("leverancier_id, leveranciers!inner(location_id)")
        .ilike("alias_naam", leverancierNaam)
        .eq("leveranciers.location_id", locationId)
        .limit(1)
        .maybeSingle();

      if (aliasMatch) {
        leverancierId = (aliasMatch as any).leverancier_id;
      } else {
        const { data: fuzzyData, error: fuzzyErr } = await supabase.rpc(
          "fuzzy_match_leverancier",
          { p_location_id: locationId, p_naam: leverancierNaam }
        );
        if (fuzzyErr) {
          console.warn("[parse-factuur] fuzzy_match_leverancier failed:", fuzzyErr.message);
        } else if (Array.isArray(fuzzyData)) {
          fuzzyKandidaten = fuzzyData
            .filter((r: any) => Number(r.similarity) >= 0.5)
            .slice(0, 3)
            .map((r: any) => ({
              id: r.id,
              naam: r.naam,
              similarity: Number(r.similarity),
            }));
        }
      }
    }
  }

  // --- Build factuur_regels with 5-tier matching cascade ---
  const regels = parsed.regels ?? [];
  const regelInserts = [];

  for (const regel of regels) {
    let ingredientId: string | null = null;
    let matchStatus = "unmatched";
    let matchConfidence: number | null = null;
    let tier1Cache: {
      verpakking_hoeveelheid: number | null;
      verpakking_eenheid: string | null;
    } | null = null;

    const artikelnr = regel.artikelnummer != null
      ? String(regel.artikelnummer).trim() || null
      : null;
    const productNaam = regel.product_naam?.trim() || null;

    // TIER 1: artikelnummer + leverancier via leveranciers_artikelen → 1.0
    if (artikelnr && leverancierId) {
      const { data } = await supabase
        .from("leveranciers_artikelen")
        .select("ingredient_id, verpakking_hoeveelheid, verpakking_eenheid")
        .eq("leverancier_id", leverancierId)
        .eq("artikel_nummer", artikelnr)
        .eq("is_actief", true)
        .not("ingredient_id", "is", null)
        .limit(1)
        .maybeSingle();
      if ((data as any)?.ingredient_id) {
        ingredientId = (data as any).ingredient_id;
        matchStatus = "matched";
        matchConfidence = 1.0;
        tier1Cache = {
          verpakking_hoeveelheid: (data as any).verpakking_hoeveelheid ?? null,
          verpakking_eenheid: (data as any).verpakking_eenheid ?? null,
        };
      }
    }

    // TIER 2: artikelnummer + leverancier via ingredient_aliassen → 0.98
    if (!ingredientId && artikelnr && leverancierId) {
      const { data } = await supabase
        .from("ingredient_aliassen")
        .select("ingredient_id, ingredienten!inner(location_id)")
        .eq("artikelnummer", artikelnr)
        .eq("leverancier_id", leverancierId)
        .eq("ingredienten.location_id", locationId)
        .limit(1)
        .maybeSingle();
      if ((data as any)?.ingredient_id) {
        ingredientId = (data as any).ingredient_id;
        matchStatus = "matched";
        matchConfidence = 0.98;
      }
    }

    // TIER 3: alias-naam match → 0.95
    if (!ingredientId && productNaam) {
      const { data } = await supabase
        .from("ingredient_aliassen")
        .select("ingredient_id, ingredienten!inner(location_id)")
        .ilike("alias_naam", productNaam)
        .eq("ingredienten.location_id", locationId)
        .limit(1)
        .maybeSingle();
      if ((data as any)?.ingredient_id) {
        ingredientId = (data as any).ingredient_id;
        matchStatus = "matched";
        matchConfidence = 0.95;
      }
    }

    // TIER 4: exacte ingredient-naam → 0.9
    if (!ingredientId && productNaam) {
      const { data } = await supabase
        .from("ingredienten")
        .select("id")
        .eq("location_id", locationId)
        .ilike("naam", productNaam)
        .limit(1)
        .maybeSingle();
      if (data) {
        ingredientId = (data as any).id;
        matchStatus = "matched";
        matchConfidence = 0.9;
      }
    }

    // TIER 5: fuzzy match
    if (!ingredientId && productNaam) {
      const { data: fuzzy, error: fuzzyErr } = await supabase.rpc(
        "fuzzy_match_ingredient",
        { p_location_id: locationId, p_naam: productNaam }
      );
      if (fuzzyErr) {
        console.warn("[parse-factuur] fuzzy_match_ingredient failed:", fuzzyErr);
      } else if ((fuzzy as any)?.length && (fuzzy as any)[0].similarity > 0.6) {
        ingredientId = (fuzzy as any)[0].id;
        matchStatus = "matched";
        matchConfidence = (fuzzy as any)[0].similarity;
      }
    }

    // Whitelist categorie + basiseenheid
    const allowedCategories = ["groenten","vlees","vis","zuivel","kruiden","olie","droog","overig"];
    const rawCategory = regel.category_hint?.toString().toLowerCase().trim();
    const categoryHint = rawCategory && allowedCategories.includes(rawCategory) ? rawCategory : null;

    const allowedEenheden = ["kg","g","L","ml","stuk"];
    const rawEenheid = regel.basiseenheid?.toString().trim();
    const basiseenheid = rawEenheid && allowedEenheden.includes(rawEenheid) ? rawEenheid : null;

    // R3.5 — VERPAKKING-CONVERSIE (single source of truth)
    const allowedVerpakking = ["doos","pak","fles","krat","zak","jerrycan","bos"];
    const rawVerpEenh = regel.verpakking_eenheid?.toString().toLowerCase().trim();
    const aiVerpakkingEenheid = rawVerpEenh && allowedVerpakking.includes(rawVerpEenh) ? rawVerpEenh : null;

    const aiVerpakkingHvh = typeof regel.verpakking_aantal === "number" && regel.verpakking_aantal > 0
      ? regel.verpakking_aantal
      : null;

    const cacheHasPackaging =
      tier1Cache?.verpakking_hoeveelheid != null && tier1Cache?.verpakking_eenheid != null;

    // FIX 1 — Hiërarchie: cache > AI-hint > regex (uit ruwe productnaam) > null
    const chosen = chooseVerpakking({
      cacheHvh: tier1Cache?.verpakking_hoeveelheid,
      cacheEenheid: tier1Cache?.verpakking_eenheid,
      aiHvh: aiVerpakkingHvh,
      aiEenheid: aiVerpakkingEenheid,
      ruweNaam: regel.product_naam ?? null,
    });
    // FIX 2 — Whitelist verpakking_eenheid (alleen L/kg/stuk DB in)
    const safeMm = safeVerpakking(chosen.hoeveelheid, chosen.eenheid);
    const verpakkingHvh = safeMm.hvh;
    const verpakkingEenheid = safeMm.eenheid;
    const usedCachedPackaging = chosen.bron === "cache";

    const prijsOpFactuur = typeof regel.prijs_per_eenheid === "number" ? regel.prijs_per_eenheid : null;
    const prijsPerBasiseenheid = (verpakkingHvh && prijsOpFactuur != null)
      ? prijsOpFactuur / verpakkingHvh
      : prijsOpFactuur;

    console.log(
      `[parse-factuur] regel "${productNaam}" tier=${matchConfidence ?? 'none'} ` +
      `verpakking_bron=${chosen.bron} ` +
      `verpakking=${verpakkingHvh}×${verpakkingEenheid} ` +
      `(ai=${aiVerpakkingHvh}×${aiVerpakkingEenheid})`
    );

    // FIX 2 — Tier-1 hits zonder AI-clean_naam: regex-based clean uit ruwe productnaam
    const aiCleanNaam = regel.clean_ingredient_naam?.toString().trim() || null;
    const fallbackCleanNaam =
      !aiCleanNaam && regel.product_naam
        ? cleanIngredientNaam(regel.product_naam) || null
        : null;
    const suggestedNaam = aiCleanNaam ?? fallbackCleanNaam;

    regelInserts.push({
      factuur_id: factuurId,
      product_naam_herkend: cleanProductNaamPrefix(productNaam ?? "") || "Onbekend",
      hoeveelheid: regel.hoeveelheid ?? null,
      eenheid: regel.eenheid ?? null,
      prijs_per_eenheid: prijsOpFactuur,
      totaal: regel.totaal ?? null,
      ingredient_id: ingredientId,
      match_status: matchStatus,
      match_confidence: matchConfidence,
      ai_confidence: regel.confidence ?? null,
      ai_raw_naam: regel.product_naam ?? null,
      ai_raw_artikelnummer: artikelnr,
      ai_suggested_naam: suggestedNaam,
      ai_category_hint: categoryHint,
      ai_suggested_eenheid: basiseenheid,
      is_nieuw_ingredient: !ingredientId,
      verpakking_hoeveelheid: verpakkingHvh,
      verpakking_eenheid: verpakkingEenheid,
      prijs_per_basiseenheid: prijsPerBasiseenheid,
      ai_raw_verpakking_tekst: regel.verpakking_raw?.toString().trim() || null,
    });
  }

  // --- Guard: AI returned 0 regels = failed ---
  if (regelInserts.length === 0) {
    console.error(`[parse-factuur] ${factuurId} AI returned no regels`);
    await supabase
      .from("factuur_uploads")
      .update({
        ai_parsing_status: "failed",
        ai_raw_response: enrichRaw({
          error: "ai_returned_no_regels",
          parsed_data: parsed,
        }),
        ...parseMethodFields,
      })
      .eq("id", factuurId);
    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "failed",
    });
    return;
  }

  // --- Insert factuur_regels ---
  const { error: insertError } = await supabase
    .from("factuur_regels")
    .insert(regelInserts);

  if (insertError) {
    console.error(`[parse-factuur] ${factuurId} regel insert failed:`, insertError);
    await supabase
      .from("factuur_uploads")
      .update({
        ai_parsing_status: "failed",
        ai_raw_response: enrichRaw({
          error: "regel_insert_failed",
          db_error: insertError.message,
          attempted_count: regelInserts.length,
          parsed_data: parsed,
        }),
        ...parseMethodFields,
      })
      .eq("id", factuurId);
    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "failed",
    });
    return;
  }

  // --- Mark completed ---
  await supabase
    .from("factuur_uploads")
    .update({
      status: "review",
      ai_parsing_status: "completed",
      ai_parsed_at: new Date().toISOString(),
      ai_confidence_overall: parsed.confidence_overall ?? null,
      ai_raw_response: enrichRaw(parsed),
      leverancier_naam_herkend: leverancierNaam ?? null,
      leverancier_id: leverancierId ?? factuur.leverancier_id,
      fuzzy_kandidaten: fuzzyKandidaten,
      factuurnummer: parsed.factuurnummer ?? factuur.factuurnummer,
      factuurdatum: parsed.factuurdatum ?? factuur.factuurdatum,
      totaalbedrag: parsed.totaalbedrag ?? factuur.totaalbedrag,
      ...parseMethodFields,
    })
    .eq("id", factuurId);

  await broadcastFactuurStatus(supabase, locationId, {
    factuurId,
    aiParsingStatus: "completed",
    status: "review",
  });

  console.log(
    `[parse-factuur] ${factuurId} done — regels=${regelInserts.length}, ` +
      `model=${aiResult.model}, fallback=${aiResult.wasFallback}, cost=€${aiResult.costEur}`
  );
}

// =====================================================
// SPRINT Stap 2 — runTextPath
// -----------------------------------------------------------
// Échte insert-flow gebaseerd op text-pad parser-resultaat.
// Skipt multimodal volledig bij succes. Stappen:
//   1. Leverancier-resolve (exact → alias → fuzzy)
//   2. Bulk Tier-1 lookup (artikelnummer × leverancier)
//   3. Per-regel matching (Tier 1 hit / unmatched)
//   4. Ronde 2 — Flash AI semantic match voor unmatched (graceful)
//   5. Prijs/verpakking-berekening (cache aanwezig → /verpakking_hvh)
//   6. Bulk insert factuur_regels
//   7. Update header (status='review', parse_method='text')
//   8. Broadcast completed
//
// Bij DB-error op bulk insert → throw → caller valt terug op multimodal.
// Bij Ronde 2 AI failure → log + ga verder zonder matches (geen throw).
// =====================================================

interface RunTextPathParams {
  supabase: ReturnType<typeof createClient>;
  factuurId: string;
  locationId: string;
  organizationId: string;
  factuur: any;
  parsedData: TextParserResult;
  textParseConfidence: number | null;
  enrichRaw: (base: Record<string, any>) => Record<string, any>;
}

async function runTextPath(params: RunTextPathParams): Promise<void> {
  const {
    supabase,
    factuurId,
    locationId,
    organizationId,
    factuur,
    parsedData,
    textParseConfidence,
    enrichRaw,
  } = params;

  const startMs = Date.now();
  console.log(
    `[parse-factuur][textPath] ${factuurId} start — regels=${parsedData.regels.length} ` +
      `leverancier_raw=${parsedData.leverancier_naam_raw}`
  );

  // ---------- 1. Leverancier-resolve ----------
  let leverancierId: string | null = factuur.leverancier_id ?? null;
  let fuzzyKandidaten: Array<{ id: string; naam: string; similarity: number }> = [];
  const leverancierNaam = parsedData.leverancier_naam_raw;

  if (!leverancierId && leverancierNaam) {
    const { data: exactMatch } = await supabase
      .from("leveranciers")
      .select("id")
      .eq("location_id", locationId)
      .ilike("naam", leverancierNaam)
      .limit(1)
      .maybeSingle();

    if (exactMatch) {
      leverancierId = (exactMatch as any).id;
    } else {
      const { data: aliasMatch } = await supabase
        .from("leverancier_aliassen")
        .select("leverancier_id, leveranciers!inner(location_id)")
        .ilike("alias_naam", leverancierNaam)
        .eq("leveranciers.location_id", locationId)
        .limit(1)
        .maybeSingle();

      if (aliasMatch) {
        leverancierId = (aliasMatch as any).leverancier_id;
      } else {
        const { data: fuzzyData, error: fuzzyErr } = await supabase.rpc(
          "fuzzy_match_leverancier",
          { p_location_id: locationId, p_naam: leverancierNaam }
        );
        if (fuzzyErr) {
          console.warn(
            "[parse-factuur][textPath] fuzzy_match_leverancier failed:",
            fuzzyErr.message
          );
        } else if (Array.isArray(fuzzyData)) {
          fuzzyKandidaten = fuzzyData
            .filter((r: any) => Number(r.similarity) >= 0.5)
            .slice(0, 3)
            .map((r: any) => ({
              id: r.id,
              naam: r.naam,
              similarity: Number(r.similarity),
            }));
        }
      }
    }
  }

  // ---------- 2. Bulk Tier-1 lookup ----------
  type Tier1Entry = {
    ingredient_id: string;
    verpakking_hoeveelheid: number | null;
    verpakking_eenheid: string | null;
  };
  const tier1Map = new Map<string, Tier1Entry>();

  const artnrs = Array.from(
    new Set(
      parsedData.regels
        .map((r) => (r.artikelnummer != null ? String(r.artikelnummer).trim() : ""))
        .filter((s) => s.length > 0)
    )
  );

  if (leverancierId && artnrs.length > 0) {
    const { data: bulk, error: bulkErr } = await supabase
      .from("leveranciers_artikelen")
      .select("artikel_nummer, ingredient_id, verpakking_hoeveelheid, verpakking_eenheid")
      .eq("leverancier_id", leverancierId)
      .eq("is_actief", true)
      .not("ingredient_id", "is", null)
      .in("artikel_nummer", artnrs);

    if (bulkErr) {
      console.warn(
        `[parse-factuur][textPath] ${factuurId} bulk Tier-1 lookup failed:`,
        bulkErr.message
      );
    } else if (bulk) {
      for (const row of bulk as any[]) {
        if (row.artikel_nummer && row.ingredient_id) {
          tier1Map.set(String(row.artikel_nummer), {
            ingredient_id: row.ingredient_id,
            verpakking_hoeveelheid: row.verpakking_hoeveelheid ?? null,
            verpakking_eenheid: row.verpakking_eenheid ?? null,
          });
        }
      }
    }
  }

  console.log(
    `[parse-factuur][textPath] ${factuurId} Tier-1: ${tier1Map.size}/${artnrs.length} artnrs gematched`
  );

  // ---------- 3. Per-regel matching ----------
  type RowMatch = {
    idx: number;
    ingredientId: string | null;
    matchStatus: "matched" | "unmatched";
    matchConfidence: number | null;
    tier1Cache: Tier1Entry | null;
  };
  const matches: RowMatch[] = parsedData.regels.map((regel, idx) => {
    const artnr =
      regel.artikelnummer != null ? String(regel.artikelnummer).trim() : "";
    const cache = artnr ? tier1Map.get(artnr) : undefined;
    if (cache) {
      return {
        idx,
        ingredientId: cache.ingredient_id,
        matchStatus: "matched",
        matchConfidence: 1.0,
        tier1Cache: cache,
      };
    }
    return {
      idx,
      ingredientId: null,
      matchStatus: "unmatched",
      matchConfidence: null,
      tier1Cache: null,
    };
  });

  // ---------- 4. Ronde 2 — Flash semantic match + clean_naam/category/eenheid (graceful) ----------
  const ALLOWED_CATEGORIES = new Set([
    "groenten", "vlees", "vis", "zuivel", "kruiden", "olie", "droog", "overig",
  ]);
  const ALLOWED_EENHEDEN = new Set(["kg", "g", "L", "ml", "stuk"]);

  const unmatched = matches.filter((m) => m.matchStatus === "unmatched");
  let round2Suggestions: any[] = [];
  let round2Error: string | null = null;
  const suggestionsByIdx = new Map<
    number,
    { clean_naam: string | null; category_hint: string | null; basiseenheid: string | null }
  >();

  if (unmatched.length > 0) {
    try {
      const { data: kandidaten, error: kandErr } = await supabase
        .from("ingredienten")
        .select("id, naam, categorie")
        .eq("location_id", locationId)
        .eq("is_archived", false)
        .limit(500);

      if (kandErr) throw new Error(`kandidaten query: ${kandErr.message}`);

      if (!kandidaten || kandidaten.length === 0) {
        console.log(
          `[parse-factuur][textPath] ${factuurId} Ronde 2 skipped — geen ingrediënten in locatie`
        );
      } else {
        const unmatchedInput = unmatched.map((m) => ({
          idx: m.idx,
          raw_naam: parsedData.regels[m.idx].product_naam,
          raw_artnr: parsedData.regels[m.idx].artikelnummer,
        }));
        const candidatesInput = (kandidaten as any[]).map((k) => ({
          id: k.id,
          naam: k.naam,
          categorie: k.categorie,
        }));

        const round2SystemPrompt = `Je matcht onbekende factuur-regels tegen bestaande ingrediënten in de keuken-database EN je verrijkt elke regel met schone metadata.

Voor elke regel in "unmatched":

A) MATCH tegen "candidates" met confidence 0.0-1.0:
- 0.95+: vrijwel zeker zelfde product (bv. "TOMATEN CHERRY" vs "Cherrytomaten")
- 0.85-0.94: zeer waarschijnlijk match (zelfde categorie, vergelijkbare naam)
- 0.6-0.84: mogelijk match maar onzeker
- <0.6 of geen kandidaat: ingredient_id=null

Negeer merknamen en verpakking. Focus op het product zelf.

B) Geef voor ELKE regel (OOK als ingredient_id=null) ALTIJD ook:

1. clean_naam: product-naam zonder merk/gewicht/verpakking/BTW-group
   Voorbeelden:
   - 'Corona Extra 24×35,5cl (H) Bier' → 'Corona Extra'
   - 'Lampolie FARMLIGHT 6×1ltr (H) Onkosten' → 'Lampolie FARMLIGHT'
   - 'Slagroom DEBIC 2ltr (L) Keuken' → 'Slagroom'
   - 'Griekse Yoghurt 10% APOSTELS PROTO 5kg' → 'Griekse Yoghurt'
   - "Brouwerij 't IJ - Natte blik bio. MOORTGAT 12x33cl" → "Brouwerij 't IJ Natte Blik Bio"

2. category_hint: exact één van: groenten, vlees, vis, zuivel, kruiden, olie, droog, overig. null bij onzeker.

3. basiseenheid: exact één van: kg, g, L, ml, stuk.
   Dit is de natuurlijke recept-eenheid, NIET de verpakking.
   Voorbeelden:
   - 'Olie 5L jerrycan' → 'L'
   - 'Bloem 25kg zak' → 'kg'
   - 'Eieren 30st doos' → 'stuk'
   - 'Corona 24x35,5cl' → 'stuk' (bier per flesje)

Output STRIKT als JSON:
{ "matches": [{ "idx": 0, "ingredient_id": "uuid-of-null", "confidence": 0.92, "reason": "korte uitleg", "clean_naam": "Corona Extra", "category_hint": "overig", "basiseenheid": "stuk" }] }`;

        const round2Prompt = JSON.stringify({
          unmatched: unmatchedInput,
          candidates: candidatesInput,
        });

        const aiRes = await callAI({
          featureKey: "factuur_round2_match",
          organizationId,
          locationId,
          systemPrompt: round2SystemPrompt,
          prompt: round2Prompt,
          jsonMode: true,
          maxTokens: 24000,
          temperature: 0.1,
          modelOverride: "google/gemini-2.5-flash",
          skipFallback: true,
          timeoutMs: 60_000,
        });

        // Parse JSON tolerant
        let parsed: any;
        try {
          let cleaned = aiRes.text.trim();
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          const fb = cleaned.indexOf("{");
          const lb = cleaned.lastIndexOf("}");
          if (fb >= 0 && lb > fb) cleaned = cleaned.slice(fb, lb + 1);
          parsed = JSON.parse(cleaned);
        } catch (parseErr: any) {
          throw new Error(`json parse: ${parseErr?.message ?? parseErr}`);
        }

        const matchList = Array.isArray(parsed?.matches) ? parsed.matches : [];
        round2Suggestions = matchList;

        // Apply matches + verzamel suggesties per idx (clean_naam/category/eenheid)
        for (const m of matchList) {
          const idx = typeof m.idx === "number" ? m.idx : null;
          if (idx == null) continue;

          // Suggesties altijd opslaan (ook bij null match), met whitelist-validatie
          const cleanNaam =
            typeof m.clean_naam === "string" && m.clean_naam.trim()
              ? m.clean_naam.trim()
              : null;
          const catHint =
            typeof m.category_hint === "string" && ALLOWED_CATEGORIES.has(m.category_hint)
              ? m.category_hint
              : null;
          const eenheid =
            typeof m.basiseenheid === "string" && ALLOWED_EENHEDEN.has(m.basiseenheid)
              ? m.basiseenheid
              : null;
          suggestionsByIdx.set(idx, {
            clean_naam: cleanNaam,
            category_hint: catHint,
            basiseenheid: eenheid,
          });

          // Auto-link bij voldoende confidence
          const conf = typeof m.confidence === "number" ? m.confidence : 0;
          const ingId = typeof m.ingredient_id === "string" ? m.ingredient_id : null;
          if (!ingId) continue;
          if (conf < 0.85) continue;
          const target = matches[idx];
          if (!target || target.matchStatus === "matched") continue;
          target.ingredientId = ingId;
          target.matchStatus = "matched";
          target.matchConfidence = conf;
        }

        const autoLinked = matchList.filter(
          (m: any) =>
            typeof m.confidence === "number" &&
            m.confidence >= 0.85 &&
            typeof m.ingredient_id === "string"
        ).length;

        console.log(
          `[parse-factuur][textPath] ${factuurId} Ronde 2 success — ` +
            `unmatched=${unmatched.length} suggesties=${matchList.length} auto-linked=${autoLinked} ` +
            `tokens=${aiRes.outputTokens} cost=€${aiRes.costEur}`
        );
      }
    } catch (round2Err: any) {
      // GRACEFUL DEGRADATION — geen throw
      round2Error = round2Err?.message ?? String(round2Err);
      console.warn(
        `[parse-factuur][textPath] ${factuurId} Ronde 2 failed (graceful):`,
        round2Error
      );
    }
  }

  // ---------- 4b. FIX 1: FK-validatie — filter ingredient_ids die niet (meer) bestaan ----------
  // Vangt drie scenarios: Tier-1 naar ondertussen verwijderd/gearchiveerd ingr.,
  // Ronde 2 AI-hallucinatie, én cross-location leaks (location_id filter).
  const candidateIds = Array.from(
    new Set(
      matches
        .map((m) => m.ingredientId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (candidateIds.length > 0) {
    const { data: validRows, error: validErr } = await supabase
      .from("ingredienten")
      .select("id")
      .eq("location_id", locationId)
      .eq("is_archived", false)
      .in("id", candidateIds);

    if (validErr) {
      console.warn(
        `[parse-factuur][textPath] ${factuurId} FK-validatie query failed — alle matches conservatief resetten:`,
        validErr.message
      );
      for (const m of matches) {
        if (m.ingredientId) {
          m.ingredientId = null;
          m.matchStatus = "unmatched";
          m.matchConfidence = null;
        }
      }
    } else {
      const validIds = new Set<string>();
      for (const row of (validRows ?? []) as any[]) validIds.add(row.id);
      let invalidCount = 0;
      const invalidIds: string[] = [];
      for (const m of matches) {
        if (m.ingredientId && !validIds.has(m.ingredientId)) {
          invalidIds.push(m.ingredientId);
          m.ingredientId = null;
          m.matchStatus = "unmatched";
          m.matchConfidence = null;
          invalidCount++;
        }
      }
      if (invalidCount > 0) {
        console.warn(
          `[parse-factuur][textPath] ${factuurId} ${invalidCount} invalid ingredient_ids detected — resetting to unmatched. Sample:`,
          invalidIds.slice(0, 5)
        );
      }
    }
  }

  // ---------- 5+6. Bouw rows + bulk insert ----------
  const regelInserts = parsedData.regels.map((regel, idx) => {
    const m = matches[idx];
    const cache = m.tier1Cache;
    const sug = suggestionsByIdx.get(idx);

    // FIX 1 — Hiërarchie: cache > AI-hint (Ronde 2) > regex > null
    const chosen = chooseVerpakking({
      cacheHvh: cache?.verpakking_hoeveelheid,
      cacheEenheid: cache?.verpakking_eenheid,
      aiHvh: null, // text-path Ronde 2 levert geen verpakking_aantal velden
      aiEenheid: null,
      ruweNaam: regel.product_naam ?? null,
    });
    const verpakkingHvh = chosen.hoeveelheid;
    const verpakkingEenheid = chosen.eenheid;

    const prijsOpFactuur =
      typeof regel.prijs_per_eenheid === "number" ? regel.prijs_per_eenheid : null;
    const prijsPerBasiseenheid =
      verpakkingHvh && prijsOpFactuur != null
        ? prijsOpFactuur / verpakkingHvh
        : prijsOpFactuur;

    const artnr =
      regel.artikelnummer != null ? String(regel.artikelnummer).trim() || null : null;

    // FIX 2 — Tier-1 / unmatched zonder Ronde 2 clean_naam: regex-clean fallback
    const ronde2CleanNaam = sug?.clean_naam ?? null;
    const fallbackCleanNaam =
      !ronde2CleanNaam && regel.product_naam
        ? cleanIngredientNaam(regel.product_naam) || null
        : null;
    const suggestedNaam = ronde2CleanNaam ?? fallbackCleanNaam;

    return {
      factuur_id: factuurId,
      product_naam_herkend: cleanProductNaamPrefix(regel.product_naam?.trim() ?? "") || "Onbekend",
      hoeveelheid: regel.hoeveelheid ?? null,
      eenheid: regel.eenheid ?? null,
      prijs_per_eenheid: prijsOpFactuur,
      totaal: regel.totaal ?? null,
      ingredient_id: m.ingredientId,
      match_status: m.matchStatus,
      match_confidence: m.matchConfidence,
      ai_confidence: textParseConfidence,
      ai_raw_naam: regel.product_naam ?? null,
      ai_raw_artikelnummer: artnr,
      ai_suggested_naam: suggestedNaam,
      ai_category_hint: sug?.category_hint ?? null,
      ai_suggested_eenheid: sug?.basiseenheid ?? null,
      is_nieuw_ingredient: !m.ingredientId,
      verpakking_hoeveelheid: verpakkingHvh,
      verpakking_eenheid: verpakkingEenheid,
      prijs_per_basiseenheid: prijsPerBasiseenheid,
      ai_raw_verpakking_tekst: null,
      ordernr: regel.ordernr ?? null,
    };
  });

  if (regelInserts.length === 0) {
    throw new Error("textPath: 0 regels in parsedData");
  }

  const { error: insertError } = await supabase
    .from("factuur_regels")
    .insert(regelInserts);

  if (insertError) {
    // FIX 2: Fail-fast — markeer failed, broadcast, en return. GEEN throw (triggert multimodal).
    const sampleIds = regelInserts
      .map((r) => r.ingredient_id)
      .filter(Boolean)
      .slice(0, 10);
    console.error(
      `[parse-factuur][textPath] ${factuurId} bulk insert failed — marking failed (no multimodal fallback):`,
      insertError.message,
      "sample_ingredient_ids=", sampleIds,
      "regels_count=", regelInserts.length
    );

    await supabase
      .from("factuur_uploads")
      .update({
        ai_parsing_status: "failed",
        ai_raw_response: enrichRaw({
          source: "text_path",
          error: "text_path_insert_failed",
          db_error_detail: insertError.message,
          db_error_code: (insertError as any).code ?? null,
          regels_attempted: regelInserts.length,
          round2_suggestions: round2Suggestions,
          round2_error: round2Error,
        }),
        parse_method: "text",
        parse_confidence: textParseConfidence,
      })
      .eq("id", factuurId);

    await broadcastFactuurStatus(supabase, locationId, {
      factuurId,
      aiParsingStatus: "failed",
    });

    return; // NIET throwen — multimodal fallback is overkill voor DB bug
  }

  // ---------- 7. Update header ----------
  const matchedCount = matches.filter((m) => m.matchStatus === "matched").length;
  const tier1MatchCount = matches.filter(
    (m) => m.matchStatus === "matched" && m.tier1Cache != null
  ).length;
  const { error: headerErr } = await supabase
    .from("factuur_uploads")
    .update({
      status: "review",
      ai_parsing_status: "completed",
      ai_parsed_at: new Date().toISOString(),
      ai_confidence_overall: parsedData.confidence ?? null,
      ai_raw_response: enrichRaw({
        source: "text_path",
        round2_suggestions: round2Suggestions,
        round2_error: round2Error,
        text_path_stats: {
          total_regels: parsedData.regels.length,
          tier1_matched: tier1MatchCount,
          round2_matched: matchedCount - tier1MatchCount,
          final_unmatched: parsedData.regels.length - matchedCount,
          duration_ms: Date.now() - startMs,
        },
      }),
      leverancier_naam_herkend: leverancierNaam ?? null,
      leverancier_id: leverancierId ?? factuur.leverancier_id,
      fuzzy_kandidaten: fuzzyKandidaten,
      factuurnummer: parsedData.factuurnummer ?? factuur.factuurnummer,
      factuurdatum: parsedData.factuurdatum ?? factuur.factuurdatum,
      totaalbedrag: parsedData.totaalbedrag ?? factuur.totaalbedrag,
      parse_method: "text",
      parse_confidence: textParseConfidence,
    })
    .eq("id", factuurId);

  if (headerErr) {
    // Regels al ingevoegd → niet throwen (anders multimodal duplicate inserts).
    console.error(
      `[parse-factuur][textPath] ${factuurId} header update failed (regels al ingevoegd):`,
      headerErr.message
    );
  }

  // ---------- 8. Broadcast ----------
  await broadcastFactuurStatus(supabase, locationId, {
    factuurId,
    aiParsingStatus: "completed",
    status: "review",
  });

  console.log(
    `[parse-factuur][textPath] ${factuurId} done — regels=${regelInserts.length} ` +
      `tier1=${tier1MatchCount} matched_total=${matchedCount} ` +
      `round2_err=${round2Error ? "yes" : "no"} duration=${Date.now() - startMs}ms`
  );
}
