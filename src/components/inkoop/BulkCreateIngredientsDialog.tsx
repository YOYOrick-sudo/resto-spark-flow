/**
 * BulkCreateIngredientsDialog — D.6b R4b-3
 *
 * Bulk-aanmaak van nieuwe ingrediënten uit unmatched factuurregels.
 * R4b-3 uitbreiding: pre-check op duplicaat-namen via useBulkDuplicateIngredientCheck.
 * Per duplicaat-rij krijgt de chef een dropdown met 3 acties:
 *   - Nieuw aanmaken (default als geen duplicaat) of "force new"
 *   - Koppel aan bestaande (extra leverancier)
 *   - Maak variant met auto-suffix
 *
 * Submit splitst in 2 batches:
 *   - bulkCreateIngredientsFromFactuur voor "Nieuw" + "Variant"
 *   - bulkKoppelExtraLeveranciers voor "Koppel"
 */
import * as React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ExternalLink, AlertTriangle, Link2, Plus, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useBulkDuplicateIngredientCheck, type DuplicateIngredient } from "@/hooks/useDuplicateIngredientCheck";
import { normalizeIngredientNaam } from "@/lib/stringUtils";
import { naamMetSuffix } from "@/lib/variantSuffix";
import { nestoToast } from "@/lib/nestoToast";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

const CATEGORIE_OPTIONS = [
  { value: "groenten", label: "Groenten" },
  { value: "vlees", label: "Vlees" },
  { value: "vis", label: "Vis" },
  { value: "zuivel", label: "Zuivel" },
  { value: "kruiden", label: "Kruiden" },
  { value: "olie", label: "Olie" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

const EENHEID_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "stuk", label: "stuk" },
];

const ACTIE_OPTIONS = [
  { value: "nieuw", label: "Nieuw aanmaken" },
  { value: "koppel", label: "Koppel aan bestaande" },
  { value: "variant", label: "Variant met suffix" },
];

type Actie = "nieuw" | "koppel" | "variant";

interface RowState {
  regelId: string;
  /** R4b-4 — extra factuur_regels die in dezelfde dedup-groep vallen.
   *  Worden bij submit allemaal gekoppeld aan hetzelfde nieuwe/bestaande ingrediënt. */
  extraRegelIds: string[];
  /** R4b-4 — aantal regels in deze groep (incl. primaire) voor "Nx op factuur" badge */
  groupSize: number;
  checked: boolean;
  naam: string;
  origineleNaam: string; // Wat de chef oorspronkelijk zag, voor duplicate-key
  categorie: string;
  eenheid: string;
  kostprijs: number | null;
  aliasNaam: string;
  artikelnummer: string | null;
  verpakkingHoeveelheid: number | null;
  verpakkingEenheid: string | null;
  prijsPerVerpakking: number | null;
  // R4b-3
  actie: Actie;
  duplicate: DuplicateIngredient | null;
}

/** R4b-4 — Drempel boven welke we waarschuwen voor prijsdivergentie binnen een groep.
 *  >5% verschil tussen min/max suggereert verschillende verpakkingen of typfout. */
const PRIJS_VARIANCE_WARN_PCT = 0.05;

/** R4b-4 — Helper: pak meest voorkomende waarde uit array (eerste bij gelijkspel). */
function mostCommon<T>(values: Array<T | null | undefined>): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

interface Props {
  open: boolean;
  onClose: () => void;
  regels: FactuurRegel[];
  leverancierId: string | null;
}

