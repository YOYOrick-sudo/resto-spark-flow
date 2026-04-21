// Shared helpers voor factuur-parsing — Sprint output-quality (FIX 1 + FIX 2).
//
// FIX 1: extractVerpakking() detecteert verpakking-notatie uit een ruwe productnaam
//        (bv. "Lampolie 6×1ltr" → 6 L) en levert kandidaat hoeveelheid+eenheid.
//        chooseVerpakking() past de hiërarchie toe: cache > AI-hint > regex > null.
//
// FIX 2: cleanIngredientNaam() strip verpakking-notaties + BTW-groep suffixen
//        zodat Tier-1 hits (zonder Ronde 2 clean_naam) ook een nette weergave-naam
//        krijgen voor preview en BulkCreate.

export type Basiseenheid = "L" | "kg" | "stuk";

export interface VerpakkingExtract {
  hoeveelheid: number | null;
  eenheid: Basiseenheid | null;
  /** Voor logging: ruwe eenheid-token uit regex (bv. "cl", "gr") */
  bron_eenheid: string | null;
}

const MULTIPACK_RE =
  /(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(ltr|lt|l|cl|ml|kg|gr|g|st|stuks)\b/i;
const SINGLE_RE =
  /(\d+(?:[,.]\d+)?)\s*(ltr|lt|l|cl|ml|kg|gr|g|st|stuks)\b/i;

function toNumber(s: string): number {
  return parseFloat(s.replace(",", "."));
}

/**
 * Converteer (waarde, ruwe-eenheid) naar basiseenheid.
 * Volume → L, gewicht → kg, telbaar → stuk.
 */
function toBase(waarde: number, eenheid: string): {
  hoeveelheid: number;
  eenheid: Basiseenheid;
} {
  const u = eenheid.toLowerCase();
  if (u === "l" || u === "ltr" || u === "lt") return { hoeveelheid: waarde, eenheid: "L" };
  if (u === "cl") return { hoeveelheid: waarde / 100, eenheid: "L" };
  if (u === "ml") return { hoeveelheid: waarde / 1000, eenheid: "L" };
  if (u === "kg") return { hoeveelheid: waarde, eenheid: "kg" };
  if (u === "g" || u === "gr") return { hoeveelheid: waarde / 1000, eenheid: "kg" };
  // st / stuks
  return { hoeveelheid: waarde, eenheid: "stuk" };
}

/**
 * Probeer verpakking te extraheren uit ruwe productnaam.
 *
 * Heuristiek voor multipack met cl/ml (fles/blikje-context):
 *   - Totaal-volume ≥ 2 L → basiseenheid = L (meet-product, bv. olie 6×1ltr)
 *   - Totaal-volume < 2 L → basiseenheid = "stuk" (telbaar, bv. bier 24×33cl)
 *
 * Bij multipack met kg/g → altijd kg.
 * Bij multipack met ltr/lt/l → altijd L.
 * Bij multipack met st/stuks → stuk.
 *
 * Returnt { null, null } bij geen match.
 */
export function extractVerpakking(naam: string): VerpakkingExtract {
  if (!naam) return { hoeveelheid: null, eenheid: null, bron_eenheid: null };

  const mp = naam.match(MULTIPACK_RE);
  if (mp) {
    const aantal = parseInt(mp[1], 10);
    const perStuk = toNumber(mp[2]);
    const ruweEenheid = mp[3].toLowerCase();
    const base = toBase(aantal * perStuk, ruweEenheid);

    // Heuristiek: kleine flesjes (cl/ml en totaal < 2L) → stuks ipv L
    if ((ruweEenheid === "cl" || ruweEenheid === "ml") && base.hoeveelheid < 2) {
      return { hoeveelheid: aantal, eenheid: "stuk", bron_eenheid: ruweEenheid };
    }
    return { hoeveelheid: base.hoeveelheid, eenheid: base.eenheid, bron_eenheid: ruweEenheid };
  }

  const sg = naam.match(SINGLE_RE);
  if (sg) {
    const waarde = toNumber(sg[1]);
    const ruweEenheid = sg[2].toLowerCase();
    const base = toBase(waarde, ruweEenheid);
    return { hoeveelheid: base.hoeveelheid, eenheid: base.eenheid, bron_eenheid: ruweEenheid };
  }

  return { hoeveelheid: null, eenheid: null, bron_eenheid: null };
}

/**
 * Hiërarchie voor definitieve verpakking_hoeveelheid + verpakking_eenheid.
 * Returnt eerste niet-lege bron, of {null, null} als alles leeg.
 */
export function chooseVerpakking(opts: {
  cacheHvh: number | null | undefined;
  cacheEenheid: string | null | undefined;
  aiHvh: number | null | undefined;
  aiEenheid: string | null | undefined;
  ruweNaam: string | null | undefined;
}): {
  hoeveelheid: number | null;
  eenheid: string | null;
  bron: "cache" | "ai" | "regex" | "none";
} {
  if (opts.cacheHvh != null && opts.cacheEenheid) {
    return { hoeveelheid: Number(opts.cacheHvh), eenheid: opts.cacheEenheid, bron: "cache" };
  }
  if (opts.aiHvh != null && opts.aiEenheid) {
    return { hoeveelheid: Number(opts.aiHvh), eenheid: opts.aiEenheid, bron: "ai" };
  }
  if (opts.ruweNaam) {
    const extract = extractVerpakking(opts.ruweNaam);
    if (extract.hoeveelheid != null && extract.eenheid != null) {
      return { hoeveelheid: extract.hoeveelheid, eenheid: extract.eenheid, bron: "regex" };
    }
  }
  return { hoeveelheid: null, eenheid: null, bron: "none" };
}

/**
 * FIX 2 — Strip verpakking + BTW-groep + ruis uit ruwe productnaam.
 * Behoudt merknaam en producttype. Bedoeld voor Tier-1 hits zonder Ronde-2 clean_naam.
 */
export function cleanIngredientNaam(ruw: string): string {
  if (!ruw) return ruw;
  let s = ruw;

  // Multipack-notatie: "12×33cl", "6x1ltr", "4×150st"
  s = s.replace(
    /\b\d+\s*[x×]\s*\d+(?:[,.]\d+)?\s*(ltr|lt|l|cl|ml|kg|gr|g|st|stuks)\b/gi,
    " "
  );
  // Single-unit: "5ltr", "2,5kg", "500gr", "30st"
  s = s.replace(
    /\b\d+(?:[,.]\d+)?\s*(ltr|lt|l|cl|ml|kg|gr|g|st|stuks)\b/gi,
    " "
  );
  // BTW-groep suffix: "(H) Bier", "(L) Keuken", "(H) Onkosten"
  s = s.replace(/\(\s*[HL]\s*\)\s*\w+\s*$/gi, " ");
  // Trailing dashes/bullets/punten
  s = s.replace(/[-•·]+\s*$/g, " ");
  // Multi-spaces collapse
  s = s.replace(/\s+/g, " ").trim();
  // Trailing dash na collapse (bv. "Brouwerij 't IJ - Free IPA blik" → "Brouwerij 't IJ - Free IPA blik")
  s = s.replace(/\s+-\s*$/g, "").trim();

  return s;
}
