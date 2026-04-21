// Sprint: Slimme factuur-AI Stap 1 — gemeenschappelijke types

export interface ParsedRegel {
  artikelnummer: string | null;
  product_naam: string;
  hoeveelheid: number | null;
  eenheid: string | null;
  prijs_per_eenheid: number | null;
  totaal: number | null;
  /**
   * Order-nummer per leverregel (Kooyman: 6 cijfers na qty+eenheid;
   * Bidfood: Ordnr.BFD:NNNNNN sectiekop). Optioneel — generic vult dit niet.
   * Gebruikt voor dedup-key (artnr|ordernr|totaal) zodat zelfde product
   * in verschillende leveringen behouden blijft, maar PDF-extract dubbels
   * binnen 1 order weggefilterd worden.
   */
  ordernr?: string | null;
}

export interface ParserResult {
  leverancier_naam_raw: string | null;
  factuurnummer: string | null;
  factuurdatum: string | null; // YYYY-MM-DD
  totaalbedrag: number | null;
  regels: ParsedRegel[];
  /**
   * Confidence-score 0..1
   * Berekend als: regels_met_artnr_en_bedrag / total_candidate_rows
   * (per parser implementatie kan dit licht varieren).
   */
  confidence: number;
  /**
   * Aantal kandidaat-regels (regels die op een product-regel lijken)
   * per pagina. Diagnostiek voor SQL-debug.
   */
  candidate_rows_per_page: number[];
}

export type LeverancierSlug = "kooyman" | "bidfood" | "generic";
