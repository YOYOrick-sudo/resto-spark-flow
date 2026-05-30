// Edge Function: confirm-goods-receipt
// Loop 4: resolvet per regel de verpakking-factor + base-unit conversie
// vóór hij de RPC public.confirm_goods_receipt aanroept. Daarna emit
// hij een Realtime broadcast op pakbon:{location_id}.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  toBaseUnit,
  isKnownUnit,
  UnknownUnitError,
  MissingConversionError,
  type Ingredient as ConvIngredient,
} from "../_shared/conversions/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ----- Validatie -----
const ManualFactorSchema = z.object({
  hoeveelheid: z.number().positive(),
  eenheid: z.string().min(1).max(40),
});

const LineSchema = z.object({
  line_id: z.string().uuid(),
  status: z.enum([
    "akkoord",
    "afwijking_missing",
    "afwijking_beschadigd",
    "afwijking_verkeerd",
    "afwijking_meer",
  ]),
  hoeveelheid_ontvangen: z.number().nonnegative().optional(),
  lotnummer: z.string().max(100).optional(),
  tht_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  afwijking_notitie: z.string().max(2000).optional(),
  afwijking_foto_url: z.string().url().max(2000).optional(),
  accepted_with_issue: z.boolean().optional(),
  // Loop 4 extras
  accept_ai_factor: z.boolean().optional(),
  manual_factor: ManualFactorSchema.optional(),
  werkelijk_gewicht_g: z.number().positive().optional(),
});

const TempSkipSchema = z
  .object({
    gekoeld: z.string().min(1).max(200).optional(),
    vries: z.string().min(1).max(200).optional(),
  })
  .optional()
  .default({});

const BodySchema = z.object({
  receipt_id: z.string().uuid(),
  lines: z.array(LineSchema).min(1).max(200),
  temp_gekoeld: z.number().min(-30).max(50).optional().nullable(),
  temp_vries: z.number().min(-50).max(20).optional().nullable(),
  temp_skip: TempSkipSchema,
});

type ErrorCode =
  | "unauthorized"
  | "validation_error"
  | "forbidden"
  | "receipt_not_found"
  | "already_confirmed"
  | "factor_required"
  | "needs_confirmation_required"
  | "unit_mismatch"
  | "internal_error";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status: number, details?: unknown) {
  return jsonResponse(status, { error: code, message, details });
}

// Sprint Pakbon-boeking: helpers voor 4-takken-prioriteit.
// Identity-LA = unknown source + factor=1 + stuks-eenheid (placeholder bij ingest).
// Die voegt geen info toe en mag NIET als bron voor boeking dienen wanneer er
// een pakbon-totaal beschikbaar is.
function isIdentityLA(
  la: { factor_source?: string | null; verpakking_hoeveelheid?: number | string | null; verpakking_eenheid?: string | null } | null | undefined,
): boolean {
  if (!la) return false;
  if (la.factor_source !== "unknown") return false;
  const f = Number(la.verpakking_hoeveelheid ?? NaN);
  if (!Number.isFinite(f) || Math.abs(f - 1) > 0.001) return false;
  const u = String(la.verpakking_eenheid ?? "").trim().toLowerCase().replace(/\.$/, "");
  return u === "stuk" || u === "stuks" || u === "st";
}

const FACTOR_CONFLICT_TOLERANCE = 0.02; // sync met src/lib/unitBridge.factorsEquivalent

