import * as React from "react";
import { ReceptDetail, ReceptIngredientRow, HalffabricaatMethodeRow } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { useRecepten } from "@/hooks/useRecepten";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Trash2, Plus, ChevronDown, ChevronUp, History } from "lucide-react";
import { useApplyYieldCorrection, useCurrentYield } from "@/hooks/useYield";
import { YieldSourcePill } from "@/components/recepten/yield/YieldSourcePill";
import { YieldHistoryPanel } from "@/components/recepten/yield/YieldHistoryPanel";
import {
  bepaalOpbrengst,
  type IngredientForOpbrengst,
  type IngredientGewichtInfo,
} from "@/utils/opbrengstBerekening";
import { berekenPortieGrootte } from "@/utils/portieGrootte";

const METHODE_TYPES = [
  { value: "Bereiden", label: "Bereiden" },
  { value: "Aanvullen", label: "Aanvullen" },
  { value: "Snijden", label: "Snijden" },
  { value: "Roosteren", label: "Roosteren" },
  { value: "Portioneren", label: "Portioneren" },
  { value: "Uithalen", label: "Uithalen" },
  { value: "Ontdooien", label: "Ontdooien" },
  { value: "Opwarmen", label: "Opwarmen" },
  { value: "Afmaken", label: "Afmaken" },
  { value: "Overig", label: "Overig" },
];

const OUTPUT_EENHEID_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "porties", label: "porties" },
  { value: "st", label: "st" },
];

// D1 — alleen deze methode-types tonen opbrengst-flow in A.7
const YIELD_METHODE_TYPES = new Set(["Bereiden", "Snijden"]);

const GRID_COLS = "grid-cols-[32px_1fr_200px_80px_80px_1fr_40px_40px]";

interface MethodesTabProps {
  recept: ReceptDetail;
}

