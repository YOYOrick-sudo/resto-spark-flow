import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FactuurRegel {
  id: string;
  factuur_id: string;
  ingredient_id: string | null;
  product_naam_herkend: string;
  hoeveelheid: number | null;
  eenheid: string | null;
  prijs_per_eenheid: number | null;
  totaal: number | null;
  match_status: string;
  match_confidence: number | null;
  ai_confidence: number | null;
  ai_raw_naam: string | null;
  ai_raw_artikelnummer: string | null;
  ai_suggested_naam: string | null;
  ai_category_hint: string | null;
  ai_suggested_eenheid: string | null;
  is_nieuw_ingredient: boolean | null;
  // R3.5 — verpakking → basiseenheid
  verpakking_hoeveelheid: number | null;
  verpakking_eenheid: string | null;
  prijs_per_basiseenheid: number | null;
  ai_raw_verpakking_tekst: string | null;
  // Sprint Factuur Enterprise Pass — per-regel validator-output
  validation_error: boolean;
  validation_error_reden: string | null;
  created_at: string;
  ingredient_naam?: string | null;
}

export interface FuzzyKandidaat {
  id: string;
  naam: string;
  similarity: number;
}

export interface FactuurDetail {
  id: string;
  location_id: string;
  bestandsnaam: string;
  bestand_url: string;
  bron: string;
  status: string;
  leverancier_id: string | null;
  leverancier_naam_herkend: string | null;
  factuurnummer: string | null;
  factuurdatum: string | null;
  totaalbedrag: number | null;
  goedgekeurd_door: string | null;
  goedgekeurd_op: string | null;
  created_at: string;
  ai_parsing_status: string | null;
  ai_parsed_at: string | null;
  ai_confidence_overall: number | null;
  ai_raw_response: any;
  fuzzy_kandidaten: FuzzyKandidaat[];
  // Sprint Factuur Enterprise Pass — BTW + block velden
  subtotaal_excl_btw: number | null;
  btw_bedrag: number | null;
  btw_percentage: number | null;
  totaal_incl_btw: number | null;
  validation_retries: number;
  validation_blocked_reason: string | null;
  leverancier_naam?: string;
  regels: FactuurRegel[];
}

export function useFactuurDetail(id: string | null) {
  return useQuery({
    queryKey: ["factuur-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factuur_uploads")
        .select("*, leveranciers(naam), factuur_regels(*, ingredienten(naam))")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const regels = ((data as any).factuur_regels ?? []).map((r: any) => ({
        ...r,
        validation_error: r.validation_error === true,
        validation_error_reden: r.validation_error_reden ?? null,
        ingredient_naam: r.ingredienten?.naam ?? null,
      }));

      return {
        ...data,
        leverancier_naam: (data as any).leveranciers?.naam ?? "Onbekend",
        fuzzy_kandidaten:
          ((data as any).fuzzy_kandidaten ?? []) as FuzzyKandidaat[],
        // Sprint Enterprise Pass — defaults voor null-safety in UI
        subtotaal_excl_btw: (data as any).subtotaal_excl_btw ?? null,
        btw_bedrag: (data as any).btw_bedrag ?? null,
        btw_percentage: (data as any).btw_percentage ?? null,
        totaal_incl_btw: (data as any).totaal_incl_btw ?? null,
        validation_retries: (data as any).validation_retries ?? 0,
        validation_blocked_reason:
          (data as any).validation_blocked_reason ?? null,
        regels,
      } as FactuurDetail;
    },
    enabled: !!id,
  });
}
