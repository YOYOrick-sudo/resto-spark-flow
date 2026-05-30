// supabase/functions/_shared/nonFoodDetector.ts
// Sprint Non-food filter — generieke detectie voor pakbon-instroom.
//
// Twee-signaal helper: AI-flag (is_non_food) OF keyword-match in productnaam.
// OR-logica: één signaal is genoeg om de regel uit de ingrediëntenlijst te
// houden (laag risico — regel blijft zichtbaar onder "niet meegerekend").
//
// Generiek, geen leveranciersnamen. Word-boundary regexes (\b) zodat
// food-substrings nooit per ongeluk matchen (geen "olijfolie" via "olie",
// geen "bordeaux" via "bord").
//
// Hard goods (bord/bestek/glas) zijn BEWUST weggelaten in v1 — geven nul
// winst op de huidige groente-pakbonnen (Boer & Chef) maar het hoogste
// false-positive-risico. Worden later toegevoegd wanneer een echte
// Hanos/Bidfood-pakbon ze nodig blijkt te maken (V_LATER), dan op echte
// data getest.

export const NON_FOOD_KEYWORDS: RegExp[] = [
  // Emballage / verpakking-retour
  /\bemballage\b/i,
  /\bfust\b/i,
  /\bkeg\b/i,
  /\brolcontainer\b/i,
  /\bpallet\b/i,
  /\btussenlegger\b/i,
  /\bstatiegeld\b/i,
  // Wegwerp / consumables
  /\bdeksel\w*\b/i,
  /\bbeker\w*\b/i,
  /\blunchbox\w*\b/i,
  /\bbakje\w*\b/i,
  /\bvacuum[\s-]?zak\w*\b/i,
  /\bservet\w*\b/i,
  /\bfolie\b/i,
  /\brietje\w*\b/i,
  /\bparasol\w*\b/i,
  /\btray\b/i,
  // Schoonmaak / non-food chemie
  /\bschoonmaak\w*\b/i,
  /\ballesreiniger\b/i,
  /\bafwasmiddel\b/i,
];

export interface NonFoodDetectResult {
  isNonFood: boolean;
  /** 'ai_extractie' en/of 'keyword_match'. Lege array = geen detectie. */
  detectedBy: string[];
}

export function isNonFoodLine(
  productNaam: string | null | undefined,
  aiIsNonFood?: boolean | null,
): NonFoodDetectResult {
  const detectedBy: string[] = [];
  if (aiIsNonFood === true) detectedBy.push("ai_extractie");
  const naam = productNaam ?? "";
  if (naam && NON_FOOD_KEYWORDS.some((re) => re.test(naam))) {
    detectedBy.push("keyword_match");
  }
  return { isNonFood: detectedBy.length > 0, detectedBy };
}
