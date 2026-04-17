// supabase/functions/parse-factuur/index.ts
// Sprint D.6b — Factuur AI Parser (Gemini Vision)
// Parst geüploade facturen via multimodal AI en slaat gestructureerde data op

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, resolveOrgId } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent een factuur-parser voor de horeca. Analyseer de factuurafbeelding en extraheer alle informatie.

Geef een JSON-object terug met exact deze structuur:
{
  "leverancier_naam": "naam van de leverancier op de factuur",
  "factuurnummer": "het factuurnummer",
  "factuurdatum": "YYYY-MM-DD formaat",
  "totaalbedrag": 123.45,
  "regels": [
    {
      "product_naam": "naam van het product",
      "artikelnummer": "artikelnummer indien zichtbaar, anders null",
      "hoeveelheid": 10,
      "eenheid": "kg, liter, stuk, doos, etc.",
      "prijs_per_eenheid": 2.50,
      "totaal": 25.00,
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
- Eenheden standaardiseren: kg, g, l, ml, stuk, doos, pak, bos, fles`;

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
    // bestand_url can be a full URL or a storage path
    // Extract the path after /facturen/
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

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryStr = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binaryStr += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryStr);

    // --- Call AI (Gemini Vision via callAI) ---
    let aiResult;
    try {
      aiResult = await callAI({
        featureKey: "factuur_parse",
        organizationId,
        locationId,
        systemPrompt: SYSTEM_PROMPT,
        prompt: "Analyseer deze factuurafbeelding en extraheer alle productregels en metadata.",
        images: [base64],
        jsonMode: true,
        maxTokens: 4000,
        temperature: 0.2,
        // R3: Pro is accurater dan Flash voor documentparsing.
        // Kosten: ~€0.008 vs ~€0.001 per factuur — verwaarloosbaar.
        modelOverride: "google/gemini-2.5-pro",
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

      // Rate limit / credits
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
    let parsed: any;
    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = aiResult.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Kon AI-response niet als JSON parsen");
      }
    }

    // --- Fuzzy match leverancier ---
    let leverancierId = factuur.leverancier_id;
    const leverancierNaam = parsed.leverancier_naam;

    if (!leverancierId && leverancierNaam) {
      // Try exact match first
      const { data: exactMatch } = await supabase
        .from("leveranciers")
        .select("id")
        .eq("location_id", locationId)
        .ilike("naam", leverancierNaam)
        .limit(1)
        .single();

      if (exactMatch) {
        leverancierId = exactMatch.id;
      } else {
        // Try alias match
        const { data: aliasMatch } = await supabase
          .from("leverancier_aliassen")
          .select("leverancier_id, leveranciers!inner(location_id)")
          .ilike("alias_naam", leverancierNaam)
          .limit(1)
          .single();

        if (aliasMatch) {
          leverancierId = aliasMatch.leverancier_id;
        }
      }
    }

    // --- Update factuur_uploads ---
    await supabase
      .from("factuur_uploads")
      .update({
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

    // --- Insert factuur_regels ---
    const regels = parsed.regels ?? [];
    const regelInserts = [];

    for (const regel of regels) {
      // Try to match ingredient
      let ingredientId: string | null = null;
      let matchStatus = "unmatched";
      let matchConfidence: number | null = null;

      if (regel.product_naam) {
        // Exact match on ingredient name
        const { data: exactIngredient } = await supabase
          .from("ingredienten")
          .select("id")
          .eq("location_id", locationId)
          .ilike("naam", regel.product_naam)
          .limit(1)
          .single();

        if (exactIngredient) {
          ingredientId = exactIngredient.id;
          matchStatus = "matched";
          matchConfidence = 1.0;
        } else {
          // Try alias match
          const { data: aliasIngredient } = await supabase
            .from("ingredient_aliassen")
            .select("ingredient_id, ingredienten!inner(location_id)")
            .ilike("alias_naam", regel.product_naam)
            .limit(1)
            .single();

          if (aliasIngredient) {
            ingredientId = aliasIngredient.ingredient_id;
            matchStatus = "matched";
            matchConfidence = 0.9;
          }
        }
      }

      regelInserts.push({
        factuur_id: factuurId,
        product_naam_herkend: regel.product_naam ?? "Onbekend",
        hoeveelheid: regel.hoeveelheid ?? null,
        eenheid: regel.eenheid ?? null,
        prijs_per_eenheid: regel.prijs_per_eenheid ?? null,
        totaal: regel.totaal ?? null,
        ingredient_id: ingredientId,
        match_status: matchStatus,
        match_confidence: matchConfidence,
        ai_confidence: regel.confidence ?? null,
        ai_raw_naam: regel.product_naam ?? null,
        ai_raw_artikelnummer: regel.artikelnummer ?? null,
        is_nieuw_ingredient: !ingredientId,
      });
    }

    if (regelInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("factuur_regels")
        .insert(regelInserts);

      if (insertError) {
        console.error("Error inserting factuur_regels:", insertError);
      }
    }

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
