import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

/**
 * Loop 4: per-line factor-resolutie (CONFIRMED / AI_SUGGESTED / MANUAL_REQUIRED)
 * via leveranciers_artikelen lookup (leverancier_id × ingredient_id).
 *
 * Generiek voor elke leverancier — geen hardcoded namen.
 */

export type FactorMode = "CONFIRMED" | "AI_SUGGESTED" | "MANUAL_REQUIRED" | "SKIP";

export interface LineFactorContext {
  /** Bestaande supplier-article (indien gevonden in batch) */
  la_id: string | null;
  la_factor: number | null;
  la_eenheid: string | null;
  la_factor_source: "user" | "ai_confirmed" | "unknown" | null;
  la_confirmation_count: number;
  /** AI-detectie uit pakbon-parser, fallback voor eerste suggestie */
  ai_factor: number | null;
  ai_eenheid: string | null;
  /** True wanneer la.is_weighted OF ingredient.is_weighted */
  is_weighted: boolean;
  /** Best-effort base unit van ingredient — voor delta-preview */
  ingredient_base_unit: string | null;
  ingredient_eenheid: string | null;
  /** Vertoningsfactor + eenheid (eerste niet-null in volgorde la → ai) */
  display_factor: number | null;
  display_eenheid: string | null;
  /** Loop 4C: verpakking-LABEL ('kist', 'doos', 'pak'…) — nooit de inhoud-eenheid */
  verpakking_label: string | null;
  /** Eindmodus (server-aligned) */
  mode: FactorMode;
  /** Reden bij MANUAL_REQUIRED voor UX-helper */
  manual_reason: string | null;
}

export interface GoodsReceiptLineWithIngredient {
  id: string;
  goods_receipt_id: string;
  product_naam_herkend: string;
  ai_raw_naam: string | null;
  ai_raw_artikelnummer: string | null;
  ai_confidence: number | null;
  ai_per_package_quantity: number | null;
  ai_package_unit: string | null;
  ai_is_weighted: boolean | null;
  ai_package_label: string | null;
  hoeveelheid_verwacht: number | null;
  eenheid_verwacht: string | null;
  hoeveelheid_ontvangen: number | null;
  ingredient_id: string | null;
  is_nieuw_ingredient: boolean | null;
  match_confidence: number | null;
  match_status: string | null;
  haccp_categorie: string | null;
  lotnummer: string | null;
  tht_datum: string | null;
  status: string;
  afwijking_notitie: string | null;
  leverancier_artikel_id: string | null;
  ingredient?: {
    id: string;
    naam: string;
    eenheid: string | null;
    base_unit: string | null;
    haccp_categorie: string | null;
    haccp_strict_temp_max: number | null;
  } | null;
  /** Loop 4: factor-context, alleen relevant voor stock-mutaties */
  factor_ctx: LineFactorContext;
}

export interface GoodsReceiptDetail {
  id: string;
  location_id: string;
  organization_id: string;
  leverancier_id: string | null;
  pakbon_nummer: string | null;
  levering_datum: string | null;
  ontvangst_status: string;
  ai_parse_status: string;
  ai_parse_confidence: number | null;
  notities: string | null;
  totaal_regels_verwacht: number | null;
  totaal_regels_akkoord: number | null;
  totaal_regels_afwijking: number | null;
  temp_gekoeld_gemeten: number | null;
  temp_vries_gemeten: number | null;
  heeft_strict_temp_alarm: boolean;
  leverancier_warning: boolean;
  leverancier_warning_reason: string | null;
  created_at: string;
  updated_at: string;
  leverancier: { id: string; naam: string } | null;
  lines: GoodsReceiptLineWithIngredient[];
}

export interface SmartHaccpFlags {
  hasGekoeld: boolean;
  hasVries: boolean;
  hasRisicogroep: boolean;
  strictTempMax: number | null;
}

// Bekende eenheden uit conversion-service (sync gehouden met _shared/conversions)
const KNOWN_UNITS = new Set([
  "g", "kg", "mg",
  "ml", "l", "cl", "dl",
  "stuk", "stuks", "st",
]);

