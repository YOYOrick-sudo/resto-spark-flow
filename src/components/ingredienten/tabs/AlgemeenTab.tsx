import * as React from "react";
import { NestoInput } from "@/components/polar";
import { NestoSelect } from "@/components/polar";
import { NestoButton } from "@/components/polar";
import { ConfirmDialog } from "@/components/polar";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import type { IngredientRow } from "@/hooks/useIngredienten";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Archive } from "lucide-react";

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

interface AlgemeenTabProps {
  ingredient: IngredientRow;
  onClose: () => void;
}

export function AlgemeenTab({ ingredient, onClose }: AlgemeenTabProps) {
  const { updateIngredient, archiveIngredient } = useIngredientMutations();
  const [naam, setNaam] = React.useState(ingredient.naam);
  const [categorie, setCategorie] = React.useState(ingredient.categorie);
  const [eenheid, setEenheid] = React.useState(ingredient.eenheid);
  const [yieldPct, setYieldPct] = React.useState(ingredient.yield_percentage);
  const [opslagType, setOpslagType] = React.useState(ingredient.opslag_type || "");
  const [opslagLocatie, setOpslagLocatie] = React.useState(ingredient.opslag_locatie || "");
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

  React.useEffect(() => {
    setNaam(ingredient.naam);
    setCategorie(ingredient.categorie);
    setEenheid(ingredient.eenheid);
    setYieldPct(ingredient.yield_percentage);
    setOpslagType(ingredient.opslag_type || "");
    setOpslagLocatie(ingredient.opslag_locatie || "");
  }, [ingredient]);

  const hasChanges =
    naam !== ingredient.naam ||
    categorie !== ingredient.categorie ||
    eenheid !== ingredient.eenheid ||
    yieldPct !== ingredient.yield_percentage ||
    opslagType !== (ingredient.opslag_type || "") ||
    opslagLocatie !== (ingredient.opslag_locatie || "");

  const handleSave = () => {
    updateIngredient.mutate({
      id: ingredient.id,
      naam,
      categorie,
      eenheid,
      yield_percentage: yieldPct,
      opslag_type: opslagType || null,
      opslag_locatie: opslagLocatie || null,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-label text-muted-foreground">Naam</label>
        <NestoInput value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <NestoSelect
        label="Categorie"
        value={categorie}
        onValueChange={setCategorie}
        options={CATEGORIE_OPTIONS}
      />

      <NestoSelect
        label="Eenheid"
        value={eenheid}
        onValueChange={setEenheid}
        options={EENHEID_OPTIONS}
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

      {hasChanges && (
        <NestoButton
          onClick={handleSave}
          loading={updateIngredient.isPending}
          className="w-full"
        >
          Opslaan
        </NestoButton>
      )}

      <div className="pt-4 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={() => setShowArchiveConfirm(true)}
          className="w-full text-muted-foreground"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archiveren
        </NestoButton>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Ingrediënt archiveren?"
        description="Het ingrediënt wordt verborgen uit het overzicht maar niet verwijderd."
        confirmLabel="Archiveren"
        variant="destructive"
        onConfirm={() => {
          archiveIngredient.mutate(ingredient.id, {
            onSuccess: () => onClose(),
          });
        }}
      />
    </div>
  );
}
