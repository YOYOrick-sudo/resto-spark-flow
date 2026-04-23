/**
 * usePreviewGoedkeuring — D.6b R4b-2 / R4b-3
 *
 * Pure simulatie van wat de `goedkeuren` mutation zou doen, zonder DB-writes.
 * Returnt PreviewData voor de GoedkeurenPreviewModal.
 *
 * R4b-3: kostprijs-wijzigingen worden GEGROEPEERD per ingredient_id en
 * berekend als gewogen gemiddelde op basis van regel.hoeveelheid.
 * Voorkomt dat eenzelfde ingrediënt in meerdere verpakkingen meerdere
 * (tegenstrijdige) prijsdelta-entries oplevert.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";
import { normalizeIngredientNaam } from "@/lib/stringUtils";
import { isVerpakkingRegel } from "@/lib/factuur-categories";

export type PrijsSeverity = "groot" | "middel" | "klein";

export interface PrijsWijziging {
  ingredientId: string;
  ingredientNaam: string;
  oudePrijs: number | null;
  nieuwePrijs: number;
  deltaPct: number; // bv. 73.4 = +73.4%
  severity: PrijsSeverity;
}

export interface NieuwIngredientPreview {
  regelId: string;
  naam: string;
  eenheid: string | null;
  verpakkingLabel: string | null;
  prijs: number | null;
  /** Aantal regels in deze groep (FIX 4 dedup). 1 = niet gegroepeerd. */
  count: number;
}

export interface SkippedRegelPreview {
  regelId: string;
  naam: string;
}

export interface VerpakkingRegelPreview {
  regelId: string;
  naam: string;
  bedrag: number;
}

export interface BijwerkenIngredientPreview {
  ingredientId: string;
  ingredientNaam: string;
}

export interface PreviewData {
  factuur: {
    leverancierNaam: string | null;
    factuurnummer: string | null;
    totaal: number;
  };
  nieuweIngredienten: NieuwIngredientPreview[];
  /** R4-A3-fix: ingrediënten waarvan kostprijs/koppeling wordt bijgewerkt
   * (matched/manual, niet nieuw, niet verpakking). Inclusief regels zonder
   * prijswijziging — anders is "X bijwerken" verwarrend voor de chef. */
  bijwerkenIngredienten: BijwerkenIngredientPreview[];
  kostprijsWijzigingen: PrijsWijziging[];
  nieuweKoppelingen: number;
  skippedRegels: SkippedRegelPreview[];
  /** R4-A3-fix: verpakking & toeslagen — worden geskipt, geen ingredient-koppeling */
  verpakkingRegels: VerpakkingRegelPreview[];
  verpakkingTotaal: number;
  heeftGroteWijzigingen: boolean;
}

/**
 * FIX 4 — Groepeer nieuwe-ingredient regels op clean_naam (PRIMARY) of
 * leverancier+artnr (SECONDARY). Spiegelt logica van BulkCreateIngredientsDialog.
 * Per groep wordt de "primaire" regel gekozen (laagste prijs_per_basiseenheid).
 */
