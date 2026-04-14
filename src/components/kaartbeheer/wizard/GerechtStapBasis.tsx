import { useStepWizard } from "@/components/polar/StepWizard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NestoSelect } from "@/components/polar";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";

const DEFAULT_CATS = ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"];

export function GerechtStapBasis() {
  const { formData, setStepData } = useStepWizard();
  const { data: settings } = useKeukenSettings();

  const data = formData.basis ?? { naam: "", categorie: "Hoofdgerechten", omschrijving: "" };

  const cats = ((settings as any)?.gerecht_categorieen as string[] | undefined) ?? DEFAULT_CATS;
  const catOptions = cats.map((c) => ({ value: c, label: c }));

  const update = (partial: Partial<typeof data>) => {
    setStepData("basis", { ...data, ...partial });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Naam *</label>
        <Input
          value={data.naam}
          onChange={(e) => update({ naam: e.target.value })}
          placeholder="Bijv. Clubsandwich"
          className="h-12"
          autoFocus
        />
      </div>

      <NestoSelect
        label="Categorie *"
        value={data.categorie}
        onValueChange={(v) => update({ categorie: v })}
        options={catOptions}
      />

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Omschrijving <span className="text-muted-foreground font-normal">(optioneel)</span>
        </label>
        <Textarea
          value={data.omschrijving}
          onChange={(e) => update({ omschrijving: e.target.value })}
          placeholder="Korte beschrijving voor de menukaart"
          rows={3}
        />
      </div>
    </div>
  );
}
