// supabase/functions/_shared/factuur-v2/normalize.ts
// Sprint Factuur-AI V2 — Eén bron van waarheid voor naam-normalisatie
// in match-cascade (Tier-2/3/4) én duplicate-checks.
//
// CRITICAL: GEEN destructieve strip van haakjes of leestekens.
// Eerdere `escapeIlike()` deed dat wel, waardoor "Sla rood (radicchio)"
// niet matchte met DB-naam die identiek is. Hier alleen:
//   - trim
//   - lowercase
//   - whitespace collapsen (\s+ → " ")

export function normalizeMatchKey(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Sprint Pakbon V1 — Stripped-match fallback (Spoor A).
//
// Probleem: AI-extractie laat verpakkingssuffix in product_naam staan
// ("Aubergine ds 5 kg") terwijl DB-naam schoon is ("Aubergine").
// Tier-2/3/4 mist dan op exact-equal.
//
// stripPackagingSuffix verwijdert CONSERVATIEF de verpakkingssuffix aan het
// EINDE van de naam. Als er niets te strippen is → string keert ongewijzigd
// terug. De caller (matcher) doet eerst een normale match en alleen bij MISS
// een tweede match-pass met de gestripte naam.
//
// VEILIGHEID — woorden zoals "bos" / "bundel" zijn vaak deel van de
// ingredient-naam zelf ("Koriander bos", "Peterselie krul bos"). Daarom
// strippen we die ALLEEN als gevolgd door een cijfer (verpakkings-getal),
// nooit als laatste woord.
// ---------------------------------------------------------------------------

// Volgorde matters: meest specifieke patterns eerst, generiekste laatst.
const PACKAGING_SUFFIX_PATTERNS: RegExp[] = [
  // Cijfer + eenheid aan het einde, eventueel voorafgegaan door
  // verpakkingswoord. Vangt: "ds 5 kg", "kist 1,5 kg", "pak 500 gr",
  // "zak 450 gr", "doos 14 stuks", "kist 6 stuks", "ds 4,5 kg".
  /\s+(?:ds|doos|kist|pak|zak|tray|krat|fles|pot|blik|colli|bak)\s+\d[\d.,]*\s*(?:kg|g|gr|gram|l|lt|ml|st|stuks?|cl)?\b.*$/i,

  // Verpakkingswoord zonder getal aan einde: "Bosuien doos", "Komkommer ds".
  // Alleen als het echt het laatste deel is.
  /\s+(?:ds|doos|kist|pak|zak|tray|krat|colli|bak)$/i,

  // "per stuk" suffix: "Paksoi per stuk", "Kool chinese per stuk".
  /\s+per\s+stuk[s]?$/i,

  // Pure cijfer + eenheid suffix zonder verpakkingswoord: "Aubergine 5 kg",
  // "Spinazie 450 gr", "Limoen 4,5 kg".
  /\s+\d[\d.,]*\s*(?:kg|g|gr|gram|l|lt|ml|st|stuks?|cl)\b.*$/i,

  // CONSERVATIEF: "bos|bundel" alleen als gevolgd door cijfer (verpakking),
  // nooit standalone — anders breekt "Koriander bos", "Peterselie krul bos".
  /\s+(?:bos|bundel)\s+\d[\d.,]*\s*(?:kg|g|gr|gram|st|stuks?)?\b.*$/i,
];

export function stripPackagingSuffix(name: string | null | undefined): string {
  if (!name) return "";
  let s = name.trim();
  // Pas één keer per pattern toe in volgorde; stop zodra eentje matcht
  // (anders kan een tweede pattern de al-gestripte vorm verder afknabbelen
  // en valse hits geven).
  for (const re of PACKAGING_SUFFIX_PATTERNS) {
    const next = s.replace(re, "");
    if (next !== s) {
      s = next.trim();
      break;
    }
  }
  return s;
}

// Combinatie-helper: strip + normalize. Gebruikt door tweede match-pass.
export function normalizeMatchKeyStripped(
  s: string | null | undefined,
): string {
  return normalizeMatchKey(stripPackagingSuffix(s ?? ""));
}

// Voor gebruik binnen Supabase .or() ilike-filters.
// We willen GEEN haakjes strippen (die hebben we juist nodig voor exact-match),
// maar wél tekens die de PostgREST `or`-grammar breken: komma's en
// dubbele/enkele quotes. Haakjes laten we staan; PostgREST ondersteunt
// die binnen een ilike-pattern omdat het pattern als string-literal wordt
// behandeld zodra de ilike-operator herkend is.
//
// Daarnaast: backslashes en procent-tekens escapen we niet — we doen
// exact-match (geen wildcards), dus een letterlijk `%` in een productnaam
// (zeldzaam) zou hooguit te breed matchen. Acceptabel voor Tier-2/3/4.
export function escapeForOrIlike(value: string): string {
  // Trim en collapse, maar BEHOUD haakjes en andere leestekens.
  const collapsed = value.trim().replace(/\s+/g, " ");
  // PostgREST `or=(...)` gebruikt komma als separator — strip die defensief.
  // Komma's komen zelden voor in productnamen; bij twijfel valt match terug
  // op Tier-3/4 of de chef koppelt handmatig.
  return collapsed.replace(/,/g, " ").replace(/\s+/g, " ").trim();
}
