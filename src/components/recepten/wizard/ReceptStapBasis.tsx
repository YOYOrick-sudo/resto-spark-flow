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

interface ReceptStapBasisProps {
  onTypeChange?: (type: string) => void;
}

export function ReceptStapBasis({ onTypeChange }: ReceptStapBasisProps) {
  const { formData, setStepData } = useStepWizard();
  const data = formData.basis || {
    naam: "",
    type: "halffabricaat",
    categorie: "",
    porties: 4,
    actieve_bereidingstijd: "",
    passieve_bereidingstijd: "",
  };

  const update = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setStepData("basis", next);

    if (field === "type") {
      onTypeChange?.(value as string);
      // Clear methodes data when switching to gerecht
      if (value === "gerecht") {
        setStepData("methodes", null);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Naam *</label>
        <NestoInput
          value={data.naam}
          onChange={(e) => update("naam", e.target.value)}
          placeholder="Bijv. Tomatensoep"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {["halffabricaat", "gerecht"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update("type", t)}
              className={`flex-1 min-h-[48px] text-sm font-medium transition-colors ${
                data.type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {t === "halffabricaat" ? "Halffabricaat" : "Gerecht"}
            </button>
          ))}
        </div>
      </div>

      <NestoSelect
        label="Categorie *"
        value={data.categorie}
        onValueChange={(v) => update("categorie", v)}
        options={CATEGORIE_OPTIONS}
        placeholder="Selecteer categorie"
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Porties</label>
        <NestoInput
          type="number"
          min={1}
          value={data.porties}
          onChange={(e) => update("porties", Number(e.target.value) || 1)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Actieve bereidingstijd (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={data.actieve_bereidingstijd}
            onChange={(e) => update("actieve_bereidingstijd", e.target.value)}
            placeholder="Bijv. 30"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Passieve bereidingstijd (min)</label>
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
