import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Plus, Trash2 } from "lucide-react";

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

  const updateItems = (newItems: WizardMethode[]) => {
    setStepData("methodes", { items: newItems });
  };

  const updateItem = (index: number, field: string, value: unknown) => {
    const next = items.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    updateItems(next);
  };

  const addMethode = () => {
    updateItems([...items, { ...DEFAULT_METHODE }]);
  };

  const removeMethode = (index: number) => {
    if (items.length <= 1) return;
    updateItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((m, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <NestoSelect
              value={m.type}
              onValueChange={(v) => updateItem(i, "type", v)}
              options={METHODE_TYPES}
              size="sm"
            />
            {items.length > 1 && (
              <button
                onClick={() => removeMethode(i)}
                className="p-2 rounded-md hover:bg-destructive/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Visuele eenheid</label>
              <NestoInput
                value={m.visueleEenheid}
                onChange={(e) => updateItem(i, "visueleEenheid", e.target.value)}
                placeholder="bijv. bak, fles"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Duur (min)</label>
              <NestoInput
                type="number"
                min={0}
                value={m.standaardDuur}
                onChange={(e) => updateItem(i, "standaardDuur", Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Output</label>
              <NestoInput
                type="number"
                min={0}
                value={m.outputHoeveelheid}
                onChange={(e) => updateItem(i, "outputHoeveelheid", Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Eenheid</label>
              <NestoSelect
                value={m.outputEenheid}
                onValueChange={(v) => updateItem(i, "outputEenheid", v)}
                options={OUTPUT_EENHEID_OPTIONS}
                size="sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Houdbaar (dagen)</label>
              <NestoInput
                type="number"
                min={0}
                value={m.houdbaarheid}
                onChange={(e) => updateItem(i, "houdbaarheid", Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      ))}

      <NestoButton
        variant="outline"
        onClick={addMethode}
        leftIcon={<Plus className="h-4 w-4" />}
        className="w-full min-h-[48px]"
      >
        Methode toevoegen
      </NestoButton>
    </div>
  );
}
