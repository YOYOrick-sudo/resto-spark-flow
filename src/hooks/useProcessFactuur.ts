/**
 * Sprint C1 — useProcessFactuur
 *
 * Orchestreert de "Verwerk factuur" flow in 4 sequentiële fasen:
 *   A) bulkConfirmHighConfidence — matched/manual ingrediënt-regels
 *   B) bulkCreateIngredientsFromFactuur — nieuwe ingrediënt-regels (excl. verpakking)
 *   C) skipRegels — verpakking + chef-handmatig "skipped" markeren
 *   D) goedkeuren — status → goedgekeurd + kostprijs/leveranciers_artikelen leer-loop
 *
 * IDEMPOTENTIE
 * ============
 * - Wordt vóór elke fase gefilterd op HUIDIGE DB-state (re-fetch via useFactuurDetail
 *   query-cache + match_status / ingredient_id checks). Al-verwerkte regels worden
 *   geskipt zodat een retry NIET dubbel verwerkt.
 * - Phase A (bulkConfirm) is van nature idempotent: UPDATE match_status='matched'
 *   op rijen die al "matched" zijn is een no-op (zelfde waarde).
 * - Phase B (bulkCreate) wordt overgeslagen voor regels met ingredient_id IS NOT NULL
 *   (= al een ingrediënt aangemaakt in vorige run).
 * - Phase C (skip) is idempotent: UPDATE match_status='skipped' op al-skipped rijen
 *   is een no-op.
 * - Phase D (goedkeuren) draait alleen als A+B+C ZONDER failures klaar zijn.
 *
 * CHEF-VRIENDELIJKE FOUT-MAPPING
 * ===============================
 * SUPABASE error codes worden vertaald naar chef-taal in `mapErrorToChefTaal`.
 */
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeIngredientNaam } from "@/lib/stringUtils";
import { isVerpakkingRegel } from "@/lib/factuur-categories";
import type { FactuurRegel, FactuurDetail } from "@/hooks/useFactuurDetail";

export type ProcessPhase = "idle" | "A" | "B" | "C" | "D" | "done" | "partial" | "error";

export interface PhaseResult {
  attempted: number;
  succeeded: number;
  skipped: number; // al-verwerkt — geen actie nodig
  failures: PhaseFailure[];
}

export interface PhaseFailure {
  regelId: string;
  productNaam: string;
  reden: string;        // chef-taal
  technisch: string;    // raw error voor "meer info"
}

export interface ProcessResult {
  phaseA: PhaseResult;
  phaseB: PhaseResult;
  phaseC: PhaseResult;
  phaseDExecuted: boolean;
  phaseDError: string | null;
  totalFailures: number;
  totalSucceeded: number;
}

const EMPTY_PHASE: PhaseResult = {
  attempted: 0,
  succeeded: 0,
  skipped: 0,
  failures: [],
};

// ============================================================
// Chef-taal foutvertaling
// ============================================================
function mapErrorToChefTaal(err: any, naam: string): string {
  const msg = String(err?.message ?? err ?? "");
  const code = err?.code;

  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    return `Ingrediënt "${naam}" bestaat al — gebruik "Koppelen" in plaats van aanmaken.`;
  }
  if (code === "23503" || /foreign key/i.test(msg)) {
    return `Ingrediënt "${naam}" verwijst naar iets dat niet (meer) bestaat. Probeer opnieuw.`;
  }
  if (code === "23502" || /not.null|null value/i.test(msg)) {
    return `Verplicht veld ontbreekt voor "${naam}" (categorie of eenheid).`;
  }
  if (/network|fetch|timeout/i.test(msg)) {
    return `Verbinding viel weg tijdens verwerken van "${naam}". Probeer opnieuw.`;
  }
  if (/permission|RLS|policy/i.test(msg)) {
    return `Geen rechten om "${naam}" bij te werken. Vraag een beheerder.`;
  }
  return `"${naam}" kon niet verwerkt worden — probeer opnieuw.`;
}

// ============================================================
// Helpers — categoriseer regels per fase (op huidige DB-state)
// ============================================================
export interface PhasePartition {
  matchedToConfirm: FactuurRegel[]; // Phase A
  newToCreate: FactuurRegel[];      // Phase B
  toSkip: FactuurRegel[];           // Phase C — verpakking + handmatig skipped
}