export function BulkCreateIngredientsDialog({
  open,
  onClose,
  regels,
  leverancierId,
}: Props) {
  const { bulkCreateIngredientsFromFactuur, bulkKoppelExtraLeveranciers } =
    useFactuurMutations();

  const [rows, setRows] = React.useState<RowState[]>([]);

  // Initialiseer rijen bij open — R4b-4: dedup op clean_naam (PRIMARY) of leverancier+artikelnr (SECONDARY)
  React.useEffect(() => {
    if (!open) return;

    // Stap 1: groepeer regels
    const groups = new Map<string, FactuurRegel[]>();
    for (const r of regels) {
      const cleanNaam = normalizeIngredientNaam(
        r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend
      );
      let key: string;
      if (cleanNaam.trim().length > 0) {
        key = `naam:${cleanNaam.toLowerCase().trim()}`;
      } else if (leverancierId && r.ai_raw_artikelnummer?.trim()) {
        key = `artnr:${leverancierId}:${r.ai_raw_artikelnummer.trim()}`;
      } else {
        key = `regel:${r.id}`; // unieke fallback → geen groepering
      }
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    }

    // Stap 2: bouw RowState per groep
    const newRows: RowState[] = [];
    for (const [, regelsInGroep] of groups) {
      // Kies "primaire" regel = regel met laagste prijs_per_basiseenheid (defensief).
      // Reden: bij verschillen binnen groep is laagste prijs de zekerste schatting voor
      // kostprijs (overschat zelden). Bij identieke prijzen maakt keuze niet uit.
      const prijzen = regelsInGroep
        .map((x) => x.prijs_per_basiseenheid ?? x.prijs_per_eenheid ?? null)
        .filter((p): p is number => p != null && p > 0);

      // R4b-4 monitoring: waarschuw bij significante prijsdivergentie binnen groep
      if (prijzen.length >= 2) {
        const min = Math.min(...prijzen);
        const max = Math.max(...prijzen);
        if (min > 0 && (max - min) / min > PRIJS_VARIANCE_WARN_PCT) {
          const cleanNaam = normalizeIngredientNaam(
            regelsInGroep[0].ai_suggested_naam ??
              regelsInGroep[0].ai_raw_naam ??
              regelsInGroep[0].product_naam_herkend
          );
          console.warn(
            `[BulkCreateDialog] Prijsdivergentie >${(PRIJS_VARIANCE_WARN_PCT * 100).toFixed(0)}% binnen groep "${cleanNaam}":`,
            {
              regelIds: regelsInGroep.map((x) => x.id),
              prijzen,
              min,
              max,
              spreadPct: (((max - min) / min) * 100).toFixed(1) + "%",
              gekozenKostprijs: min,
              hint: "Verschillende verpakkingen of OCR-fout? Controleer voor aanmaak.",
            }
          );
        }
      }

      const primair =
        regelsInGroep.length === 1
          ? regelsInGroep[0]
          : regelsInGroep.reduce((best, cur) => {
              const bp = best.prijs_per_basiseenheid ?? best.prijs_per_eenheid ?? Infinity;
              const cp = cur.prijs_per_basiseenheid ?? cur.prijs_per_eenheid ?? Infinity;
              return cp < bp ? cur : best;
            });

      const naam = normalizeIngredientNaam(
        primair.ai_suggested_naam ?? primair.ai_raw_naam ?? primair.product_naam_herkend
      );
      const categorie =
        mostCommon(regelsInGroep.map((x) => x.ai_category_hint ?? null)) ?? "overig";
      const eenheid =
        mostCommon(regelsInGroep.map((x) => x.ai_suggested_eenheid ?? null)) ?? "stuk";
      const extraRegelIds = regelsInGroep.filter((x) => x.id !== primair.id).map((x) => x.id);

      newRows.push({
        regelId: primair.id,
        extraRegelIds,
        groupSize: regelsInGroep.length,
        checked: true,
        naam,
        origineleNaam: naam,
        categorie,
        eenheid,
        kostprijs: primair.prijs_per_basiseenheid ?? primair.prijs_per_eenheid ?? null,
        aliasNaam: primair.product_naam_herkend,
        artikelnummer: primair.ai_raw_artikelnummer,
        verpakkingHoeveelheid: primair.verpakking_hoeveelheid,
        verpakkingEenheid: primair.verpakking_eenheid,
        prijsPerVerpakking: primair.prijs_per_eenheid,
        actie: "nieuw",
        duplicate: null,
      });
    }

    setRows(newRows);
  }, [open, regels, leverancierId]);

  // Pre-check duplicaten voor alle namen tegelijk
  const allNamen = React.useMemo(() => rows.map((r) => r.origineleNaam), [rows]);
  const { data: duplicateMap } = useBulkDuplicateIngredientCheck(allNamen, open);

  // Verrijk rijen met duplicate-info zodra resultaat binnen is
  React.useEffect(() => {
    if (!duplicateMap) return;
    setRows((prev) =>
      prev.map((r) => {
        const dup = duplicateMap.get(r.origineleNaam.toLowerCase()) ?? null;
        // Alleen patchen als nog niet ingesteld of als duplicate-status verandert
        if (r.duplicate?.id === dup?.id) return r;
        // Default actie = "koppel" wanneer duplicaat gedetecteerd, anders "nieuw"
        const defaultActie: Actie = dup ? "koppel" : "nieuw";
        return { ...r, duplicate: dup, actie: defaultActie };
      })
    );
  }, [duplicateMap]);

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  // Wanneer chef "variant" kiest: auto-pre-fill naam met suffix (alleen als nog niet aangepast)
  const handleActieChange = (idx: number, nieuweActie: string) => {
    const actie = nieuweActie as Actie;
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (actie === "variant" && r.naam.trim().toLowerCase() === r.origineleNaam.toLowerCase()) {
          // Auto-suffix
          const variantNaam = naamMetSuffix(r.origineleNaam, {
            verpakkingHoeveelheid: r.verpakkingHoeveelheid,
            verpakkingEenheid: r.verpakkingEenheid,
          });
          return { ...r, actie, naam: variantNaam };
        }
        if (actie !== "variant" && r.actie === "variant") {
          // Reset naam bij wegklikken variant
          return { ...r, actie, naam: r.origineleNaam };
        }
        return { ...r, actie };
      })
    );
  };

  const counts = React.useMemo(() => {
    const active = rows.filter((r) => r.checked);
    return {
      total: active.length,
      nieuw: active.filter((r) => r.actie === "nieuw").length,
      koppel: active.filter((r) => r.actie === "koppel" && r.duplicate).length,
      variant: active.filter((r) => r.actie === "variant").length,
    };
  }, [rows]);

  const isPending =
    bulkCreateIngredientsFromFactuur.isPending || bulkKoppelExtraLeveranciers.isPending;

  const handleSubmit = async () => {
    const active = rows.filter((r) => r.checked && r.naam.trim().length > 0);
    if (active.length === 0) return;

    // Split: "nieuw" + "variant" → bulkCreateIngredientsFromFactuur
    // "koppel" (met geldig duplicate) → bulkKoppelExtraLeveranciers
    const createItems = active
      .filter((r) => r.actie === "nieuw" || r.actie === "variant")
      .map((r) => ({
        regelId: r.regelId,
        naam: normalizeIngredientNaam(r.naam),
        categorie: r.categorie,
        eenheid: r.eenheid,
        kostprijs: r.kostprijs ?? undefined,
        aliasNaam: r.aliasNaam,
        leverancierId,
        artikelnummer: r.artikelnummer,
        verpakkingHoeveelheid: r.verpakkingHoeveelheid,
        verpakkingEenheid: r.verpakkingEenheid,
        prijsPerVerpakking: r.prijsPerVerpakking,
      }));

    const koppelItems = active
      .filter((r) => r.actie === "koppel" && r.duplicate && leverancierId)
      .map((r) => ({
        regelId: r.regelId,
        ingredientId: r.duplicate!.id,
        leverancierId: leverancierId!,
        artikelNaam: r.aliasNaam,
        artikelNummer: r.artikelnummer,
        verpakkingHoeveelheid: r.verpakkingHoeveelheid,
        verpakkingEenheid: r.verpakkingEenheid,
        prijsPerVerpakking: r.prijsPerVerpakking,
        prijsPerEenheid: r.kostprijs,
        aliasNaam: r.aliasNaam,
      }));

    const aantalNieuw = createItems.filter((i) => {
      const row = active.find((r) => r.regelId === i.regelId);
      return row?.actie === "nieuw";
    }).length;
    const aantalVariant = createItems.length - aantalNieuw;

    // Run beide batches parallel — onafhankelijke writes
    const [createRes, koppelRes] = await Promise.all([
      createItems.length > 0
        ? bulkCreateIngredientsFromFactuur.mutateAsync(createItems).catch((e) => {
            console.error("[bulk] create batch failed", e);
            return { success: 0, errors: [{ naam: "create-batch", error: e?.message ?? "Onbekend" }] };
          })
        : Promise.resolve({ success: 0, errors: [] as Array<{ naam: string; error: string }> }),
      koppelItems.length > 0
        ? bulkKoppelExtraLeveranciers.mutateAsync(koppelItems).catch((e) => {
            console.error("[bulk] koppel batch failed", e);
            return { success: 0, errors: [{ naam: "koppel-batch", error: e?.message ?? "Onbekend" }] };
          })
        : Promise.resolve({ success: 0, errors: [] as Array<{ naam: string; error: string }> }),
    ]);

    const totalErrors = createRes.errors.length + koppelRes.errors.length;
    const summaryParts: string[] = [];
    if (aantalNieuw > 0) summaryParts.push(`${aantalNieuw} nieuw`);
    if (koppelRes.success > 0) summaryParts.push(`${koppelRes.success} gekoppeld`);
    if (aantalVariant > 0) summaryParts.push(`${aantalVariant} als variant`);

    if (totalErrors === 0 && summaryParts.length > 0) {
      nestoToast.success(`${summaryParts.join(", ")} aangemaakt`);
      onClose();
    } else if (totalErrors > 0 && createRes.success + koppelRes.success > 0) {
      nestoToast.error(
        `${summaryParts.join(", ")} verwerkt, ${totalErrors} gefaald. Bekijk console.`
      );
    } else if (totalErrors > 0) {
      nestoToast.error(`Verwerking mislukt (${totalErrors} fouten). Bekijk console.`);
    }
  };

  const fmtPrice = (n: number | null) =>
    n == null
      ? "—"
      : `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  const aantalDuplicates = rows.filter((r) => r.duplicate).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Maak {regels.length} nieuwe ingrediënten aan
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1.5">
            Vink ingrediënten uit die je niet wilt aanmaken. Pas naam, categorie of
            eenheid aan waar nodig.
          </p>
          {aantalDuplicates > 0 && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                <span className="font-medium">{aantalDuplicates}</span> ingrediënt
                {aantalDuplicates === 1 ? "" : "en"} bestaan al. Kies per rij of je ze
                koppelt aan het bestaande ingrediënt of als variant aanmaakt.
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[24px_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_72px] gap-2 px-3 pb-2 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background z-10">
            <span />
            <span>Naam</span>
            <span>Categorie</span>
            <span>Eenheid</span>
            <span>Actie</span>
            <span className="text-right">€/eh</span>
          </div>

          {rows.map((r, idx) => {
            const isDup = !!r.duplicate;
            const showKoppelDisabled = !leverancierId;
            return (
              <div
                key={r.regelId}
                className={`grid grid-cols-[24px_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_72px] gap-2 px-3 py-2.5 rounded-lg items-center transition-colors ${
                  r.checked
                    ? isDup
                      ? "bg-primary/5 border border-primary/30"
                      : "bg-card border border-border/40"
                    : "bg-muted/30 opacity-60 border border-transparent"
                }`}
              >
                <Checkbox
                  checked={r.checked}
                  onCheckedChange={(v) => updateRow(idx, { checked: v === true })}
                />
                <div className="min-w-0 space-y-1">
                  <NestoInput
                    value={r.naam}
                    onChange={(e) => updateRow(idx, { naam: e.target.value })}
                    disabled={!r.checked || r.actie === "koppel"}
                    className="h-8 text-xs"
                  />
                  {isDup && (
                    <p className="text-[10px] text-primary flex items-center gap-1 px-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Bestaat al ({r.duplicate!.eenheid})
                    </p>
                  )}
                </div>
                <NestoSelect
                  value={r.categorie}
                  onValueChange={(v) => updateRow(idx, { categorie: v })}
                  options={CATEGORIE_OPTIONS}
                  disabled={!r.checked || r.actie === "koppel"}
                />
                <NestoSelect
                  value={r.eenheid}
                  onValueChange={(v) => updateRow(idx, { eenheid: v })}
                  options={EENHEID_OPTIONS}
                  disabled={!r.checked || r.actie === "koppel"}
                />
                <NestoSelect
                  value={r.actie}
                  onValueChange={(v) => handleActieChange(idx, v)}
                  options={
                    isDup
                      ? showKoppelDisabled
                        ? ACTIE_OPTIONS.filter((o) => o.value !== "koppel")
                        : ACTIE_OPTIONS
                      : [{ value: "nieuw", label: "Nieuw aanmaken" }]
                  }
                  disabled={!r.checked || !isDup}
                />
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  {fmtPrice(r.kostprijs)}
                </span>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 sm:justify-between gap-2">
          <Link
            to="/ingredienten"
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Bekijk bestaande ingrediënten
          </Link>
          <div className="flex items-center gap-3">
            {counts.total > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {counts.nieuw > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    {counts.nieuw}
                  </span>
                )}
                {counts.koppel > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {counts.koppel}
                  </span>
                )}
                {counts.variant > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {counts.variant}
                  </span>
                )}
              </div>
            )}
            <NestoButton variant="outline" onClick={onClose} disabled={isPending}>
              Annuleren
            </NestoButton>
            <NestoButton
              variant="primary"
              onClick={handleSubmit}
              disabled={counts.total === 0}
              isLoading={isPending}
            >
              Verwerk {counts.total} regel{counts.total === 1 ? "" : "s"}
            </NestoButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
