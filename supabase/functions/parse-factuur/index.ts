// supabase/functions/parse-factuur/index.ts
// Sprint D.6b — Factuur AI Parser (Gemini Vision)
// Parst geüploade facturen via multimodal AI en slaat gestructureerde data op
//
// R3.5 — Verpakking → basiseenheid conversie
// SOURCE OF TRUTH (kritiek!):
//   - AI levert: prijs_per_eenheid (= prijs zoals op factuur, meestal per verpakking)
//                + verpakking_aantal + verpakking_eenheid + basiseenheid_per_item
//   - Nesto berekent ALTIJD ZELF: prijs_per_basiseenheid = prijs_per_eenheid / verpakking_aantal
//   - Zelfs als AI ooit prijs_per_stuk teruggeeft → NEGEER. Eén bron voorkomt afronding-conflicten.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, resolveOrgId } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const organizationId = factuur.locations?.organization_id;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Kan organisatie niet bepalen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Update status to processing ---
    await supabase
      .from("factuur_uploads")
      .update({ ai_parsing_status: "processing" })
      .eq("id", factuurId);

    // --- Download file from storage ---
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

    console.log(
      `[parse-factuur] file=${factuur.bestandsnaam} ext=${ext} mime=${mimeType} bytes=${uint8Array.length} path=${isPDF ? "documents[]" : "images[]"}`
    );

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
        maxTokens: 12000,
        temperature: 0.2,
        modelOverride: "google/gemini-2.5-flash",
        timeoutMs: 90_000,
      });
    } catch (aiError: any) {
      const errorMsg = aiError?.message || String(aiError);

      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: { error: errorMsg },
        })
        .eq("id", factuurId);

      if (errorMsg.includes("429") || errorMsg.includes("rate")) {
        return new Response(JSON.stringify({ error: "AI rate limit bereikt, probeer later opnieuw" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errorMsg.includes("402") || errorMsg.includes("credit")) {
        return new Response(JSON.stringify({ error: "AI credits op, neem contact op met support" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI parsing mislukt", details: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse AI response ---
    console.log(
      `[parse-factuur] AI response length=${aiResult.text.length}, first 500: ${aiResult.text.slice(0, 500)}`
    );

    if (aiResult.outputTokens && aiResult.outputTokens >= 10800) {
      console.warn(
        `[parse-factuur] Output near maxTokens limit (${aiResult.outputTokens}/12000) — risk of truncation.`
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
        "[parse-factuur] JSON parse failed. Raw (first 500):",
        aiResult.text.slice(0, 500)
      );
      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: {
            error: "json_parse_failed",
            parse_error: parseErr?.message ?? String(parseErr),
            raw_preview: aiResult.text.slice(0, 1000),
          },
        })
        .eq("id", factuurId);
      return new Response(
        JSON.stringify({ error: "AI response niet parseerbaar als JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Fuzzy match leverancier ---
    let leverancierId = factuur.leverancier_id;
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
          leverancierId = aliasMatch.leverancier_id;
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
        if (data?.ingredient_id) {
          ingredientId = data.ingredient_id;
          matchStatus = "matched";
          matchConfidence = 1.0;
          tier1Cache = {
            verpakking_hoeveelheid: data.verpakking_hoeveelheid as number | null,
            verpakking_eenheid: data.verpakking_eenheid as string | null,
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
        if (data?.ingredient_id) {
          ingredientId = data.ingredient_id;
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
        if (data?.ingredient_id) {
          ingredientId = data.ingredient_id;
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
          ingredientId = data.id;
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
        } else if (fuzzy?.length && fuzzy[0].similarity > 0.6) {
          ingredientId = fuzzy[0].id;
          matchStatus = "matched";
          matchConfidence = fuzzy[0].similarity;
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
      // prijs_per_eenheid = wat AI las van factuur (per verpakking als verpakking aanwezig is)
      // prijs_per_basiseenheid = ALTIJD afgeleid door Nesto, NOOIT van AI overgenomen.
      // Reden: voorkomt afronding-conflicten tussen AI's stuk-prijs en factuur-totaal.
      const allowedVerpakking = ["doos","pak","fles","krat","zak","jerrycan","bos"];
      const rawVerpEenh = regel.verpakking_eenheid?.toString().toLowerCase().trim();
      const aiVerpakkingEenheid = rawVerpEenh && allowedVerpakking.includes(rawVerpEenh) ? rawVerpEenh : null;

      const aiVerpakkingHvh = typeof regel.verpakking_aantal === "number" && regel.verpakking_aantal > 0
        ? regel.verpakking_aantal
        : null;

      // D.6b quick fix — Cache override: bij Tier 1 match én cache gevuld → gebruik cache, NEGEER AI
      const cacheHasPackaging =
        tier1Cache?.verpakking_hoeveelheid != null && tier1Cache?.verpakking_eenheid != null;
      const usedCachedPackaging = cacheHasPackaging;

      const verpakkingHvh = cacheHasPackaging
        ? Number(tier1Cache!.verpakking_hoeveelheid)
        : aiVerpakkingHvh;
      const verpakkingEenheid = cacheHasPackaging
        ? tier1Cache!.verpakking_eenheid
        : aiVerpakkingEenheid;

      const prijsOpFactuur = typeof regel.prijs_per_eenheid === "number" ? regel.prijs_per_eenheid : null;
      const prijsPerBasiseenheid = (verpakkingHvh && prijsOpFactuur != null)
        ? prijsOpFactuur / verpakkingHvh
        : prijsOpFactuur; // geen verpakking → factuurprijs is al per basiseenheid

      console.log(
        `[parse-factuur] regel "${productNaam}" tier=${matchConfidence ?? 'none'} ` +
        `cached_packaging_used=${usedCachedPackaging} ` +
        `verpakking=${verpakkingHvh}×${verpakkingEenheid} ` +
        `(ai=${aiVerpakkingHvh}×${aiVerpakkingEenheid})`
      );

      regelInserts.push({
        factuur_id: factuurId,
        product_naam_herkend: productNaam ?? "Onbekend",
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
        ai_suggested_naam: regel.clean_ingredient_naam?.toString().trim() || null,
        ai_category_hint: categoryHint,
        ai_suggested_eenheid: basiseenheid,
        is_nieuw_ingredient: !ingredientId,
        // R3.5 nieuwe kolommen
        verpakking_hoeveelheid: verpakkingHvh,
        verpakking_eenheid: verpakkingEenheid,
        prijs_per_basiseenheid: prijsPerBasiseenheid,
        ai_raw_verpakking_tekst: regel.verpakking_raw?.toString().trim() || null,
      });
    }

    // --- Guard: AI returned 0 regels = failed ---
    if (regelInserts.length === 0) {
      console.error("[parse-factuur] AI returned no regels");
      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: {
            error: "ai_returned_no_regels",
            parsed_data: parsed,
          },
        })
        .eq("id", factuurId);
      return new Response(
        JSON.stringify({ error: "AI heeft geen factuurregels herkend" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Insert factuur_regels ---
    const { error: insertError } = await supabase
      .from("factuur_regels")
      .insert(regelInserts);

    if (insertError) {
      console.error("[parse-factuur] regel insert failed:", insertError);
      await supabase
        .from("factuur_uploads")
        .update({
          ai_parsing_status: "failed",
          ai_raw_response: {
            error: "regel_insert_failed",
            db_error: insertError.message,
            attempted_count: regelInserts.length,
            parsed_data: parsed,
          },
        })
        .eq("id", factuurId);
      return new Response(
        JSON.stringify({
          error: "Regels konden niet opgeslagen worden",
          details: insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Pas NU status='review' + completed ---
    await supabase
      .from("factuur_uploads")
      .update({
        status: "review",
        ai_parsing_status: "completed",
        ai_parsed_at: new Date().toISOString(),
        ai_confidence_overall: parsed.confidence_overall ?? null,
        ai_raw_response: parsed,
        leverancier_naam_herkend: leverancierNaam ?? null,
        leverancier_id: leverancierId ?? factuur.leverancier_id,
        factuurnummer: parsed.factuurnummer ?? factuur.factuurnummer,
        factuurdatum: parsed.factuurdatum ?? factuur.factuurdatum,
        totaalbedrag: parsed.totaalbedrag ?? factuur.totaalbedrag,
      })
      .eq("id", factuurId);

    return new Response(
      JSON.stringify({
        success: true,
        factuurId,
        leverancier_herkend: leverancierNaam,
        leverancier_matched: !!leverancierId,
        regels_count: regelInserts.length,
        confidence_overall: parsed.confidence_overall,
        model: aiResult.model,
        cost_eur: aiResult.costEur,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("parse-factuur error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Onbekende fout" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
