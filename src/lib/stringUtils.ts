/**
 * String utilities — D.6b R4b-1
 */

/**
 * Normaliseert een ingrediëntnaam.
 * - Als 100% ALL CAPS met minstens 1 run van 3+ hoofdletters: → Title Case
 * - Anders: trimmed, ongewijzigd
 *
 * Voorbeelden:
 *   "DEKSEL BEKER KRAFT" → "Deksel Beker Kraft"
 *   "Kipfilet"           → "Kipfilet"
 *   "BBQ saus"           → "BBQ saus" (niet 100% caps)
 *   "AB"                 → "AB" (geen 3+ run)
 */
export function normalizeIngredientNaam(naam: string): string {
  const trimmed = naam.trim();
  if (!trimmed) return trimmed;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed)) {
    return trimmed.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return trimmed;
}
