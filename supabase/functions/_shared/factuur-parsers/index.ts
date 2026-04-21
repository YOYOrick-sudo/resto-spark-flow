// Sprint: Slimme factuur-AI Stap 1
// Dispatcher: detecteer leverancier op page-1 text + dispatch naar juiste parser.

import type { LeverancierSlug, ParserResult } from "./types.ts";
import { parseKooyman } from "./kooyman.ts";
import { parseBidfood } from "./bidfood.ts";
import { parseGeneric } from "./generic.ts";

/**
 * Detecteer leverancier-slug op basis van eerste pagina.
 * Conservatief: alleen specifieke parsers gebruiken bij sterke match.
 */
export function detectLeverancier(page1Text: string): LeverancierSlug {
  if (!page1Text) return "generic";
  const lower = page1Text.toLowerCase();

  if (/\bkooyman\b/i.test(lower)) return "kooyman";
  if (/\bbidfood\b/i.test(lower)) return "bidfood";

  return "generic";
}

/**
 * Confidence-threshold per parser.
 * Toevoeging A uit sprint: generic conservatiever om vervuilde matches te voorkomen.
 */
export function thresholdForSlug(slug: LeverancierSlug): number {
  if (slug === "generic") return 0.9;
  return 0.8;
}

export function parseFactuur(
  pages: string[],
  slug: LeverancierSlug
): ParserResult {
  switch (slug) {
    case "kooyman":
      return parseKooyman(pages);
    case "bidfood":
      return parseBidfood(pages);
    case "generic":
    default:
      return parseGeneric(pages);
  }
}

export type { ParserResult, ParsedRegel, LeverancierSlug } from "./types.ts";
