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
  // VOLGORDE IS BELANGRIJK — meest specifieke eerst, generiekste laatst.
  // Eerste match wint en stopt verdere passes.

  // 1. CONSERVATIEF: "bos|bundel" + cijfer + eenheid. MOET vóór de generieke
  //    "cijfer + eenheid"-pattern, anders strip die alleen het cijferdeel
  //    en blijft "Asperges bos" over. Beschermt tegelijk standalone "bos"
  //    (bv. "Koriander bos") want zonder cijfer geen match.
  /\s+(?:bos|bundel)\s+\d[\d.,]*\s*(?:kg|g|gr|gram|st|stuks?)?\b.*$/i,

  // 2. Verpakkingswoord + cijfer + eenheid: "ds 5 kg", "kist 1,5 kg",
  //    "pak 500 gr", "zak 450 gr", "doos 14 stuks", "kist 6 stuks".
  /\s+(?:ds|doos|kist|pak|zak|tray|krat|fles|pot|blik|colli|bak)\s+\d[\d.,]*\s*(?:kg|g|gr|gram|l|lt|ml|st|stuks?|cl)?\b.*$/i,

  // 3. "per stuk" suffix: "Paksoi per stuk", "Kool chinese per stuk".
  /\s+per\s+stuk[s]?$/i,

  // 4. Pure cijfer + eenheid suffix: "Aubergine 5 kg", "Spinazie 450 gr".
  /\s+\d[\d.,]*\s*(?:kg|g|gr|gram|l|lt|ml|st|stuks?|cl)\b.*$/i,

  // 5. Verpakkingswoord ZONDER getal als laatste woord: "Komkommer ds",
  //    "Bosuien doos". CONSERVATIEF: 'tray' / 'krat' weglaten — die zijn
  //    soms onderdeel van naam ("Emballage paddestoelen tray"). Idem
  //    'pot/blik/fles' want dat zijn vaak inhoud-aanduidingen ("Tomaat pot").
  /\s+(?:ds|doos|kist|pak|zak|colli|bak)$/i,
];

// ---------------------------------------------------------------------------
// Sprint Pakbon Etappe 3 — Herkomst- en kwaliteit-tokens strippen.
//
// Varianten als "Aubergine Holland klasse 1" of "Paprika rood Spanje" moeten
// matchen met de basis-ingrediënt ("Aubergine", "Paprika rood"). Herkomst
// (land) en kwaliteitsklasse veranderen het product zelf niet.
//
// KRITIEK — kleur NIET in deze whitelist: "Paprika rood" ≠ "Paprika groen",
// "Ui geel" ≠ "Ui rood". Strippen van kleur zou valse cross-matches geven.
//
// Tokens worden overal in de naam verwijderd (niet alleen suffix), met
// strikte word-boundaries om sub-string-hits te voorkomen.
// ---------------------------------------------------------------------------
const ORIGIN_QUALITY_PATTERNS: RegExp[] = [
  // Kwaliteit-frases (multi-token): "klasse 1", "klasse II", "klasse AA",
  // "kl 1", "kl. II".
  /\bklasse\s+(?:i{1,2}|1|2|a{1,2})\b/gi,
  /\bkl\.?\s*(?:1|2|i{1,2})\b/gi,

  // Herkomst — landen + bijvoeglijke vormen.
  /\b(?:holland|hollands|hollandse|nederland|nederlandse)\b/gi,
  /\b(?:spanje|spaans|spaanse)\b/gi,
  /\b(?:itali[eë]|italiaans|italiaanse)\b/gi,
  /\b(?:frankrijk|frans|franse)\b/gi,
  /\b(?:belgi[eë]|belgisch|belgische)\b/gi,
  /\b(?:duitsland|duits|duitse)\b/gi,
  /\b(?:marokko|marokkaans|marokkaanse)\b/gi,
  /\b(?:turkije|turks|turkse)\b/gi,
  /\b(?:isra[eë]l|isra[eë]lisch|isra[eë]lische)\b/gi,
  /\b(?:portugal|portugees|portugese)\b/gi,
  /\b(?:griekenland|grieks|griekse)\b/gi,

  // Kwaliteit — losse tokens (bio/biologisch/eko + AA-grade).
  /\b(?:bio|biologisch|biologische|eko|ekologisch)\b/gi,
  /\b(?:aa|extra)\b/gi,
];

export function stripPackagingSuffix(name: string | null | undefined): string {
  if (!name) return "";
  let s = name.trim();

  // STAP 1 — herkomst/kwaliteit tokens verwijderen (overal in de naam).
  // Doen vóór de suffix-pass: "Aubergine Holland klasse 1" → "Aubergine".
  for (const re of ORIGIN_QUALITY_PATTERNS) {
    s = s.replace(re, " ");
  }
  s = s.replace(/\s+/g, " ").trim();

  // STAP 2 — verpakkings-suffix (zoals voorheen).
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
