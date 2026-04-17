/**
 * usePreviewGoedkeuring — D.6b R4b-2
 *
 * Pure simulatie van wat de `goedkeuren` mutation zou doen, zonder DB-writes.
 * Returnt PreviewData voor de GoedkeurenPreviewModal.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

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
}

export interface SkippedRegelPreview {
  regelId: string;
  naam: string;
}

export interface PreviewData {
  factuur: {
    leverancierNaam: string | null;
    factuurnummer: string | null;
    totaal: number;
  };
  nieuweIngredienten: NieuwIngredientPreview[];
  kostprijsWijzigingen: PrijsWijziging[];
  nieuweKoppelingen: number;
  skippedRegels: SkippedRegelPreview[];
  heeftGroteWijzigingen: boolean;
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
      // (zijn al aangemaakt via inline form / bulk dialog, koppeling staat al)
      const nieuwRegels = regels.filter(
        (r) => r.is_nieuw_ingredient === true && r.match_status !== "skipped"
      );
      const nieuweIngredienten: NieuwIngredientPreview[] = nieuwRegels.map((r) => {
        const heeftBasisPrijs = r.prijs_per_basiseenheid != null;
        // Basis-eenheid: als er een per-basiseenheid prijs is, gebruik dan ai_suggested_eenheid
        // (dat is de échte basis: g/ml/stuk). Anders fallback op r.eenheid.
        const basisEenheid = heeftBasisPrijs
          ? (r.ai_suggested_eenheid ?? r.eenheid ?? null)
          : (r.eenheid ?? null);
        const verpakkingLabel =
          r.verpakking_hoeveelheid && r.verpakking_eenheid && basisEenheid
            ? `${r.verpakking_hoeveelheid} ${basisEenheid} per ${r.verpakking_eenheid}`
            : null;
        return {
          regelId: r.id,
          naam: r.product_naam_herkend,
          eenheid: basisEenheid,
          verpakkingLabel,
          prijs: r.prijs_per_basiseenheid ?? r.prijs_per_eenheid ?? null,
        };
      });

      // 3. Matched regels (incl. manual) → kostprijs-wijzigingen
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

      const kostprijsWijzigingen: PrijsWijziging[] = [];
      for (const r of matchedRegels) {
        const nieuwePrijs = r.prijs_per_basiseenheid ?? r.prijs_per_eenheid;
        if (nieuwePrijs == null) continue;
        const meta = oudePrijzen.get(r.ingredient_id!);
        if (!meta) continue;
        const oudePrijs = meta.kostprijs;

        // Geen oude prijs? Dan is dit een "eerste prijs" — toon als info, geen delta
        if (oudePrijs == null || oudePrijs === 0) {
          kostprijsWijzigingen.push({
            ingredientId: r.ingredient_id!,
            ingredientNaam: meta.naam,
            oudePrijs: null,
            nieuwePrijs,
            deltaPct: 0,
            severity: "klein",
          });
          continue;
        }

        const deltaPct = ((nieuwePrijs - oudePrijs) / oudePrijs) * 100;
        // Skip 0% (identiek)
        if (Math.abs(deltaPct) < 0.5) continue;

        kostprijsWijzigingen.push({
          ingredientId: r.ingredient_id!,
          ingredientNaam: meta.naam,
          oudePrijs,
          nieuwePrijs,
          deltaPct,
          severity: classifySeverity(deltaPct),
        });
      }

      // 4. Nieuwe leveranciers_artikelen koppelingen = regels met
      //    artikelnummer + matched/manual + niet-skipped
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
