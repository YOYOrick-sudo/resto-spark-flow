/**
 * NieuwIngredientFromFactuurModal — D.6b R3
 *
 * Aparte modal voor inline-creation vanuit factuur-context.
 * Verschillen met algemene NieuwIngredientModal:
 *   - Prefill uit factuurregel (naam, eenheid, kostprijs)
 *   - Auto-koppelt regel + slaat alias op
 *   - Bewuste minimale velden — categorie verplicht (DB NOT NULL)
 *
 * NB: hergebruikt NIET de bestaande NieuwIngredientModal omdat die
 * via useIngredientMutations werkt en geen factuur-koppeling kent.
 */
import * as React from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import type { NewIngredientPrefill } from "./IngredientMatchBadge";

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
  { value: "stuk", label: "stuk" },
  { value: "doos", label: "doos" },
  { value: "pak", label: "pak" },
  { value: "fles", label: "fles" },
  { value: "bos", label: "bos" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  regelId: string | null;
  prefill: NewIngredientPrefill | null;
  leverancierId: string | null;
}

export function NieuwIngredientFromFactuurModal({
  open,
  onClose,
  regelId,
  prefill,
  leverancierId,
}: Props) {
  const { createNewIngredientFromFactuur } = useFactuurMutations();

  const [naam, setNaam] = React.useState("");
  const [categorie, setCategorie] = React.useState("overig");
  const [eenheid, setEenheid] = React.useState("stuk");
  const [kostprijs, setKostprijs] = React.useState("");
  const [minVoorraad, setMinVoorraad] = React.useState("");

  // Reset bij openen met nieuwe prefill
  React.useEffect(() => {
    if (open && prefill) {
      setNaam(prefill.naam);
      setEenheid(prefill.eenheid || "stuk");
      setKostprijs(prefill.kostprijs?.toString() ?? "");
      setCategorie("overig");
      setMinVoorraad("");
    }
  }, [open, prefill]);

  const canSave = naam.trim().length > 0 && categorie && eenheid && regelId;

  const handleSave = () => {
    if (!regelId || !prefill) return;
    createNewIngredientFromFactuur.mutate(
      {
        regelId,
        naam: naam.trim(),
        categorie,
        eenheid,
        kostprijs: kostprijs ? parseFloat(kostprijs) : undefined,
        min_voorraad: minVoorraad ? parseFloat(minVoorraad) : undefined,
        aliasNaam: prefill.aliasNaam,
        leverancierId,
        artikelnummer: prefill.artikelnummer ?? null,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title="Nieuw ingrediënt vanuit factuur"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <NestoButton variant="outline" onClick={onClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!canSave}
            isLoading={createNewIngredientFromFactuur.isPending}
          >
            Aanmaken & koppelen
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6 space-y-4">
          <h2 ref={titleRef} className="text-h2 text-foreground mb-2">
            Nieuw ingrediënt
          </h2>
          <p className="text-xs text-muted-foreground">
            Prefilled vanuit factuurregel. Pas aan waar nodig — alias en kostprijs
            worden automatisch opgeslagen voor toekomstige facturen.
          </p>

          <div>
            <label className="mb-2 block text-label text-muted-foreground">
              Naam *
            </label>
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
          />

          <NestoSelect
            label="Eenheid *"
            value={eenheid}
            onValueChange={setEenheid}
            options={EENHEID_OPTIONS}
          />

          <div>
            <label className="mb-2 block text-label text-muted-foreground">
              Kostprijs per eenheid
            </label>
            <div className="flex">
              <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-l-[var(--radius-button)] border-[1.5px] border-r-0 border-border">
                €
              </span>
              <NestoInput
                type="number"
                step="0.001"
                min={0}
                value={kostprijs}
                onChange={(e) => setKostprijs(e.target.value)}
                placeholder="0,00"
                className="rounded-l-none border-l-0"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Wordt overgenomen uit factuurregel. Bron: factuur.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-label text-muted-foreground">
              Min. voorraad (optioneel)
            </label>
            <NestoInput
              type="number"
              step="0.01"
              min={0}
              value={minVoorraad}
              onChange={(e) => setMinVoorraad(e.target.value)}
              placeholder="0"
            />
          </div>

          {prefill?.artikelnummer && (
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              Artikelnummer <span className="font-mono">{prefill.artikelnummer}</span>{" "}
              wordt opgeslagen als alias.
            </div>
          )}
        </div>
      )}
    </NestoPanel>
  );
}
