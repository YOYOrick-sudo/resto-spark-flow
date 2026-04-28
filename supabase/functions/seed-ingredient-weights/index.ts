// supabase/functions/seed-ingredient-weights/index.ts
// Sprint 2E Loop 3 — AI-seed pass voor weight_per_piece_g + density.
//
// DOEL:
//   Vul voor alle 'st'-base ingredients zonder weight_per_piece_g een
//   realistische schatting in. Gemini Flash bepaalt avg/min/max gewicht en
//   density. Resultaat krijgt conversion_source='ai_suggested' +
//   conversion_confidence=0.5 zodat de chef later kan bevestigen
//   (Loop 4 verhoogt naar 0.8/1.0).
//
// AUTH:
//   - JWT vereist (Bearer token van ingelogde owner)
//   - Owner-check: user moet 'owner' rol hebben in `location_id`
//   - location_id is verplichte body-parameter
//
// FLOW:
//   1. Auth + owner check
//   2. Fetch alle ingredients waar base_unit='st' AND weight_per_piece_g IS NULL
//      AND location_id = <param>
//   3. Per batch van 10 → callAI met responseSchema
//   4. Update ingredienten per record
//   5. Return summary { total, succeeded, failed, costEur }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { callAI, resolveOrgId } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 10;

interface IngredientRow {
  id: string;
  naam: string;
  categorie?: string | null;
}

interface SeedResult {
  id: string;
  weight_per_piece_g: number;
  weight_per_piece_min_g: number;
  weight_per_piece_max_g: number;
  density_g_per_ml: number;
  is_variable_weight: boolean;
  reasoning: string;
}

