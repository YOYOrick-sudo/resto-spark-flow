import * as React from "react";
import { NestoModal, NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
  { value: "st", label: "st" },
];

const OPSLAG_OPTIONS = [
  { value: "koeling", label: "Koeling" },
  { value: "vriezer", label: "Vriezer" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

interface NieuwIngredientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function NieuwIngredientModal({ open, onOpenChange, onCreated }: NieuwIngredientModalProps) {
  const { createIngredient } = useIngredientMutations();
  const [naam, setNaam] = React.useState("");
  const [categorie, setCategorie] = React.useState("");
  const [eenheid, setEenheid] = React.useState("");
  const [yieldPct, setYieldPct] = React.useState(100);
  const [opslagType, setOpslagType] = React.useState("");
  const [opslagLocatie, setOpslagLocatie] = React.useState("");

  const resetForm = () => {
    setNaam("");
    setCategorie("");
    setEenheid("");
    setYieldPct(100);
    setOpslagType("");
    setOpslagLocatie("");
  };

  const canSave = naam.trim() && categorie && eenheid;

  const handleSave = () => {
    createIngredient.mutate(
      {
        naam: naam.trim(),
        categorie,
        eenheid,
        yield_percentage: yieldPct,
        opslag_type: opslagType || null,
        opslag_locatie: opslagLocatie || null,
      },
      {
        onSuccess: (id) => {
          resetForm();
          onOpenChange(false);
          onCreated(id);
        },
      }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
      title="Nieuw ingrediënt"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!canSave}
            loading={createIngredient.isPending}
          >
            Aanmaken
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Naam *</label>
          <NestoInput
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bijv. Kipfilet"
            autoFocus
          />
        </div>

        <NestoSelect
          label="Categorie *"
          value={categorie}
          onValueChange={setCategorie}
          options={CATEGORIE_OPTIONS}
          placeholder="Selecteer categorie"
        />

        <NestoSelect
          label="Eenheid *"
          value={eenheid}
          onValueChange={setEenheid}
          options={EENHEID_OPTIONS}
          placeholder="Selecteer eenheid"
        />

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-label text-muted-foreground">Yield percentage</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[220px] text-xs">
                  Hoeveel % van het ingekochte product is bruikbaar na schoonmaken/snijden
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex">
            <NestoInput
              type="number"
              min={1}
              max={100}
              value={yieldPct}
              onChange={(e) => setYieldPct(Number(e.target.value))}
              className="rounded-r-none border-r-0"
            />
            <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-r-[var(--radius-button)] border-[1.5px] border-l-0 border-border">
              %
            </span>
          </div>
        </div>

        <NestoSelect
          label="Opslag type"
          value={opslagType}
          onValueChange={setOpslagType}
          options={OPSLAG_OPTIONS}
          placeholder="Selecteer..."
        />

        <div>
          <label className="mb-2 block text-label text-muted-foreground">Opslag locatie</label>
          <NestoInput
            value={opslagLocatie}
            onChange={(e) => setOpslagLocatie(e.target.value)}
            placeholder="bijv. Koeling 2, Schap 3"
          />
        </div>
      </div>
    </NestoModal>
  );
}
