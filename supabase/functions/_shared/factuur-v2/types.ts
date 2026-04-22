// supabase/functions/_shared/factuur-v2/types.ts
// TypeScript-mirror van FACTUUR_V2_SCHEMA.

export type ExtractieStatus = "success" | "partial" | "failed";
export type Confidence = "hoog" | "medium" | "laag";
export type Verpakkingseenheid = "L" | "kg" | "stuk";
export type BtwTarief = 0 | 9 | 21;

export interface FactuurV2BtwRegel {
  percentage: BtwTarief;
  basis_bedrag: number;
  btw_bedrag: number;
}

export interface FactuurV2Regel {
  artikelnummer?: string | null;
  product_naam: string;
  product_omschrijving_kort?: string | null;
  hoeveelheid_besteld?: number | null;
  verpakking_hoeveelheid?: number | null;
  verpakking_eenheid: Verpakkingseenheid;
  prijs_per_besteld_item?: number | null;
  prijs_per_basiseenheid?: number | null;
  prijs_totaal?: number | null;
  btw_percentage?: BtwTarief | null;
  is_emballage?: boolean;
  is_credit?: boolean;
  confidence?: Confidence;
}

export interface FactuurV2Output {
  extractie_status: ExtractieStatus;
  leverancier_naam: string;
  leverancier_btw_nummer?: string | null;
  leverancier_kvk?: string | null;
  factuur_nummer?: string | null;
  factuur_datum?: string | null;
  subtotaal_excl_btw?: number | null;
  btw_regels?: FactuurV2BtwRegel[];
  totaal_incl_btw: number;
  regels: FactuurV2Regel[];
  extractie_waarschuwingen?: string[];
}