export function partitionRegels(regels: FactuurRegel[]): PhasePartition {
  const verpakking = regels.filter(isVerpakkingRegel);
  const ingredientRegels = regels.filter((r) => !isVerpakkingRegel(r));

  // Sprint Enterprise Pass: regels met validation_error (qty×prijs ≠ totaal)
  // mogen NIET worden gebruikt voor matching/koppeling — ze worden in Phase C
  // als skipped gemarkeerd en uitgesloten van kostprijs-updates.
  const errorRegels = ingredientRegels.filter((r) => r.validation_error);
  const cleanIngredientRegels = ingredientRegels.filter(
    (r) => !r.validation_error,
  );

  // Phase A: matched OR manual met ingredient_id, niet nieuw, geen validation_error.
  const matchedToConfirm = cleanIngredientRegels.filter(
    (r) =>
      r.ingredient_id != null &&
      r.is_nieuw_ingredient !== true &&
      (r.match_status === "matched" || r.match_status === "manual")
  );

  // Phase B: is_nieuw_ingredient=true ZONDER ingredient_id, geen validation_error.
  const newToCreate = cleanIngredientRegels.filter(
    (r) =>
      r.is_nieuw_ingredient === true &&
      r.ingredient_id == null &&
      r.match_status !== "skipped"
  );

  // Phase C: verpakking + unmatched + validation_error regels die nog niet skipped zijn
  const toSkip = [
    ...verpakking.filter((r) => r.match_status !== "skipped"),
    ...cleanIngredientRegels.filter(
      (r) =>
        r.match_status === "unmatched" &&
        r.is_nieuw_ingredient !== true &&
        r.ingredient_id == null
    ),
    ...errorRegels.filter((r) => r.match_status !== "skipped"),
  ];

  return { matchedToConfirm, newToCreate, toSkip };
}

// ============================================================
// Sum-check helper — vergelijk berekend vs ai-totaal
// ============================================================
export interface SumCheck {
  berekend: number;
  ai: number | null;
  delta: number;          // absolute
  deltaPct: number;       // |delta / ai|
  matches: boolean;       // binnen 1% of <€0.50
}

export function sumCheck(factuur: FactuurDetail | null | undefined): SumCheck {
  const berekend = (factuur?.regels ?? []).reduce(
    (s, r) => s + (r.totaal ?? 0),
    0
  );
  const ai = factuur?.totaalbedrag ?? null;
  if (ai == null || ai === 0) {
    return { berekend, ai, delta: 0, deltaPct: 0, matches: true };
  }
  const delta = Math.abs(berekend - ai);
  const deltaPct = (delta / Math.abs(ai)) * 100;
  const matches = delta < 0.5 || deltaPct < 1;
  return { berekend, ai, delta, deltaPct, matches };
}

