import * as React from "react";
import { NestoInput, NestoSelect } from "@/components/polar";
import { useStepWizard } from "@/components/polar/StepWizard";

const CATEGORIE_OPTIONS = [
  { value: "groenten", label: "Groenten" },
  { value: "vlees", label: "Vlees" },
  { value: "vis", label: "Vis" },
  { value: "zuivel", label: "Zuivel" },
  { value: "kruiden", label: "Kruiden & Specerijen" },
  { value: "olie", label: "Olie & Vetten" },
  { value: "droog", label: "Droog & Conserven" },
  { value: "dranken", label: "Dranken" },
  { value: "overig", label: "Overig" },
];

const EENHEID_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "st", label: "st" },
];

const OPSLAG_OPTIONS = [
  { value: "koeling", label: "Koeling" },
  { value: "vriezer", label: "Vriezer" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

const STEP_ID = "basis";

export function IngredientStapBasis() {
  const { formData, setStepData } = useStepWizard();
  const data = formData[STEP_ID] ?? {};

  const update = (field: string, value: string) => {
    setStepData(STEP_ID, { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-label text-muted-foreground">Naam *</label>
        <NestoInput
          value={data.naam ?? ""}
          onChange={(e) => update("naam", e.target.value)}
          placeholder="Bijv. Knoflook"
          autoFocus
        />
      </div>

      <NestoSelect
        label="Categorie *"
        value={data.categorie ?? ""}
        onValueChange={(v) => update("categorie", v)}
        options={CATEGORIE_OPTIONS}
        placeholder="Selecteer categorie"
      />

      <NestoSelect
        label="Eenheid *"
        value={data.eenheid ?? ""}
        onValueChange={(v) => update("eenheid", v)}
        options={EENHEID_OPTIONS}
        placeholder="Selecteer eenheid"
      />

      <NestoSelect
        label="Opslag type"
        value={data.opslag_type ?? ""}
        onValueChange={(v) => update("opslag_type", v)}
        options={OPSLAG_OPTIONS}
        placeholder="Selecteer..."
      />
    </div>
  );
}
