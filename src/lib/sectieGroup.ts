import type { ChecklistItem } from "@/hooks/useChecklistTemplates";

export const DEFAULT_SECTIE = "Algemeen";

export interface SectieGroep {
  naam: string;
  items: ChecklistItem[];
}

/**
 * Groepeert items per sectie. Items zonder `sectie` vallen onder DEFAULT_SECTIE.
 * Sectie-volgorde = volgorde van eerste verschijning op basis van `volgorde`.
 * Items binnen een sectie blijven gesorteerd op `volgorde`.
 */
export function groupItemsBySectie(items: ChecklistItem[]): SectieGroep[] {
  const order: string[] = [];
  const map = new Map<string, ChecklistItem[]>();
  for (const it of [...items].sort((a, b) => a.volgorde - b.volgorde)) {
    const naam = it.sectie?.trim() || DEFAULT_SECTIE;
    if (!map.has(naam)) {
      map.set(naam, []);
      order.push(naam);
    }
    map.get(naam)!.push(it);
  }
  return order.map((naam) => ({ naam, items: map.get(naam)! }));
}

/**
 * Bepaalt of twee sectienamen als gelijk worden beschouwd voor conflictdetectie
 * (case-insensitive, trimmed).
 */
export function sectieNamenGelijk(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}
