// ============================================================
// Sprint A3 — Centrale helpers voor factuur-regel categorisering
// ============================================================
// Verpakking & toeslagen worden chef-vriendelijk apart afgehandeld:
// ze tellen mee in het factuur-totaal maar vragen geen ingrediënt-keuze.
//
// Bron-truth-volgorde:
//   1. is_emballage === true (door AI-parser gezet, betrouwbaarste signaal)
//   2. OVERIG_REGEX-match op product_naam_herkend (fallback voor legacy/missende AI-flag)
// ============================================================

import type { FactuurRegel } from "@/hooks/useFactuurDetail";

export const OVERIG_REGEX =
  /bezorg|emballage|retour|statiegeld|toeslag|brandstof|milieu|pallet|deksel|beker|bestek|servet|rietje|draagtas|wegwerp|afhaal.*doos|kartonnen.{0,5}bak|vacuum.{0,5}zak|\bzak\b|\bzakken\b|\bbakje\b|\bbakjes\b|folie|disposable/i;

/**
 * True wanneer de regel verpakking, statiegeld, bezorging, toeslag of een
 * andere niet-ingrediënt regel is die geen koppeling vereist.
 */
export function isVerpakkingRegel(r: FactuurRegel): boolean {
  if ((r as any).is_emballage === true) return true;
  if (OVERIG_REGEX.test(r.product_naam_herkend ?? "")) return true;
  return false;
}

/**
 * Som van bedragen voor een set regels (negeert null/credit-correctie via signed totaal).
 */
export function sumRegelTotaal(regels: FactuurRegel[]): number {
  return regels.reduce((s, r) => s + (r.totaal ?? 0), 0);
}