interface ResolvedLine {
  line_id: string;
  status: string;
  hoeveelheid_ontvangen?: number;
  lotnummer?: string;
  tht_datum?: string;
  afwijking_notitie?: string;
  afwijking_foto_url?: string;
  accepted_with_issue?: boolean;
  // pre-computed for RPC
  leverancier_artikel_id?: string;
  delta_base?: number;
  base_unit?: string;
  factor_status?: "confirmed" | "manual_required" | "unknown";
  factor_source_to_set?: "ai_confirmed" | "user" | null;
  werkelijk_gewicht_g?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("validation_error", "Method not allowed", 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ----- 1. Auth -----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("unauthorized", "Missing bearer token", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;
  const isServiceRoleBypass = token === SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceRoleBypass) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supabaseAuth.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return errorResponse("unauthorized", "Invalid or expired token", 401);
    }
    userId = data.claims.sub;
  } else {
    userId = "";
  }

  // ----- 2. Body validatie -----
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return errorResponse("validation_error", "Invalid JSON body", 400);
  }

  if (isServiceRoleBypass && typeof bodyJson === "object" && bodyJson !== null) {
    const smokeUid = (bodyJson as Record<string, unknown>)._smoke_user_id;
    if (typeof smokeUid !== "string" || !smokeUid) {
      return errorResponse("validation_error", "Service-role bypass requires _smoke_user_id in body", 400);
    }
    userId = smokeUid;
  }

  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return errorResponse("validation_error", "Body failed validation", 400, parsed.error.flatten());
  }
  const body = parsed.data;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ----- 3. Pre-RPC: factor-resolution -----
  // Haal receipt op (voor leverancier_id)
  const { data: receipt, error: rcErr } = await supabaseAdmin
    .from("goods_receipts")
    .select("id, leverancier_id, location_id, ontvangst_status")
    .eq("id", body.receipt_id)
    .maybeSingle();

  if (rcErr) {
    console.error("Receipt lookup failed", rcErr);
    return errorResponse("internal_error", "Receipt lookup failed", 500);
  }
  if (!receipt) {
    return errorResponse("receipt_not_found", "Pakbon bestaat niet", 404);
  }

  // Twijfelzone-guard (Sprint Pakbon Kok-flow, etappe 2): pakbon kan niet
  // bevestigd worden zolang er regels met match_status='needs_confirmation'
  // open staan. De kok moet eerst per open regel "Ja, koppel" / "Andere kiezen"
  // / "Nieuw aanmaken" beantwoorden in LeveringDetail.
  const { data: openSuggestions, error: nsErr } = await supabaseAdmin
    .from("goods_receipt_lines")
    .select("id, product_naam_herkend")
    .eq("goods_receipt_id", body.receipt_id)
    .eq("match_status", "needs_confirmation");

  if (nsErr) {
    console.error("needs_confirmation lookup failed", nsErr);
    return errorResponse("internal_error", "Lines pre-check failed", 500);
  }
  if (openSuggestions && openSuggestions.length > 0) {
    return errorResponse(
      "needs_confirmation_required",
      `Bevestig of wijs ${openSuggestions.length} suggestie(s) af voordat je de pakbon afsluit.`,
      422,
      {
        lines: openSuggestions.map((l) => ({
          line_id: l.id,
          product: l.product_naam_herkend,
        })),
      },
    );
  }

  // Haal alle relevante lines op (met ingredient + bestaande la_id)
  const lineIds = body.lines.map((l) => l.line_id);
  const { data: dbLines, error: lnErr } = await supabaseAdmin
    .from("goods_receipt_lines")
    .select(
      `id, ingredient_id, product_naam_herkend, hoeveelheid_verwacht, eenheid_verwacht,
       leverancier_artikel_id, ai_package_label,
       ai_per_package_quantity, ai_package_unit, ai_is_weighted,
       ingredient:ingredienten ( id, eenheid, base_unit, weight_per_piece_g, density_g_per_ml )`,
    )
    .in("id", lineIds)
    .eq("goods_receipt_id", body.receipt_id);

  if (lnErr) {
    console.error("Lines lookup failed", lnErr);
    return errorResponse("internal_error", "Lines lookup failed", 500);
  }

  const dbLineMap = new Map<string, any>();
  for (const dl of dbLines ?? []) dbLineMap.set(dl.id, dl);

  // Resolve la_ids in batch (per leverancier+ingredient)
  const ingredientIds = Array.from(
    new Set((dbLines ?? []).map((d: any) => d.ingredient_id).filter(Boolean)),
  );
  const laMap = new Map<string, any>(); // key: ingredient_id

  if (receipt.leverancier_id && ingredientIds.length > 0) {
    const { data: las, error: laErr } = await supabaseAdmin
      .from("leveranciers_artikelen")
      .select(
        "id, ingredient_id, verpakking_hoeveelheid, verpakking_eenheid, is_weighted, factor_source, confirmation_count",
      )
      .eq("leverancier_id", receipt.leverancier_id)
      .eq("is_actief", true)
      .in("ingredient_id", ingredientIds);

    if (laErr) {
      console.error("LA lookup failed", laErr);
      return errorResponse("internal_error", "Supplier-article lookup failed", 500);
    }
    for (const la of las ?? []) laMap.set(la.ingredient_id, la);
  }

  // Per regel: bepaal factor_status / delta_base / la_id / factor_source_to_set
  const resolved: ResolvedLine[] = [];
  const factorErrors: Array<{ line_id: string; reason: string; product?: string }> = [];

  for (const inputLine of body.lines) {
    const out: ResolvedLine = { ...inputLine };
    const dbLine = dbLineMap.get(inputLine.line_id);
    if (!dbLine) {
      // RPC zal dit hard maken; geen factor nodig
      resolved.push(out);
      continue;
    }

    const isStockMutation =
      (inputLine.status === "akkoord" || inputLine.accepted_with_issue === true) &&
      dbLine.ingredient_id != null;

    if (!isStockMutation) {
      resolved.push(out);
      continue;
    }

    const ingredient = dbLine.ingredient;
    if (!ingredient || !ingredient.base_unit) {
      factorErrors.push({
        line_id: inputLine.line_id,
        reason: "ingredient_or_base_unit_missing",
        product: dbLine.product_naam_herkend,
      });
      out.factor_status = "manual_required";
      resolved.push(out);
      continue;
    }

    let la = laMap.get(dbLine.ingredient_id);

    // 3a. MANUAL FACTOR (chef-input wint altijd) — upsert la, gebruik die
    if (inputLine.manual_factor) {
      const mf = inputLine.manual_factor;
      // Upsert la
      let laId = la?.id ?? dbLine.leverancier_artikel_id ?? null;
      const labelToPersist = (dbLine.ai_package_label as string | null) ?? null;
      if (laId) {
        const updatePayload: Record<string, unknown> = {
          verpakking_hoeveelheid: mf.hoeveelheid,
          verpakking_eenheid: mf.eenheid,
          factor_source: "user",
          updated_at: new Date().toISOString(),
        };
        if (labelToPersist) updatePayload.verpakking_label = labelToPersist;
        const { error: upErr } = await supabaseAdmin
          .from("leveranciers_artikelen")
          .update(updatePayload)
          .eq("id", laId);
        if (upErr) {
          console.error("LA update failed", upErr);
          return errorResponse("internal_error", "Failed to save manual factor", 500);
        }
      } else if (receipt.leverancier_id && dbLine.ingredient_id) {
        // Insert nieuwe la met chef-factor
        const insertPayload: Record<string, unknown> = {
          leverancier_id: receipt.leverancier_id,
          ingredient_id: dbLine.ingredient_id,
          artikel_naam: dbLine.product_naam_herkend ?? "Onbekend",
          verpakking_hoeveelheid: mf.hoeveelheid,
          verpakking_eenheid: mf.eenheid,
          factor_source: "user",
          type: "handmatig",
          is_actief: true,
        };
        if (labelToPersist) insertPayload.verpakking_label = labelToPersist;
        const { data: ins, error: insErr } = await supabaseAdmin
          .from("leveranciers_artikelen")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insErr) {
          console.error("LA insert failed", insErr);
          return errorResponse("internal_error", "Failed to create supplier-article", 500);
        }
        laId = ins.id;
      }
      la = {
        id: laId,
        ingredient_id: dbLine.ingredient_id,
        verpakking_hoeveelheid: mf.hoeveelheid,
        verpakking_eenheid: mf.eenheid,
        is_weighted: la?.is_weighted ?? false,
        factor_source: "user",
        confirmation_count: la?.confirmation_count ?? 0,
      };
      out.factor_source_to_set = "user";
    }

    // 3b. la moet bestaan en bekend zijn
    if (!la || !la.verpakking_hoeveelheid || !la.verpakking_eenheid) {
      factorErrors.push({
        line_id: inputLine.line_id,
        reason: la ? "incomplete_packaging" : "no_supplier_article",
        product: dbLine.product_naam_herkend,
      });
      out.factor_status = "manual_required";
      resolved.push(out);
      continue;
    }

    // factor_source==unknown EN chef heeft niet bevestigd → MANUAL_REQUIRED
    if (la.factor_source === "unknown" && !inputLine.accept_ai_factor && !inputLine.manual_factor) {
      factorErrors.push({
        line_id: inputLine.line_id,
        reason: "factor_unknown_not_accepted",
        product: dbLine.product_naam_herkend,
      });
      out.factor_status = "manual_required";
      resolved.push(out);
      continue;
    }

    out.leverancier_artikel_id = la.id;

    // promotion: unknown → ai_confirmed bij eerste accept
    if (
      !out.factor_source_to_set &&
      la.factor_source === "unknown" &&
      inputLine.accept_ai_factor
    ) {
      out.factor_source_to_set = "ai_confirmed";
    }

    const isWeighted = !!(la.is_weighted || dbLine.ai_is_weighted);
    const aantalVerpakkingen = inputLine.hoeveelheid_ontvangen ?? dbLine.hoeveelheid_verwacht ?? 1;

    // 3c. VARIABLE WEIGHT: chef MOET werkelijk_gewicht_g geven
    if (isWeighted) {
      if (inputLine.werkelijk_gewicht_g == null) {
        factorErrors.push({
          line_id: inputLine.line_id,
          reason: "werkelijk_gewicht_required",
          product: dbLine.product_naam_herkend,
        });
        out.factor_status = "manual_required";
        resolved.push(out);
        continue;
      }
      // delta_base = werkelijk_gewicht_g (per verpakking) * aantal verpakkingen
      // Convert van g → ingredient.base_unit indien nodig
      try {
        const totalGrams = inputLine.werkelijk_gewicht_g * aantalVerpakkingen;
        const deltaBase = toBaseUnit(totalGrams, "g", ingredient as ConvIngredient);
        out.delta_base = deltaBase;
        out.base_unit = ingredient.base_unit;
        out.factor_status = "confirmed";
        out.werkelijk_gewicht_g = inputLine.werkelijk_gewicht_g;
      } catch (e) {
        const reason = e instanceof MissingConversionError || e instanceof UnknownUnitError
          ? e.message : "conversion_error";
        factorErrors.push({ line_id: inputLine.line_id, reason, product: dbLine.product_naam_herkend });
        out.factor_status = "manual_required";
      }
      resolved.push(out);
      continue;
    }

    // 3d. NORMAL FACTOR: aantal_verpakkingen * factor convert naar base
    if (!isKnownUnit(la.verpakking_eenheid)) {
      factorErrors.push({
        line_id: inputLine.line_id,
        reason: `unknown_packaging_unit:${la.verpakking_eenheid}`,
        product: dbLine.product_naam_herkend,
      });
      out.factor_status = "manual_required";
      resolved.push(out);
      continue;
    }

    try {
      const totalInPackagingUnit = Number(la.verpakking_hoeveelheid) * Number(aantalVerpakkingen);
      const deltaBase = toBaseUnit(
        totalInPackagingUnit,
        la.verpakking_eenheid,
        ingredient as ConvIngredient,
      );
      out.delta_base = deltaBase;
      out.base_unit = ingredient.base_unit;
      out.factor_status = "confirmed";
    } catch (e) {
      if (e instanceof MissingConversionError || e instanceof UnknownUnitError) {
        factorErrors.push({
          line_id: inputLine.line_id,
          reason: e.message,
          product: dbLine.product_naam_herkend,
        });
        out.factor_status = "manual_required";
      } else {
        console.error("Unexpected conversion error", e);
        return errorResponse("internal_error", "Conversion failure", 500);
      }
    }

    resolved.push(out);
  }

  // Hard fail VÓÓR RPC als er factor-errors zijn (defense-in-depth, betere errors voor UI)
  if (factorErrors.length > 0) {
    return errorResponse(
      "factor_required",
      "Een of meer regels missen een geldige verpakking-factor",
      422,
      { lines: factorErrors },
    );
  }

  // ----- 4. RPC call -----
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "confirm_goods_receipt" as never,
    {
      _receipt_id: body.receipt_id,
      _user_id: userId,
      _lines: resolved,
      _temp_gekoeld: body.temp_gekoeld ?? null,
      _temp_vries: body.temp_vries ?? null,
      _temp_skip: body.temp_skip ?? {},
    } as never,
  );

  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("forbidden")) {
      return errorResponse("forbidden", "Geen permissie voor deze locatie", 403);
    }
    if (msg.includes("receipt_not_found")) {
      return errorResponse("receipt_not_found", "Pakbon bestaat niet", 404);
    }
    if (msg.includes("already_confirmed")) {
      return errorResponse("already_confirmed", "Pakbon is al bevestigd of geannuleerd", 409);
    }
    if (msg.includes("factor_required")) {
      return errorResponse(
        "factor_required",
        "RPC weigerde stock-mutatie zonder geldige factor",
        422,
        { pg_message: msg },
      );
    }
    console.error("RPC failure", rpcError);
    return errorResponse("internal_error", msg || "RPC failed", 500, {
      pg_code: rpcError.code,
    });
  }

  const summary = rpcResult as Record<string, unknown> | null;
  if (!summary || typeof summary !== "object") {
    return errorResponse("internal_error", "RPC returned empty result", 500);
  }

  // ----- 5. Realtime broadcast -----
  const locationId = String(summary.location_id || "");
  if (locationId) {
    const channel = supabaseAdmin.channel(`pakbon:${locationId}`);
    try {
      await channel.send({
        type: "broadcast",
        event: "goods_receipt.updated",
        payload: {
          receipt_id: summary.receipt_id,
          new_status: summary.new_status,
          summary,
        },
      });
    } catch (e) {
      console.error("Broadcast emit failed", e);
    } finally {
      await supabaseAdmin.removeChannel(channel);
    }
  }

  return jsonResponse(200, { ok: true, summary });
});
