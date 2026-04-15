import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { berekenPortieGrootte } from "@/utils/portieGrootte";

const METHODE_TYPES = [
  { value: "Bereiden", label: "Bereiden" },
  { value: "Aanvullen", label: "Aanvullen" },
  { value: "Snijden", label: "Snijden" },
  { value: "Portioneren", label: "Portioneren" },
  { value: "Ontdooien", label: "Ontdooien" },
  { value: "Overig", label: "Overig" },
];

const OUTPUT_EENHEID_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "porties", label: "porties" },
  { value: "stuks", label: "stuks" },
];

interface WizardMethode {
  type: string;
  visueleEenheid: string;
  outputHoeveelheid: number;
  outputEenheid: string;
  standaardDuur: number;
  houdbaarheid: number;
  instructie: string;
}

const DEFAULT_METHODE: WizardMethode = {
  type: "Bereiden",
  visueleEenheid: "",
  outputHoeveelheid: 1,
  outputEenheid: "kg",
  standaardDuur: 30,
  houdbaarheid: 0,
  instructie: "",
};

export function ReceptStapMethodes() {
  const { formData, setStepData } = useStepWizard();
  const items: WizardMethode[] = formData.methodes?.items ?? [{ ...DEFAULT_METHODE }];
  const porties = formData.basis?.porties ?? 1;
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const updateItems = (newItems: WizardMethode[]) => {
    setStepData("methodes", { items: newItems });
  };

  const updateItem = (index: number, field: string, value: unknown) => {
    const next = items.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    updateItems(next);
  };

  const addMethode = () => {
    const newIndex = items.length;
    updateItems([...items, { ...DEFAULT_METHODE }]);
    setExpandedRows((prev) => new Set(prev).add(newIndex));
  };

  const removeMethode = (index: number) => {
    if (items.length <= 1) return;
    updateItems(items.filter((_, i) => i !== index));
  };

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="w-full overflow-auto rounded-2xl bg-card shadow-card">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_100px_80px_80px_40px] gap-1 px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Output</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duur</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Houdbaar</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {items.map((m, i) => (
          <div key={i} className="group">
            <div className="grid grid-cols-[32px_1fr_100px_80px_80px_40px] gap-1 items-center px-3 py-2.5 hover:bg-accent/40 transition-colors duration-150">
              {/* # */}
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{i + 1}</span>

              {/* Type */}
              <NestoSelect
                value={m.type}
                onValueChange={(v) => updateItem(i, "type", v)}
                options={METHODE_TYPES}
                size="sm"
              />

              {/* Output */}
              <div className="flex items-center gap-1">
                <NestoInput
                  type="number"
                  min={0}
                  value={m.outputHoeveelheid}
                  onChange={(e) => { const v = e.target.value; if (v === "") return; updateItem(i, "outputHoeveelheid", Number(v)); }}
                  className="h-7 text-xs w-12 tabular-nums"
                />
                <NestoSelect
                  value={m.outputEenheid}
                  onValueChange={(v) => updateItem(i, "outputEenheid", v)}
                  options={OUTPUT_EENHEID_OPTIONS}
                  size="sm"
                />
                </div>
                {(() => {
                  const portie = berekenPortieGrootte(m.outputHoeveelheid, m.outputEenheid, porties);
                  return portie && m.outputHoeveelheid > 0 ? (
                    <p className="text-[11px] text-muted-foreground col-span-full pl-8 -mt-1">
                      → 1 portie = {portie.display} ({m.outputHoeveelheid}{m.outputEenheid} ÷ {porties} porties)
                    </p>
                  ) : null;
                })()}

              {/* Duur */}
              <div className="flex items-center gap-1">
                <NestoInput
                  type="number"
                  min={0}
                  value={m.standaardDuur}
                  onChange={(e) => { const v = e.target.value; if (v === "") return; updateItem(i, "standaardDuur", Number(v)); }}
                  className="h-7 text-xs w-12 tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground">min</span>
              </div>

              {/* Houdbaar */}
              <div className="flex items-center gap-1">
                <NestoInput
                  type="number"
                  min={0}
                  value={m.houdbaarheid}
                  onChange={(e) => { const v = e.target.value; if (v === "") return; updateItem(i, "houdbaarheid", Number(v)); }}
                  className="h-7 text-xs w-12 tabular-nums"
                />
                <span className="text-[11px] text-muted-foreground">d</span>
              </div>

              {/* Delete */}
              <div className="flex items-center gap-1">
                {m.instructie || m.type !== "Bereiden" ? (
                  <button
                    onClick={() => toggleRow(i)}
                    className="p-1 rounded-md hover:bg-accent/60 transition-colors duration-150"
                  >
                    {expandedRows.has(i) ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                ) : null}
                {items.length > 1 && (
                  <button
                    onClick={() => removeMethode(i)}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all duration-150"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded instructie */}
            {expandedRows.has(i) && (
              <div className="px-3 pb-3 pt-1 pl-[44px]">
                <textarea
                  value={m.instructie}
                  onChange={(e) => updateItem(i, "instructie", e.target.value)}
                  placeholder="Beschrijf de stappen..."
                  className="w-full min-h-[60px] rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none resize-y"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={addMethode}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full min-h-[40px]"
        >
          Methode toevoegen
        </NestoButton>
      </div>
    </div>
  );
}
