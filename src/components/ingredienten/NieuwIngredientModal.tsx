/**
 * Quick-create modal voor ingrediënten.
 * Gebruikt vanuit recepten/gerechten wizards voor inline creation.
 * Voor het volledige aanmaakproces: zie IngredientenNieuw wizard.
 */
import * as React from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
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
  const [kostprijs, setKostprijs] = React.useState("");
  const [btwPercentage, setBtwPercentage] = React.useState("9");
  const [yieldPct, setYieldPct] = React.useState(100);
  const [opslagType, setOpslagType] = React.useState("");
  const [opslagLocatie, setOpslagLocatie] = React.useState("");

  const resetForm = () => {
    setNaam("");
    setCategorie("");
    setEenheid("");
    setKostprijs("");
    setBtwPercentage("9");
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
        btw_percentage: Number(btwPercentage),
        opslag_type: opslagType || null,
        opslag_locatie: opslagLocatie || null,
        ...(kostprijs
          ? {
              kostprijs: Number(kostprijs),
              kostprijs_bron: "handmatig",
              kostprijs_laatst_bijgewerkt: new Date().toISOString(),
            }
          : {}),
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

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <NestoPanel
      open={open}
      onClose={handleClose}
      title="Ingrediënt · Nieuw"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <NestoButton variant="outline" onClick={handleClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!canSave}
            isLoading={createIngredient.isPending}
          >
            Aanmaken
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6">
          <h2 ref={titleRef} className="text-h2 text-foreground mb-6">
            Nieuw ingrediënt
          </h2>

          {/* Sectie: Basis */}
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
          </div>

          {/* Sectie: Prijs & BTW */}
          <div className="border-t border-border/50 pt-4 mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Prijs & BTW</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-label text-muted-foreground">Kostprijs per eenheid</label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-l-[var(--radius-button)] border-[1.5px] border-r-0 border-border">
                    €
                  </span>
                  <NestoInput
                    type="number"
                    step="0.01"
                    min={0}
                    value={kostprijs}
                    onChange={(e) => setKostprijs(e.target.value)}
                    placeholder="bijv. 8.50"
                    className="rounded-l-none border-l-0"
                  />
                </div>
              </div>

              <NestoSelect
                label="BTW percentage"
                value={btwPercentage}
                onValueChange={setBtwPercentage}
                options={[
                  { value: "9", label: "9%" },
                  { value: "21", label: "21%" },
                  { value: "0", label: "0%" },
                ]}
              />
            </div>
          </div>

          {/* Sectie: Verwerking & Opslag */}
          <div className="border-t border-border/50 pt-4 mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Verwerking & Opslag</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-label text-muted-foreground">Bruikbaar percentage</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </button>
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
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
