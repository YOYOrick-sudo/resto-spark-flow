// Sprint A.7 — Pure functies voor opbrengst-berekening uit input vs output.
// Chef vult input-ingrediënten + output in. Systeem leidt opbrengst-% af.

import type { ReceptIngredientRow, HalffabricaatMethodeRow } from "@/hooks/useRecept";

export interface IngredientGewichtInfo {
  eenheid: string; // 'g' | 'kg' | 'ml' | 'L' | 'st'
  weight_per_piece_g: number | null;
  is_variable_weight: boolean;
}

/**
 * Converteer hoeveelheid + eenheid naar gram (massa).
 * - g/kg → directe massa
 * - ml/L → benadering 1g/ml (densiteit-onafhankelijk in MVP)
 * - st   → vereist weight_per_piece_g, anders null
 */
export function naarGram(
  hoeveelheid: number,
  eenheid: string,
  info?: IngredientGewichtInfo | null
): number | null {
  if (!Number.isFinite(hoeveelheid) || hoeveelheid <= 0) return 0;
  const e = eenheid?.toLowerCase();
  if (e === "g") return hoeveelheid;
  if (e === "kg") return hoeveelheid * 1000;
  if (e === "ml") return hoeveelheid; // 1ml ≈ 1g
  if (e === "l") return hoeveelheid * 1000;
  if (e === "st" || e === "stuks") {
    const w = info?.weight_per_piece_g;
    if (!w || w <= 0) return null;
    return hoeveelheid * w;
  }
  return null;
}

export interface OpbrengstResultaat {
  inputMassaG: number;
  outputMassaG: number | null;
  opbrengstPct: number | null; // 0..2 (decimal); null als niet bepaalbaar
  ingredientenZonderGewicht: string[]; // namen van ingrediënten waar massa onbekend is
}

export interface IngredientForOpbrengst {
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  info?: IngredientGewichtInfo | null;
}

export interface MethodeOutput {
  output_hoeveelheid: number;
  output_eenheid: string;
  output_gewicht_per_stuk_g?: number | null;
}

/**
 * Bepaal opbrengst uit input-ingrediënten en methode-output.
 * Retourneert null voor opbrengstPct als input of output niet in gram herleidbaar is.
 */
export function bepaalOpbrengst(
  ingredienten: IngredientForOpbrengst[],
  methode: MethodeOutput
): OpbrengstResultaat {
  const ingredientenZonderGewicht: string[] = [];
  let inputMassaG = 0;
  for (const ing of ingredienten) {
    const m = naarGram(ing.hoeveelheid, ing.eenheid, ing.info);
    if (m === null) {
      ingredientenZonderGewicht.push(ing.naam);
    } else {
      inputMassaG += m;
    }
  }

  const outputMassaG = berekenOutputMassa(methode);
  const opbrengstPct =
    inputMassaG > 0 && outputMassaG !== null && outputMassaG > 0
      ? outputMassaG / inputMassaG
      : null;

  return { inputMassaG, outputMassaG, opbrengstPct, ingredientenZonderGewicht };
}

export function berekenOutputMassa(methode: MethodeOutput): number | null {
  const { output_hoeveelheid, output_eenheid, output_gewicht_per_stuk_g } = methode;
  if (!Number.isFinite(output_hoeveelheid) || output_hoeveelheid <= 0) return null;
  // TODO: A.8.5 — canonicaliseer eenheid-codes ('porties' → 'st')
  const isStuksOutput = output_eenheid === "st" || output_eenheid === "stuks";
  if (isStuksOutput) {
    if (!output_gewicht_per_stuk_g || output_gewicht_per_stuk_g <= 0) return null;
    return output_hoeveelheid * output_gewicht_per_stuk_g;
  }
  return naarGram(output_hoeveelheid, output_eenheid, null);
}

/** Helper: extract ingrediënten in vorm voor bepaalOpbrengst uit recept_ingredienten rijen. */
export function mapReceptIngredientenForOpbrengst(
  rows: ReceptIngredientRow[],
  weightLookup: Map<string, IngredientGewichtInfo>
): IngredientForOpbrengst[] {
  return rows.map((r) => ({
    naam: r.ingredienten?.naam ?? "?",
    hoeveelheid: Number(r.hoeveelheid) || 0,
    eenheid: r.eenheid,
    info: weightLookup.get(r.ingredient_id) ?? null,
  }));
}

export type { HalffabricaatMethodeRow };