const RESPONSE_SCHEMA = {
  name: "ingredient_weights",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["ingredients"],
    properties: {
      ingredients: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "weight_per_piece_g",
            "weight_per_piece_min_g",
            "weight_per_piece_max_g",
            "density_g_per_ml",
            "is_variable_weight",
            "reasoning",
          ],
          properties: {
            id: { type: "string" },
            weight_per_piece_g: { type: "number" },
            weight_per_piece_min_g: { type: "number" },
            weight_per_piece_max_g: { type: "number" },
            density_g_per_ml: { type: "number" },
            is_variable_weight: { type: "boolean" },
            reasoning: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Je bent een culinaire database-expert.
Voor elk ingredient geef je een realistische schatting van het gemiddelde
gewicht per stuk in gram, plus een min/max bereik en density.

Voorbeelden:
- Aubergine: avg 350g (min 250, max 450), variable=true
- Citroen: avg 100g (80-130), variable=false
- Limoen: avg 60g (50-80), variable=false
- Knoflookteen: avg 4g (3-6), variable=false
- Aardappel: avg 150g (100-250), variable=true
- Ui: avg 150g (100-200), variable=true
- Bos koriander: avg 30g (20-40), variable=true
- Komkommer: avg 400g (350-450), variable=false
- Paprika: avg 180g (150-220), variable=false

Bepaal ook:
- is_variable_weight: true als max/min ratio > 1.5
- density_g_per_ml: 1.0 voor de meeste vaste stoffen, anders specifiek
  (olie 0.92, melk 1.03, honing 1.42, room 1.0, stroop 1.4)

reasoning: 1 korte zin (max 80 tekens).
Output STRIKT volgens schema. Voor elk ingredient-id in de input geef
je exact één entry terug.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }
    const userId = userData.user.id;

    // --- Body ---
    const body = await req.json().catch(() => ({}));
    const locationId: string | undefined = body.location_id;
    const dryRun: boolean = body.dry_run === true;
    if (!locationId) {
      return json({ error: "location_id is required in body" }, 400);
    }

    // --- Owner check ---
    const { data: hasRole, error: roleErr } = await supabaseAdmin.rpc(
      "user_has_role_in_location",
      { _user_id: userId, _location_id: locationId, _roles: ["owner"] },
    );
    if (roleErr) {
      return json({ error: `Role check failed: ${roleErr.message}` }, 500);
    }
    if (!hasRole) {
      return json({ error: "Owner role required for this location" }, 403);
    }

    // --- Fetch candidates ---
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("ingredienten")
      .select("id, naam, categorie")
      .eq("location_id", locationId)
      .eq("base_unit", "st")
      .is("weight_per_piece_g", null);

    if (fetchErr) {
      return json({ error: `Fetch failed: ${fetchErr.message}` }, 500);
    }
    const ingredients = (rows ?? []) as IngredientRow[];
    if (ingredients.length === 0) {
      return json({
        message: "Geen ingredients zonder weight gevonden.",
        total: 0,
        succeeded: 0,
        failed: 0,
        costEur: 0,
      });
    }

    if (dryRun) {
      return json({
        dry_run: true,
        total: ingredients.length,
        sample: ingredients.slice(0, 5).map((i) => i.naam),
      });
    }

    const orgId = await resolveOrgId(locationId);

    // --- Batch process ---
    let succeeded = 0;
    const failedIds: string[] = [];
    const failures: Array<{ id: string; reason: string }> = [];
    let totalCost = 0;
    const startTime = Date.now();

    const batches = chunk(ingredients, BATCH_SIZE);
    console.log(
      `[seed-weights] location=${locationId} candidates=${ingredients.length} batches=${batches.length}`,
    );

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      const userPrompt = `Schat gewicht/density voor deze ${batch.length} ingredients:\n\n` +
        batch
          .map((i) => `- id=${i.id} | naam="${i.naam}"${i.categorie ? ` | cat=${i.categorie}` : ""}`)
          .join("\n");

      try {
        const aiResp = await callAI({
          featureKey: "seed-ingredient-weights",
          organizationId: orgId,
          locationId,
          systemPrompt: SYSTEM_PROMPT,
          prompt: userPrompt,
          modelOverride: "google/gemini-2.5-flash",
          reasoningEffort: "none",
          responseSchema: RESPONSE_SCHEMA as any,
          maxTokens: 4000,
          temperature: 0.2,
          skipFallback: false,
        });
        totalCost += aiResp.costEur;

        let parsed: { ingredients: SeedResult[] };
        try {
          parsed = JSON.parse(aiResp.text);
        } catch (e) {
          console.error(`[seed-weights] batch ${bi} JSON parse failed`, e);
          batch.forEach((i) => {
            failedIds.push(i.id);
            failures.push({ id: i.id, reason: "json_parse_failed" });
          });
          continue;
        }

        // Update per row
        for (const r of parsed.ingredients ?? []) {
          // Guard: ingredient moet in batch zitten (anti-hallucinatie)
          if (!batch.find((b) => b.id === r.id)) {
            failures.push({ id: r.id, reason: "ai_returned_unknown_id" });
            continue;
          }
          if (
            !Number.isFinite(r.weight_per_piece_g) ||
            r.weight_per_piece_g <= 0 ||
            r.weight_per_piece_g > 50000
          ) {
            failedIds.push(r.id);
            failures.push({ id: r.id, reason: "invalid_weight" });
            continue;
          }
          const { error: updErr } = await supabaseAdmin
            .from("ingredienten")
            .update({
              weight_per_piece_g: r.weight_per_piece_g,
              weight_per_piece_min_g: r.weight_per_piece_min_g,
              weight_per_piece_max_g: r.weight_per_piece_max_g,
              density_g_per_ml: r.density_g_per_ml ?? 1.0,
              is_variable_weight: r.is_variable_weight ?? false,
              conversion_source: "ai_suggested",
              conversion_confidence: 0.5,
            })
            .eq("id", r.id);
          if (updErr) {
            failedIds.push(r.id);
            failures.push({ id: r.id, reason: `update: ${updErr.message}` });
          } else {
            succeeded++;
          }
        }

        // Markeer ingredienten die AI niet teruggaf
        const returnedIds = new Set((parsed.ingredients ?? []).map((r) => r.id));
        for (const i of batch) {
          if (!returnedIds.has(i.id) && !failedIds.includes(i.id)) {
            failedIds.push(i.id);
            failures.push({ id: i.id, reason: "ai_omitted" });
          }
        }
      } catch (e) {
        console.error(`[seed-weights] batch ${bi} failed:`, e);
        batch.forEach((i) => {
          failedIds.push(i.id);
          failures.push({ id: i.id, reason: `batch_call: ${String(e).slice(0, 100)}` });
        });
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[seed-weights] DONE total=${ingredients.length} succeeded=${succeeded} failed=${failedIds.length} cost=€${totalCost.toFixed(4)} duration=${durationMs}ms`,
    );

    return json({
      total: ingredients.length,
      succeeded,
      failed: failedIds.length,
      costEur: Number(totalCost.toFixed(4)),
      durationMs,
      failures: failures.slice(0, 20), // top 20 voor debug
    });
  } catch (e) {
    console.error("[seed-weights] fatal:", e);
    return json({ error: String(e) }, 500);
  }
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