function resolveVerpakkingLabel(
  laLabel: string | null,
  aiLabel: string | null,
  ingredientBaseUnit: string | null,
): string {
  // Hiërarchie: la.verpakking_label → goods_receipt_lines.ai_package_label →
  // woordenboek-fallback op ingredient.base_unit.
  if (laLabel && laLabel.trim()) return laLabel.trim().toLowerCase();
  if (aiLabel && aiLabel.trim()) return aiLabel.trim().toLowerCase();
  switch ((ingredientBaseUnit ?? "").toLowerCase()) {
    case "stuk":
    case "stuks":
    case "st":
      return "stuks";
    case "kg":
    case "g":
      return "verpakking";
    case "l":
    case "ml":
      return "fles";
    default:
      return "verpakking";
  }
}

function computeFactorContext(
  line: any,
  la: any | null,
): LineFactorContext {
  const ingredient = line.ingredient ?? null;
  const ai_factor = line.ai_per_package_quantity ?? null;
  const ai_eenheid = line.ai_package_unit ?? null;
  const la_factor = la?.verpakking_hoeveelheid != null ? Number(la.verpakking_hoeveelheid) : null;
  const la_eenheid = la?.verpakking_eenheid ?? null;
  const la_source = (la?.factor_source ?? null) as LineFactorContext["la_factor_source"];
  const la_count = la?.confirmation_count ?? 0;
  const is_weighted = !!(la?.is_weighted || line.ai_is_weighted);

  const display_factor = la_factor ?? ai_factor;
  const display_eenheid = la_eenheid ?? ai_eenheid;

  const verpakking_label = resolveVerpakkingLabel(
    la?.verpakking_label ?? null,
    line.ai_package_label ?? null,
    ingredient?.base_unit ?? null,
  );

  // Geen ingredient gekoppeld → geen stock-mutatie mogelijk; mode is N/A maar markeer als manual zodat UI 'm flagt
  let mode: FactorMode = "MANUAL_REQUIRED";
  let manual_reason: string | null = null;

  if (!ingredient || !ingredient.base_unit) {
    manual_reason = "Eerste keer dit product — wat zit erin?";
    return {
      la_id: la?.id ?? null,
      la_factor, la_eenheid, la_factor_source: la_source, la_confirmation_count: la_count,
      ai_factor, ai_eenheid, is_weighted,
      ingredient_base_unit: ingredient?.base_unit ?? null,
      ingredient_eenheid: ingredient?.eenheid ?? null,
      display_factor, display_eenheid, verpakking_label, mode, manual_reason,
    };
  }

  // Variable-weight: chef MOET werkelijk gewicht invullen → MANUAL_REQUIRED tot input
  // (UI handelt dat af met aparte input; mode-bepaling negeert is_weighted hier omdat
  // factor zelf aanwezig kan zijn, maar de werkelijk_gewicht_g blijft verplicht)

  if (la && la_factor && la_eenheid) {
    if (!KNOWN_UNITS.has(la_eenheid.toLowerCase())) {
      mode = "MANUAL_REQUIRED";
      manual_reason = `Bevestig 1× wat er in een ${verpakking_label} zit`;
    } else if (la_source === "unknown") {
      mode = "MANUAL_REQUIRED";
      manual_reason = `Bevestig 1× wat er in een ${verpakking_label} zit`;
    } else if (la_count >= 3 && (la_source === "user" || la_source === "ai_confirmed")) {
      mode = "CONFIRMED";
    } else {
      mode = "AI_SUGGESTED";
    }
  } else if (ai_factor && ai_eenheid) {
    // Geen la maar wel AI-suggestie → AI_SUGGESTED zodat chef kan accepteren
    if (!KNOWN_UNITS.has(ai_eenheid.toLowerCase())) {
      mode = "MANUAL_REQUIRED";
      manual_reason = `Bevestig 1× wat er in een ${verpakking_label} zit`;
    } else {
      mode = "AI_SUGGESTED";
    }
  } else {
    mode = "MANUAL_REQUIRED";
    manual_reason = `Bevestig 1× wat er in een ${verpakking_label} zit`;
  }

  return {
    la_id: la?.id ?? null,
    la_factor, la_eenheid, la_factor_source: la_source, la_confirmation_count: la_count,
    ai_factor, ai_eenheid, is_weighted,
    ingredient_base_unit: ingredient.base_unit,
    ingredient_eenheid: ingredient.eenheid,
    display_factor, display_eenheid, verpakking_label, mode, manual_reason,
  };
}