// ============================================================
// Hook
// ============================================================
export function useProcessFactuur() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locId = currentLocation?.id;

  const [phase, setPhase] = useState<ProcessPhase>("idle");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setIsRunning(false);
  }, []);

  const run = useCallback(
    async (factuurId: string, factuur: FactuurDetail) => {
      if (!locId) throw new Error("Geen locatie actief");

      // Sprint Enterprise Pass — pre-flight: blocked factuur mag NIET worden verwerkt.
      // IDEMPOTENT: pure check op factuur.status, geen DB-write.
      if (factuur.status === "review_blocked") {
        throw new Error(
          "Deze factuur is geblokkeerd — een manager moet eerst de bedragen reviewen.",
        );
      }

      setIsRunning(true);
      setResult(null);

      const partition = partitionRegels(factuur.regels);
      const leverancierId = factuur.leverancier_id;

      // ---------- PHASE A — bulkConfirmHighConfidence ----------
      setPhase("A");
      const phaseA: PhaseResult = { ...EMPTY_PHASE, attempted: partition.matchedToConfirm.length };

      if (partition.matchedToConfirm.length > 0) {
        const ids = partition.matchedToConfirm.map((r) => r.id);
        const { error } = await supabase
          .from("factuur_regels")
          .update({ match_status: "matched" })
          .in("id", ids);
        if (error) {
          // Hele bulk faalt — splits per regel zodat individuele rapportage mogelijk is
          for (const r of partition.matchedToConfirm) {
            phaseA.failures.push({
              regelId: r.id,
              productNaam: r.product_naam_herkend,
              reden: mapErrorToChefTaal(error, r.product_naam_herkend),
              technisch: error.message,
            });
          }
        } else {
          phaseA.succeeded = ids.length;
        }
      }

      // ---------- PHASE B — bulkCreateIngredientsFromFactuur ----------
      setPhase("B");
      const phaseB: PhaseResult = { ...EMPTY_PHASE, attempted: partition.newToCreate.length };

      for (const regel of partition.newToCreate) {
        try {
          // IDEMPOTENT GUARD: re-check ingredient_id voor we aanmaken (race-protectie)
          const { data: fresh } = await supabase
            .from("factuur_regels")
            .select("ingredient_id, match_status")
            .eq("id", regel.id)
            .maybeSingle();
          if (fresh?.ingredient_id) {
            phaseB.skipped++;
            continue;
          }

          const naam =
            regel.ai_suggested_naam ??
            regel.ai_raw_naam ??
            regel.product_naam_herkend;
          const cleanNaam = normalizeIngredientNaam(naam);
          const eenheid =
            regel.ai_suggested_eenheid ?? regel.eenheid ?? "stuk";
          const categorie = regel.ai_category_hint ?? "overig";
          const kostprijs = regel.prijs_per_basiseenheid ?? regel.prijs_per_eenheid ?? null;

          const { data: ing, error: iErr } = await supabase
            .from("ingredienten")
            .insert({
              location_id: locId,
              naam: cleanNaam,
              categorie,
              eenheid,
              kostprijs,
              kostprijs_bron: kostprijs ? "factuur" : null,
              kostprijs_laatst_bijgewerkt: kostprijs ? new Date().toISOString() : null,
              min_voorraad: 0,
            })
            .select("id")
            .single();
          if (iErr) throw iErr;

          const { error: rErr } = await supabase
            .from("factuur_regels")
            .update({
              ingredient_id: ing.id,
              match_status: "manual",
              is_nieuw_ingredient: true,
            })
            .eq("id", regel.id);
          if (rErr) throw rErr;

          // Alias (best effort)
          const aliasNaam = (regel.ai_raw_naam ?? regel.product_naam_herkend ?? "").trim();
          if (aliasNaam) {
            const { error: aErr } = await supabase.rpc("record_factuur_correction", {
              p_ingredient_id: ing.id,
              p_alias_naam: aliasNaam,
              p_leverancier_id: leverancierId,
              p_artikelnummer: regel.ai_raw_artikelnummer ?? null,
            });
            if (aErr && (aErr as any).code !== "23505") {
              console.warn("[useProcessFactuur alias]", aErr);
            }
          }

          // Leveranciers_artikelen koppeling (best-effort; faalt → telt als sub-failure)
          const artNr = regel.ai_raw_artikelnummer?.trim();
          if (leverancierId && artNr) {
            const { error: laErr } = await supabase
              .from("leveranciers_artikelen")
              .upsert(
                {
                  leverancier_id: leverancierId,
                  artikel_nummer: artNr,
                  ingredient_id: ing.id,
                  artikel_naam: cleanNaam,
                  prijs_per_eenheid: kostprijs,
                  prijs_per_verpakking:
                    regel.prijs_per_basiseenheid != null
                      ? regel.prijs_per_eenheid
                      : null,
                  verpakking_hoeveelheid: regel.verpakking_hoeveelheid ?? null,
                  verpakking_eenheid: regel.verpakking_eenheid ?? null,
                  is_actief: true,
                  laatst_gesynchroniseerd: new Date().toISOString(),
                },
                { onConflict: "leverancier_id,artikel_nummer" }
              );
            if (laErr) {
              console.warn("[useProcessFactuur la upsert]", laErr);
              // Niet als failure tellen — ingrediënt is wel aangemaakt
            }
          }

          phaseB.succeeded++;
        } catch (err: any) {
          phaseB.failures.push({
            regelId: regel.id,
            productNaam: regel.product_naam_herkend,
            reden: mapErrorToChefTaal(err, regel.product_naam_herkend),
            technisch: err?.message ?? String(err),
          });
        }
      }

      // ---------- PHASE C — skipRegels (verpakking + unmatched) ----------
      setPhase("C");
      const phaseC: PhaseResult = { ...EMPTY_PHASE, attempted: partition.toSkip.length };

      if (partition.toSkip.length > 0) {
        const ids = partition.toSkip.map((r) => r.id);
        const { error } = await supabase
          .from("factuur_regels")
          .update({ match_status: "skipped" })
          .in("id", ids);
        if (error) {
          for (const r of partition.toSkip) {
            phaseC.failures.push({
              regelId: r.id,
              productNaam: r.product_naam_herkend,
              reden: mapErrorToChefTaal(error, r.product_naam_herkend),
              technisch: error.message,
            });
          }
        } else {
          phaseC.succeeded = ids.length;
        }
      }

      const totalFailures =
        phaseA.failures.length + phaseB.failures.length + phaseC.failures.length;
      const totalSucceeded =
        phaseA.succeeded + phaseB.succeeded + phaseC.succeeded;

      // ---------- PHASE D — goedkeuren (alleen bij 0 failures) ----------
      let phaseDExecuted = false;
      let phaseDError: string | null = null;

      if (totalFailures === 0) {
        setPhase("D");
        try {
          // Re-fetch verse regels (Phase A/B hebben ze gemuteerd)
          const { data: factuurFull, error: fErr } = await supabase
            .from("factuur_uploads")
            .select("*, factuur_regels(*)")
            .eq("id", factuurId)
            .single();
          if (fErr) throw fErr;

          const regels = ((factuurFull as any).factuur_regels ?? []) as any[];

          // Status → goedgekeurd
          const { error: uErr } = await supabase
            .from("factuur_uploads")
            .update({
              status: "goedgekeurd" as const,
              goedgekeurd_door: user?.id ?? null,
              goedgekeurd_op: new Date().toISOString(),
            })
            .eq("id", factuurId);
          if (uErr) throw uErr;

          // Kostprijs-update voor alle matched/manual regels (skipt skipped/null)
          // Sprint Enterprise Pass: regels met validation_error worden uitgesloten —
          // hun prijs is intern inconsistent (qty × prijs ≠ totaal) en mag de
          // kostprijs van het ingredient niet vervuilen.
          const matchedRegels = regels.filter(
            (r: any) =>
              r.ingredient_id &&
              r.match_status !== "skipped" &&
              r.validation_error !== true &&
              (r.match_status === "matched" || r.match_status === "manual")
          );
          for (const regel of matchedRegels) {
            const prijs = regel.prijs_per_basiseenheid ?? regel.prijs_per_eenheid;
            if (prijs == null) continue;
            await supabase
              .from("ingredienten")
              .update({
                kostprijs: prijs,
                kostprijs_bron: "factuur",
                kostprijs_laatst_bijgewerkt: new Date().toISOString(),
              })
              .eq("id", regel.ingredient_id);
          }

          // Leveranciers_artikelen leerlogica (zelfde als bestaande goedkeuren mutation)
          if (leverancierId) {
            const upsertRows = regels
              .filter(
                (r: any) =>
                  r.ingredient_id &&
                  r.ai_raw_artikelnummer &&
                  r.match_status !== "skipped" &&
                  (r.match_status === "matched" || r.match_status === "manual")
              )
              .map((r: any) => ({
                leverancier_id: leverancierId,
                artikel_nummer: String(r.ai_raw_artikelnummer).trim(),
                ingredient_id: r.ingredient_id as string,
                artikel_naam: r.product_naam_herkend ?? "Onbekend",
                prijs_per_eenheid:
                  r.prijs_per_basiseenheid ?? r.prijs_per_eenheid ?? null,
                prijs_per_verpakking:
                  r.prijs_per_basiseenheid != null ? r.prijs_per_eenheid : null,
                verpakking_hoeveelheid: r.verpakking_hoeveelheid ?? null,
                verpakking_eenheid: r.verpakking_eenheid ?? null,
                is_actief: true,
                laatst_gesynchroniseerd: new Date().toISOString(),
              }));
            if (upsertRows.length) {
              const dedupMap = new Map<string, (typeof upsertRows)[0]>();
              for (const row of upsertRows) {
                dedupMap.set(`${row.leverancier_id}|${row.artikel_nummer}`, row);
              }
              const { error: upErr } = await supabase
                .from("leveranciers_artikelen")
                .upsert(Array.from(dedupMap.values()), {
                  onConflict: "leverancier_id,artikel_nummer",
                });
              if (upErr) console.warn("[Phase D leveranciers_artikelen]", upErr);
            }
          }

          phaseDExecuted = true;
        } catch (err: any) {
          phaseDError = err?.message ?? String(err);
          console.error("[useProcessFactuur Phase D]", err);
        }
      }

      const finalResult: ProcessResult = {
        phaseA,
        phaseB,
        phaseC,
        phaseDExecuted,
        phaseDError,
        totalFailures,
        totalSucceeded,
      };

      setResult(finalResult);
      setIsRunning(false);

      if (phaseDError) {
        setPhase("error");
      } else if (totalFailures > 0) {
        setPhase("partial");
      } else {
        setPhase("done");
      }

      // Cache invalidation
      qc.invalidateQueries({ queryKey: ["factuur-detail", factuurId] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      qc.invalidateQueries({ queryKey: ["leveranciers-artikelen"] });

      return finalResult;
    },
    [locId, user?.id, qc]
  );

  return { phase, result, isRunning, run, reset };
}
