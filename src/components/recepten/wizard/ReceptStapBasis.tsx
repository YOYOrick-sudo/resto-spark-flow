import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { NestoInput, NestoSelect } from "@/components/polar";

const CATEGORIE_OPTIONS = [
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];

export function ReceptStapBasis() {
  const { formData, setStepData } = useStepWizard();
  const data = formData.basis || {
    naam: "",
    categorie: "",
    porties: 4,
    actieve_bereidingstijd: "",
    passieve_bereidingstijd: "",
  };

  const update = (field: string, value: unknown) => {
    setStepData("basis", { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-label text-muted-foreground">Naam *</label>
        <NestoInput
          value={data.naam}
          onChange={(e) => update("naam", e.target.value)}
          placeholder="Bijv. Tomatensoep"
          autoFocus
        />
      </div>

      <NestoSelect
        label="Categorie *"
        value={data.categorie}
        onValueChange={(v) => update("categorie", v)}
        options={CATEGORIE_OPTIONS}
        placeholder="Selecteer categorie"
      />

      <div>
        <label className="mb-2 block text-label text-muted-foreground">Porties</label>
        <NestoInput
          type="number"
          min={1}
          value={data.porties}
          onChange={(e) => update("porties", Number(e.target.value) || 1)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Hoeveel porties haal je uit één volledige bereiding? De portiegrootte (gram per portie) wordt automatisch berekend zodra je in stap 4 de totale output invult.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Actieve bereidingstijd (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={data.actieve_bereidingstijd}
            onChange={(e) => update("actieve_bereidingstijd", e.target.value)}
            placeholder="Bijv. 30"
          />
        </div>
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Passieve bereidingstijd (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={data.passieve_bereidingstijd}
            onChange={(e) => update("passieve_bereidingstijd", e.target.value)}
            placeholder="Bijv. 60"
          />
        </div>
      </div>
    </div>
  );
}