/**
 * Detail-query: pakbon + alle regels + per-regel factor-context (LA batch).
 */
export function useGoodsReceiptDetail(id: string | undefined) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`pakbon:${locationId}`)
      .on("broadcast", { event: "goods_receipt.updated" }, () => {
        qc.invalidateQueries({ queryKey: ["goods-receipt-detail", id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, id, qc]);

  const query = useQuery({
    queryKey: ["goods-receipt-detail", id],
    queryFn: async (): Promise<GoodsReceiptDetail | null> => {
      if (!id) return null;
      const { data: receipt, error: rErr } = await supabase
        .from("goods_receipts")
        .select("*, leverancier:leveranciers(id, naam)")
        .eq("id", id)
        .maybeSingle();
      if (rErr) throw rErr;
      if (!receipt) return null;

      const { data: lines, error: lErr } = await supabase
        .from("goods_receipt_lines")
        .select(
          `*, ingredient:ingredienten(id, naam, eenheid, base_unit, haccp_categorie, haccp_strict_temp_max)`,
        )
        .eq("goods_receipt_id", id)
        .order("created_at", { ascending: true });
      if (lErr) throw lErr;

      // Loop 4: batch leveranciers_artikelen lookup
      const ingredientIds = Array.from(
        new Set((lines ?? []).map((l: any) => l.ingredient_id).filter(Boolean)),
      );
      const laMap = new Map<string, any>();
      if ((receipt as any).leverancier_id && ingredientIds.length > 0) {
        const { data: las, error: laErr } = await supabase
          .from("leveranciers_artikelen")
          .select(
            "id, ingredient_id, verpakking_hoeveelheid, verpakking_eenheid, verpakking_label, is_weighted, factor_source, confirmation_count",
          )
          .eq("leverancier_id", (receipt as any).leverancier_id)
          .eq("is_actief", true)
          .in("ingredient_id", ingredientIds as string[]);
        if (laErr) throw laErr;
        for (const la of las ?? []) laMap.set((la as any).ingredient_id, la);
      }

      const enriched = (lines ?? []).map((l: any) => {
        const la = l.ingredient_id ? laMap.get(l.ingredient_id) ?? null : null;
        return { ...l, factor_ctx: computeFactorContext(l, la) };
      });

      return {
        ...(receipt as any),
        lines: enriched as unknown as GoodsReceiptLineWithIngredient[],
      } as GoodsReceiptDetail;
    },
    enabled: !!id,
  });

  const smartFlags = useMemo<SmartHaccpFlags>(() => {
    const lines = query.data?.lines ?? [];
    let hasGekoeld = false;
    let hasVries = false;
    let hasRisicogroep = false;
    let strictTempMax: number | null = null;

    for (const ln of lines) {
      const cat = ln.ingredient?.haccp_categorie ?? ln.haccp_categorie;
      const strictMax = ln.ingredient?.haccp_strict_temp_max ?? null;
      if (cat === "gekoeld") hasGekoeld = true;
      if (cat === "vries") hasVries = true;
      if (strictMax !== null || cat === "vis_op_ijs") {
        hasRisicogroep = true;
        if (strictMax !== null) {
          strictTempMax =
            strictTempMax === null ? strictMax : Math.min(strictTempMax, strictMax);
        }
      }
    }

    return { hasGekoeld, hasVries, hasRisicogroep, strictTempMax };
  }, [query.data]);

  return { ...query, smartFlags };
}
