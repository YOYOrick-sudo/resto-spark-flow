export type MappableField =
  | "artikel_naam"
  | "artikel_nummer"
  | "verpakking_hoeveelheid"
  | "verpakking_eenheid"
  | "prijs_per_verpakking"
  | "categorie"
  | "ean_code"
  | "overslaan";

const FIELD_PATTERNS: Record<Exclude<MappableField, "overslaan">, RegExp> = {
  artikel_naam: /naam|omschrijving|artikel|product|description/i,
  artikel_nummer: /^(art\.?|artikel)\s*(nr|nummer|code)|^nr\.?$|^code$/i,
  prijs_per_verpakking: /prijs|price|bedrag|amount|tarief/i,
  verpakking_eenheid: /eenh|unit|eenheid/i,
  verpakking_hoeveelheid: /inh|inhoud|hoeveelheid|qty|quantity|verpakking/i,
  ean_code: /ean|barcode|gtin/i,
  categorie: /categorie|category|groep|group/i,
};

export function detectColumnMapping(headers: string[]): Record<number, MappableField> {
  const mapping: Record<number, MappableField> = {};
  const usedFields = new Set<MappableField>();

  headers.forEach((header, index) => {
    const trimmed = header.trim();
    if (!trimmed) {
      mapping[index] = "overslaan";
      return;
    }

    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (pattern.test(trimmed) && !usedFields.has(field as MappableField)) {
        mapping[index] = field as MappableField;
        usedFields.add(field as MappableField);
        return;
      }
    }

    mapping[index] = "overslaan";
  });

  return mapping;
}

export function detectDelimiter(sample: string): string {
  const candidates = [";", ",", "\t"];
  const firstLine = sample.split("\n")[0] ?? "";
  let best = ",";
  let bestCount = 0;

  for (const d of candidates) {
    const count = (firstLine.match(new RegExp(d === "\t" ? "\\t" : "\\" + d, "g")) ?? []).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }

  return best;
}

export function parsePrice(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const s = String(value).replace(/[€$\s]/g, "").trim();
  if (!s) return null;
  const normalized = s.includes(",") && !s.includes(".")
    ? s.replace(",", ".")
    : s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

export const FIELD_LABELS: Record<MappableField, string> = {
  artikel_naam: "Artikelnaam",
  artikel_nummer: "Artikelnummer",
  verpakking_hoeveelheid: "Verpakking hoeveelheid",
  verpakking_eenheid: "Verpakking eenheid",
  prijs_per_verpakking: "Prijs per verpakking",
  categorie: "Categorie",
  ean_code: "EAN code",
  overslaan: "Overslaan",
};

export const SKIP_PATTERNS = /bezorgkosten|emballage|retour|statiegeld|toeslag|korting|btw|transport|afval/i;
