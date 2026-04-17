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
  created_at: string;
  ingredient_naam?: string | null;
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
        ingredient_naam: r.ingredienten?.naam ?? null,
      }));

      return {
        ...data,
        leverancier_naam: (data as any).leveranciers?.naam ?? "Onbekend",
        regels,
      } as FactuurDetail;
    },
    enabled: !!id,
  });
}