export function groupNewIngredients(
  regels: FactuurRegel[]
): Array<{ primair: FactuurRegel; count: number }> {
  const groups = new Map<string, FactuurRegel[]>();
  for (const r of regels) {
    const cleanNaam = normalizeIngredientNaam(
      r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend
    );
    let key: string;
    if (cleanNaam.trim().length > 0) {
      key = `naam:${cleanNaam.toLowerCase().trim()}`;
    } else if (r.ai_raw_artikelnummer?.trim()) {
      key = `artnr:${r.ai_raw_artikelnummer.trim()}`;
    } else {
      key = `regel:${r.id}`;
    }
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const out: Array<{ primair: FactuurRegel; count: number }> = [];
  for (const [, regelsInGroep] of groups) {
    const primair =
      regelsInGroep.length === 1
        ? regelsInGroep[0]
        : regelsInGroep.reduce((best, cur) => {
            const bp = best.prijs_per_basiseenheid ?? best.prijs_per_eenheid ?? Infinity;
            const cp = cur.prijs_per_basiseenheid ?? cur.prijs_per_eenheid ?? Infinity;
            return cp < bp ? cur : best;
          });
    out.push({ primair, count: regelsInGroep.length });
  }
  return out;
}

interface FactuurForPreview {
  factuurnummer: string | null;
  leverancierNaam: string | null;
  totaal: number;
  regels: FactuurRegel[];
}

function classifySeverity(deltaPct: number): PrijsSeverity {
  const abs = Math.abs(deltaPct);
  if (abs > 25) return "groot";
  if (abs >= 5) return "middel";
  return "klein";
}

export function usePreviewGoedkeuring(
  enabled: boolean,
  factuur: FactuurForPreview | null
) {
  return useQuery({
    queryKey: [
      "preview-goedkeuring",
      factuur?.factuurnummer ?? null,
      factuur?.regels.length ?? 0,
    ],
    enabled: enabled && !!factuur,
    queryFn: async (): Promise<PreviewData> => {
      if (!factuur) throw new Error("Geen factuur");

      const regels = factuur.regels;

      // 1. Skipped regels
      const skippedRegels: SkippedRegelPreview[] = regels
        .filter((r) => r.match_status === "skipped")
        .map((r) => ({ regelId: r.id, naam: r.product_naam_herkend }));

      // 2. Nieuwe ingrediënten = regels met is_nieuw_ingredient=true
      // FIX 4 — Dedup op clean_naam zodat duplicaten als 1 rij verschijnen met count-badge.
      const nieuwRegels = regels.filter(
        (r) => r.is_nieuw_ingredient === true && r.match_status !== "skipped"
      );
      const nieuweIngredienten: NieuwIngredientPreview[] = groupNewIngredients(
        nieuwRegels
      ).map(({ primair: r, count }) => {
        const heeftBasisPrijs = r.prijs_per_basiseenheid != null;
        const basisEenheid = heeftBasisPrijs
          ? (r.ai_suggested_eenheid ?? r.eenheid ?? null)
          : (r.eenheid ?? null);
        const verpakkingLabel =
          r.verpakking_hoeveelheid && r.verpakking_eenheid && basisEenheid
            ? `${r.verpakking_hoeveelheid} ${basisEenheid} per ${r.verpakking_eenheid}`
            : null;
        const cleanedNaam = normalizeIngredientNaam(
          r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend
        );
        return {
          regelId: r.id,
          naam: cleanedNaam || r.product_naam_herkend,
          eenheid: basisEenheid,
          verpakkingLabel,
          prijs: r.prijs_per_basiseenheid ?? r.prijs_per_eenheid ?? null,
          count,
        };
      });

      // 3. Matched regels (incl. manual) → groeperen per ingredient_id
      const matchedRegels = regels.filter(
        (r) =>
          r.ingredient_id &&
          r.match_status !== "skipped" &&
          (r.match_status === "matched" || r.match_status === "manual") &&
          r.is_nieuw_ingredient !== true
      );

      const ingredientIds = Array.from(
        new Set(matchedRegels.map((r) => r.ingredient_id!).filter(Boolean))
      );

      let oudePrijzen = new Map<string, { naam: string; kostprijs: number | null }>();
      if (ingredientIds.length > 0) {
        const { data, error } = await supabase
          .from("ingredienten")
          .select("id, naam, kostprijs")
          .in("id", ingredientIds);
        if (error) throw error;
        oudePrijzen = new Map(
          (data ?? []).map((i) => [
            i.id,
            { naam: i.naam, kostprijs: i.kostprijs ?? null },
          ])
        );
      }

      // R4b-3: groepeer per ingredient_id; gewogen gemiddelde over hoeveelheid
      type Groep = {
        naam: string;
        oudePrijs: number | null;
        som_qty_x_prijs: number;
        som_qty: number;
        fallback_prijzen: number[]; // regels zonder hoeveelheid
      };
      const groepen = new Map<string, Groep>();

      for (const r of matchedRegels) {
        const nieuwePrijs = r.prijs_per_basiseenheid ?? r.prijs_per_eenheid;
        if (nieuwePrijs == null) continue;
        const meta = oudePrijzen.get(r.ingredient_id!);
        if (!meta) continue;

        const g =
          groepen.get(r.ingredient_id!) ??
          ({
            naam: meta.naam,
            oudePrijs: meta.kostprijs,
            som_qty_x_prijs: 0,
            som_qty: 0,
            fallback_prijzen: [],
          } as Groep);

        if (r.hoeveelheid && r.hoeveelheid > 0) {
          g.som_qty_x_prijs += r.hoeveelheid * nieuwePrijs;
          g.som_qty += r.hoeveelheid;
        } else {
          g.fallback_prijzen.push(nieuwePrijs);
        }
        groepen.set(r.ingredient_id!, g);
      }

      const kostprijsWijzigingen: PrijsWijziging[] = [];
      for (const [ingId, g] of groepen) {
        const avgPrice =
          g.som_qty > 0
            ? g.som_qty_x_prijs / g.som_qty
            : g.fallback_prijzen.length > 0
            ? g.fallback_prijzen.reduce((a, b) => a + b, 0) /
              g.fallback_prijzen.length
            : null;
        if (avgPrice == null) continue;

        const oudePrijs = g.oudePrijs;

        // Geen oude prijs → "eerste prijs" entry
        if (oudePrijs == null || oudePrijs === 0) {
          kostprijsWijzigingen.push({
            ingredientId: ingId,
            ingredientNaam: g.naam,
            oudePrijs: null,
            nieuwePrijs: avgPrice,
            deltaPct: 0,
            severity: "klein",
          });
          continue;
        }

        const deltaPct = ((avgPrice - oudePrijs) / oudePrijs) * 100;
        // Skip 0% (identiek)
        if (Math.abs(deltaPct) < 0.5) continue;

        kostprijsWijzigingen.push({
          ingredientId: ingId,
          ingredientNaam: g.naam,
          oudePrijs,
          nieuwePrijs: avgPrice,
          deltaPct,
          severity: classifySeverity(deltaPct),
        });
      }

      // 4. Nieuwe leveranciers_artikelen koppelingen
      const nieuweKoppelingen = regels.filter(
        (r) =>
          r.ai_raw_artikelnummer &&
          r.match_status !== "skipped" &&
          (r.match_status === "matched" || r.match_status === "manual")
      ).length;

      const heeftGroteWijzigingen = kostprijsWijzigingen.some(
        (w) => w.severity === "groot"
      );

      const result: PreviewData = {
        factuur: {
          leverancierNaam: factuur.leverancierNaam,
          factuurnummer: factuur.factuurnummer,
          totaal: factuur.totaal,
        },
        nieuweIngredienten,
        kostprijsWijzigingen,
        nieuweKoppelingen,
        skippedRegels,
        heeftGroteWijzigingen,
      };
      console.log("[preview] returning", result);
      return result;
    },
  });
}
