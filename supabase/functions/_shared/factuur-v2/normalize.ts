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