export function MethodesTab({ recept }: MethodesTabProps) {
  const { addMethode, updateMethode, removeMethode } = useReceptMutations();
  const { data: alleRecepten } = useRecepten({
    search: "",
    categorie: "",
    showArchived: false,
  });
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const subReceptOptions = (alleRecepten || [])
    .filter((r) => r.id !== recept.id)
    .map((r) => ({ value: r.id, label: r.naam }));

  const methodes = [...recept.halffabricaat_methodes].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  // Lookup gewichten van ingrediënten voor opbrengst-berekening
  const ingredientWeightLookup = React.useMemo(() => {
    const map = new Map<string, IngredientGewichtInfo>();
    for (const ri of recept.recept_ingredienten) {
      if (!ri.ingredienten) continue;
      map.set(ri.ingredient_id, {
        eenheid: ri.ingredienten.eenheid,
        weight_per_piece_g: ri.ingredienten.weight_per_piece_g ?? null,
        is_variable_weight: ri.ingredienten.is_variable_weight ?? false,
      });
    }
    return map;
  }, [recept.recept_ingredienten]);

  const handleAdd = () => {
    addMethode.mutate({
      receptId: recept.id,
      type: "Bereiden",
      visueleEenheid: "",
      outputHoeveelheid: 1,
      outputEenheid: "kg",
      standaardDuur: 30,
      sortOrder: methodes.length,
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full overflow-auto rounded-2xl bg-card shadow-card">
      {/* Header */}
      <div className={`grid ${GRID_COLS} gap-1 px-3 pt-3 pb-2`}>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Output</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duur</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Houdbaar</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Detail</span>
        <span />
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {methodes.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nog geen methodes toegevoegd
          </div>
        ) : (
          methodes.map((m, index) => (
            <MethodeRow
              key={m.id}
              methode={m}
              index={index}
              porties={recept.porties}
              receptType={recept.type}
              receptNaam={recept.naam}
              receptIngredienten={recept.recept_ingredienten}
              weightLookup={ingredientWeightLookup}
              subReceptOptions={subReceptOptions}
              isExpanded={expandedRows.has(m.id)}
              onToggleExpand={() => toggleRow(m.id)}
              onUpdate={(updates) => updateMethode.mutate({ id: m.id, ...updates })}
              onRemove={() => removeMethode.mutate({ id: m.id, receptId: recept.id })}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={handleAdd}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full min-h-[40px]"
          isLoading={addMethode.isPending}
        >
          Methode toevoegen
        </NestoButton>
      </div>
    </div>
  );
}

interface MethodeRowProps {
  methode: HalffabricaatMethodeRow;
  index: number;
  porties: number;
  receptType: string;
  receptNaam: string;
  receptIngredienten: ReceptIngredientRow[];
  weightLookup: Map<string, IngredientGewichtInfo>;
  subReceptOptions: { value: string; label: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
}

function MethodeRow({
  methode,
  index,
  porties,
  receptType,
  receptNaam,
  receptIngredienten,
  weightLookup,
  subReceptOptions,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: MethodeRowProps) {
  const [type, setType] = React.useState(methode.type);
  const [outputHoeveelheid, setOutputHoeveelheid] = React.useState(methode.output_hoeveelheid);
  const [outputEenheid, setOutputEenheid] = React.useState(methode.output_eenheid);
  const [outputGewichtPerStuk, setOutputGewichtPerStuk] = React.useState<number | "">(
    methode.output_gewicht_per_stuk_g ?? ""
  );
  const [duur, setDuur] = React.useState(methode.standaard_duur);
  const [houdbaarheid, setHoudbaarheid] = React.useState(methode.houdbaarheid ?? 0);
  const [instructie, setInstructie] = React.useState(methode.instructie ?? "");
  const [subReceptId, setSubReceptId] = React.useState(methode.sub_recept_id ?? "");

  // Yield panels state
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const { data: currentYield, isLoading: yieldLoading } = useCurrentYield(methode.id);
  const applyYield = useApplyYieldCorrection();

  const heeftOpbrengst = YIELD_METHODE_TYPES.has(type);
  const isStuksOutput = outputEenheid === "st" || outputEenheid === "stuks";

  const portie = berekenPortieGrootte(outputHoeveelheid, outputEenheid, porties);
  const methodeLabel = `${receptNaam} · ${methode.type}`;

  // D1+ — Bereken afgeleide opbrengst uit input vs output
  const opbrengst = React.useMemo(() => {
    if (!heeftOpbrengst) return null;
    const items: IngredientForOpbrengst[] = receptIngredienten.map((ri) => ({
      naam: ri.ingredienten?.naam ?? "?",
      hoeveelheid: Number(ri.hoeveelheid) || 0,
      eenheid: ri.eenheid,
      info: weightLookup.get(ri.ingredient_id) ?? null,
    }));
    return bepaalOpbrengst(items, {
      output_hoeveelheid: outputHoeveelheid,
      output_eenheid: outputEenheid,
      output_gewicht_per_stuk_g:
        outputGewichtPerStuk === "" ? null : Number(outputGewichtPerStuk),
    });
  }, [
    heeftOpbrengst,
    receptIngredienten,
    weightLookup,
    outputHoeveelheid,
    outputEenheid,
    outputGewichtPerStuk,
  ]);

  // Trigger yield-correctie RPC bij blur als afgeleide opbrengst afwijkt van huidige
  const triggerYieldUpdateIfNeeded = React.useCallback(() => {
    if (!heeftOpbrengst || !opbrengst || opbrengst.opbrengstPct === null) return;
    const newPct = opbrengst.opbrengstPct;
    if (!Number.isFinite(newPct) || newPct <= 0) return;
    const current = currentYield?.yield_pct ?? null;
    // Tolerantie 0.5% om noise te voorkomen
    if (current !== null && Math.abs(current - newPct) < 0.005) return;
    applyYield.mutate({
      methodeId: methode.id,
      newYieldPct: Math.min(newPct, 2),
      correctionReason: "Afgeleid uit output-invoer",
    });
  }, [heeftOpbrengst, opbrengst, currentYield, applyYield, methode.id]);

  return (
    <div className="group">
      {/* Main row */}
      <div className={`grid ${GRID_COLS} gap-1 items-center px-3 py-2.5 hover:bg-accent/40 transition-colors duration-150`}>
        {/* # */}
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>

        {/* Type */}
        <NestoSelect
          value={type}
          onValueChange={(v) => {
            setType(v);
            onUpdate({ type: v });
          }}
          options={METHODE_TYPES}
          size="sm"
        />

        {/* Output: number + eenheid + (optional) × g/stuk */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={outputHoeveelheid}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setOutputHoeveelheid(Number(v)); }}
            onBlur={() => {
              onUpdate({ output_hoeveelheid: outputHoeveelheid });
              triggerYieldUpdateIfNeeded();
            }}
            className="h-7 text-xs w-12 tabular-nums"
          />
          <NestoSelect
            value={outputEenheid}
            onValueChange={(v) => {
              setOutputEenheid(v);
              // D3 — bij wisselen weg van 'st' BEHOUDEN we output_gewicht_per_stuk_g (geen NULL).
              onUpdate({ output_eenheid: v });
              // Pas op volgende blur opnieuw triggeren — value is nu nieuw
            }}
            options={OUTPUT_EENHEID_OPTIONS}
            size="sm"
          />
          {isStuksOutput && (
            <>
              <span className="text-[11px] text-muted-foreground">×</span>
              <NestoInput
                type="number"
                min={0}
                value={outputGewichtPerStuk}
                onChange={(e) => {
                  const v = e.target.value;
                  setOutputGewichtPerStuk(v === "" ? "" : Number(v));
                }}
                onBlur={() => {
                  onUpdate({
                    output_gewicht_per_stuk_g:
                      outputGewichtPerStuk === "" ? null : Number(outputGewichtPerStuk),
                  });
                  triggerYieldUpdateIfNeeded();
                }}
                placeholder="g/st"
                className="h-7 text-xs w-12 tabular-nums"
              />
              <span className="text-[11px] text-muted-foreground">g</span>
            </>
          )}
        </div>

        {/* Duur */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={duur}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setDuur(Number(v)); }}
            onBlur={() => onUpdate({ standaard_duur: duur })}
            className="h-7 text-xs w-12 tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">min</span>
        </div>

        {/* Houdbaar */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={houdbaarheid}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setHoudbaarheid(Number(v)); }}
            onBlur={() => onUpdate({ houdbaarheid: houdbaarheid || null })}
            className="h-7 text-xs w-12 tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">d</span>
        </div>

        {/* Detail toggle */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 text-left truncate"
        >
          {type === "Bereiden" ? (
            <span className="truncate">
              {subReceptId
                ? subReceptOptions.find((o) => o.value === subReceptId)?.label ?? "Sub-recept"
                : "Sub-recept..."}
            </span>
          ) : (
            <span className="truncate">{instructie || "Instructie..."}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all duration-150 flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      {/* A.7.1 — Inline afgeleide opbrengst onder output-cel (tweede-regel pattern) */}
      {heeftOpbrengst && (
        <div className="px-3 -mt-1 pb-1 pl-[44px]">
          <span
            className="text-[11px] text-muted-foreground tabular-nums inline-flex items-center gap-1.5"
            title={
              opbrengst?.opbrengstPct === null
                ? "Vul ingrediënten en output in om opbrengst te berekenen"
                : "Afgeleid uit input vs output. Wijzig output om aan te passen."
            }
          >
            <span>
              · opbrengst{" "}
              {opbrengst?.opbrengstPct != null
                ? `${Math.round(opbrengst.opbrengstPct * 100)}%`
                : "–"}
            </span>
            {currentYield && !yieldLoading && (
              <YieldSourcePill source={currentYield.source} size="xs" />
            )}
          </span>
        </div>
      )}

      {/* D5 — Per-portie regel: alleen voor gerecht, niet voor halffabricaat */}
      {receptType === "gerecht" && portie && (
        <div className="px-3 -mt-1 pb-1 pl-[140px]">
          <span className="text-[11px] text-muted-foreground">
            = {portie.display} per portie
          </span>
        </div>
      )}

      {/* Expanded detail row */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 pl-[44px] space-y-3">
          {type === "Bereiden" ? (
            <NestoSelect
              label="Sub-recept"
              value={subReceptId}
              onValueChange={(v) => {
                setSubReceptId(v);
                onUpdate({ sub_recept_id: v || null });
              }}
              options={subReceptOptions}
              placeholder="Selecteer sub-recept..."
              size="sm"
            />
          ) : (
            <textarea
              value={instructie}
              onChange={(e) => setInstructie(e.target.value)}
              onBlur={() => onUpdate({ instructie: instructie || null })}
              placeholder="Beschrijf de stappen..."
              className="w-full min-h-[60px] rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none resize-y"
            />
          )}

          {/* Opbrengst-paneel — alleen voor methode-types met opbrengst-flow */}
          {heeftOpbrengst && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Afgeleide opbrengst
                </span>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="p-1 rounded hover:bg-accent transition-colors flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  title="Opbrengst-historie"
                >
                  <History className="h-3.5 w-3.5" />
                  Historie
                </button>
              </div>

              <OpbrengstBreakdown
                ingredienten={receptIngredienten}
                weightLookup={weightLookup}
                opbrengst={opbrengst}
              />

              {/* A.7.1 — read-only weergave van opgeslagen opbrengst (geen entry-point meer) */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">Opgeslagen opbrengst:</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5">
                  {yieldLoading ? (
                    <span className="text-[11px] text-muted-foreground">…</span>
                  ) : currentYield ? (
                    <>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {Math.round(currentYield.yield_pct * 100)}%
                      </span>
                      <YieldSourcePill source={currentYield.source} size="xs" />
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">–</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yield history panel — correctie-paneel verwijderd in A.7.1 */}
      {historyOpen && (
        <YieldHistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          methodeId={methode.id}
          methodeLabel={methodeLabel}
        />
      )}
    </div>
  );
}

// ── Sub-component: ingrediënten-breakdown + totale opbrengst ───────────────
function OpbrengstBreakdown({
  ingredienten,
  weightLookup,
  opbrengst,
}: {
  ingredienten: ReceptIngredientRow[];
  weightLookup: Map<string, IngredientGewichtInfo>;
  opbrengst: ReturnType<typeof bepaalOpbrengst> | null;
}) {
  if (!opbrengst) return null;
  if (ingredienten.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        Voeg ingrediënten toe om opbrengst te berekenen.
      </p>
    );
  }

  return (
    <div className="space-y-1 text-[11px]">
      {ingredienten.map((ri) => {
        const info = weightLookup.get(ri.ingredient_id);
        const naam = ri.ingredienten?.naam ?? "?";
        const variabel = info?.is_variable_weight && info.weight_per_piece_g;
        const prefix = variabel ? "≈ " : "";
        // Hint per regel
        const hoeveelheid = `${ri.hoeveelheid} ${ri.eenheid}`;
        const heeftMassa = !opbrengst.ingredientenZonderGewicht.includes(naam);
        return (
          <div key={ri.id} className="flex items-center justify-between gap-3">
            <span className="text-foreground truncate">
              {naam}
              {variabel && (
                <span className="ml-1 text-muted-foreground">({prefix}{info?.weight_per_piece_g}g/st)</span>
              )}
            </span>
            <span className={heeftMassa ? "tabular-nums text-muted-foreground" : "text-destructive"}>
              {hoeveelheid}
              {!heeftMassa && " — geen gewicht bekend"}
            </span>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-foreground">
        <span className="font-medium">Totale input</span>
        <span className="tabular-nums font-medium">
          {opbrengst.inputMassaG > 0 ? `${Math.round(opbrengst.inputMassaG)} g` : "–"}
        </span>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span className="font-medium">Output</span>
        <span className="tabular-nums font-medium">
          {opbrengst.outputMassaG !== null ? `${Math.round(opbrengst.outputMassaG)} g` : "–"}
        </span>
      </div>
      <div className="flex items-center justify-between pt-1 text-primary">
        <span className="font-semibold">Opbrengst</span>
        <span className="tabular-nums font-semibold">
          {opbrengst.opbrengstPct !== null
            ? `${Math.round(opbrengst.opbrengstPct * 100)}%`
            : "Niet bepaalbaar"}
        </span>
      </div>
    </div>
  );
}
