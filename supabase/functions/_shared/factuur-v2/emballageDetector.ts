// supabase/functions/_shared/factuur-v2/emballageDetector.ts
// Sprint Multi-BTW + Emballage — DEEL 1.
//
// Triple-check emballage-detectie op regel-niveau.
// Liever te ruim dan te strak: false positive = kostprijs niet updaten = veilig;
// false negative = kostprijs corrupted door emballage-prijs.
//
// Detectie via 3 onafhankelijke signalen:
//   A) AI-extractie: regel.is_emballage === true
//   B) Keyword-match: product_naam matcht een EMBALLAGE_KEYWORDS regex
//   C) BTW=0% + statiegeld-pattern: prijs per stuk binnen statiegeld-range (0,05–2,00 €)
//
// Returns:
//   { isEmballage, confidence, detectedBy }
//   - confidence='hoog'  bij ≥2 signalen óf 0 signalen (zekerheid: geen emballage)
//   - confidence='medium' bij exact 1 signaal
//
// Géén afhankelijkheden buiten ./types.

import type { FactuurV2Regel } from "./types.ts";

/**
 * Regex-array voor emballage-keywords in productnamen.
 * \b zorgt voor word-boundary zodat "rolcontainer" wel matcht maar
 * "controle" of "fustleverancier" niet onbedoeld triggeren.
 */
export const EMBALLAGE_KEYWORDS: RegExp[] = [
  /\bfust\b/i,
  /\bkeg\b/i,
  /\bvat\b/i,
  /\brolcontainer\b/i,
  /\bpallet\b/i,
  /\btussenlegger\b/i,
  /\bstatiegeld\b/i,
  /\bemballage\b/i,
  /\bretour[\s-]?vergoeding\b/i,
  /\bdop\b/i,
  /\bsluiting\b/i,
  /\btray\b/i,
];

export type EmballageConfidence = "hoog" | "medium";

export interface EmballageDetectResult {
  isEmballage: boolean;
  confidence: EmballageConfidence;
  /**
   * Welke signalen positief waren. Lege array = geen detectie.
   * Mogelijke waarden: 'ai_extractie', 'keyword_match', 'btw0_statiegeld_pattern'
   */
  detectedBy: string[];
}

/**
 * Bepaal of een factuurregel emballage is.
 *
 * @param regel  De gevalideerde FactuurV2Regel (na AI-extractie, vóór DB-insert).
 * @returns      Detectie-resultaat met confidence en welke signalen sloegen.
 */
export function isEmballageRegel(
  regel: FactuurV2Regel,
): EmballageDetectResult {
  const detectedBy: string[] = [];

  // Check A: AI-extractie heeft is_emballage al gemarkeerd.
  if (regel.is_emballage === true) {
    detectedBy.push("ai_extractie");
  }

  // Check B: keyword-match in productnaam.
  const productNaam = regel.product_naam ?? "";
  for (const pattern of EMBALLAGE_KEYWORDS) {
    if (pattern.test(productNaam)) {
      detectedBy.push("keyword_match");
      break;
    }
  }

  // Check C: BTW 0% + statiegeld-pattern (kleine prijs per stuk, typisch 0,05–2,00 €).
  // Alleen meetellen als zowel btw_percentage=0 als prijs_per_besteld_item bekend zijn.
  if (regel.btw_percentage === 0 && regel.prijs_totaal != null) {
    const prijsPerEenheid = regel.prijs_per_besteld_item;
    if (
      prijsPerEenheid != null &&
      prijsPerEenheid >= 0.05 &&
      prijsPerEenheid <= 2.00
    ) {
      detectedBy.push("btw0_statiegeld_pattern");
    }
  }

  if (detectedBy.length === 0) {
    return { isEmballage: false, confidence: "hoog", detectedBy: [] };
  }

  if (detectedBy.length >= 2) {
    return { isEmballage: true, confidence: "hoog", detectedBy };
  }

  // Exact 1 signaal → wel emballage, maar medium confidence.
  return { isEmballage: true, confidence: "medium", detectedBy };
}
