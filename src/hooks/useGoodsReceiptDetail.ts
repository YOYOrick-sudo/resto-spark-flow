import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface GoodsReceiptLineWithIngredient {
  id: string;
  goods_receipt_id: string;
  product_naam_herkend: string;
  ai_raw_naam: string | null;
  ai_raw_artikelnummer: string | null;
  ai_confidence: number | null;
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
  ingredient?: {
    id: string;
    naam: string;
    haccp_categorie: string | null;
    haccp_strict_temp_max: number | null;
  } | null;
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
  created_at: string;
  updated_at: string;
  leverancier: { id: string; naam: string } | null;
  lines: GoodsReceiptLineWithIngredient[];
}

export interface SmartHaccpFlags {
  hasGekoeld: boolean;
  hasVries: boolean;
  hasRisicogroep: boolean;
  /** Strikste max-temp uit risicogroep ingredients (laagste waarde wint). */
  strictTempMax: number | null;
}

/**
 * Detail-query: pakbon + alle regels mét gejoinde ingredient (haccp_categorie, strict_temp_max).
 * Smart-detectie wordt client-side berekend voor live updates bij row-edits.
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
          "*, ingredient:ingredienten(id, naam, haccp_categorie, haccp_strict_temp_max)"
        )
        .eq("goods_receipt_id", id)
        .order("created_at", { ascending: true });
      if (lErr) throw lErr;

      return {
        ...(receipt as any),
        lines: (lines ?? []) as unknown as GoodsReceiptLineWithIngredient[],
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
