import { useState, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoNumericInput } from "@/components/polar/NestoNumericInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { PREP_HANDELINGEN, getPrepDefaults } from "@/utils/prepDefaults";
import { useSnellePrep } from "@/hooks/useSnellePrep";
import type { IngredientResult } from "./MepQuickAddDropdown";

interface SnellePrepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: IngredientResult;
  taskDate: string;
}

export function SnellePrepModal({ open, onOpenChange, ingredient, taskDate }: SnellePrepModalProps) {
  const [handeling, setHandeling] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState(1);
  const [eenheid, setEenheid] = useState(ingredient.eenheid || "kg");
  const [yieldPct, setYieldPct] = useState(100);
  const [duur, setDuur] = useState(10);

  const snellePrep = useSnellePrep();

  const handleHandelingChange = (val: string) => {
    setHandeling(val);
    const defaults = getPrepDefaults(val);
    setYieldPct(defaults.defaultYield);
    setDuur(defaults.defaultDuur);
  };

  const preview = useMemo(() => {
    if (!handeling) return null;
    const naam = ingredient.naam;
    const outputHoeveelheid = hoeveelheid * (yieldPct / 100);
    const kostprijsPerEenheid = ingredient.kostprijs
      ? ingredient.kostprijs / (yieldPct / 100)
      : null;
    return { naam, outputHoeveelheid, kostprijsPerEenheid };
  }, [handeling, hoeveelheid, yieldPct, ingredient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handeling) return;
    snellePrep.mutate(
      {
        ingredientId: ingredient.id,
        ingredientNaam: ingredient.naam,
        handeling,
        hoeveelheid,
        eenheid,
        yieldPercentage: yieldPct,
        duurMinuten: duur,
        taskDate,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handelingOptions = PREP_HANDELINGEN.map(h => ({
    value: h.type,
    label: h.type,
  }));

  const eenheidOptions = ["kg", "g", "L", "ml", "stuk"].map(e => ({
    value: e,
    label: e,
  }));

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Snelle prep"
      description={ingredient.naam}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NestoSelect
          label="Handeling"
          placeholder="Kies handeling..."
          value={handeling}
          onValueChange={handleHandelingChange}
          options={handelingOptions}
        />

        <div className="grid grid-cols-2 gap-4">
          <NestoNumericInput
            label="Hoeveelheid"
            min={0.1}
            step={0.1}
            value={hoeveelheid}
            onValueChange={(v) => setHoeveelheid(v ?? 0.1)}
            allowEmpty={false}
            fallback={0.1}
          />
          <NestoSelect
            label="Eenheid"
            value={eenheid}
            onValueChange={setEenheid}
            options={eenheidOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NestoNumericInput
            label="Bruikbaar %"
            min={1}
            max={100}
            integer
            value={yieldPct}
            onValueChange={(v) => setYieldPct(v ?? 100)}
            allowEmpty={false}
            fallback={100}
          />
          <NestoNumericInput
            label="Duur (min)"
            min={1}
            integer
            value={duur}
            onValueChange={(v) => setDuur(v ?? 1)}
            allowEmpty={false}
            fallback={1}
          />
        </div>

        {preview && (
          <div className="border-t border-border/50 pt-4 mt-4 space-y-1">
            <p className="text-sm text-foreground flex items-center gap-2">
              → <span className="font-medium">{preview.naam}</span>
              {handeling && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {handeling}
                </span>
              )}
            </p>
            {preview.kostprijsPerEenheid != null && (
              <p className="text-xs text-muted-foreground">
                → Kostprijs: €{preview.kostprijsPerEenheid.toFixed(2)}/{eenheid}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              → Output: {preview.outputHoeveelheid.toFixed(2)} {eenheid}
            </p>
            {ingredient.voorraad != null && (
              <p className="text-xs text-muted-foreground">
                → Voorraad: {ingredient.voorraad} {ingredient.eenheid} beschikbaar
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <NestoButton variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={!handeling || snellePrep.isPending}>
            {snellePrep.isPending ? "Aanmaken..." : "Aanmaken + op MEP zetten"}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
