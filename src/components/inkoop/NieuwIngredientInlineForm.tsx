/**
 * NieuwIngredientInlineForm — D.6b R4b-1
 *
 * Inline variant van NieuwIngredientFromFactuurModal: zelfde velden, zelfde
 * mutation, maar rendert binnen de regel-card i.p.v. als modal-dialog.
 * Gebruiker kan meerdere tegelijk openhebben, blijft scroll-context behouden.
 */
import * as React from "react";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import type { NewIngredientPrefill } from "./IngredientMatchBadge";
import { Lock, AlertCircle, X } from "lucide-react";

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
];

interface Props {
  regelId: string;
  prefill: NewIngredientPrefill;
  leverancierId: string | null;
  leverancierNaam?: string | null;
  onClose: () => void;
  onSuccess: (ingredientNaam: string) => void;
}

const fmtPrice = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function NieuwIngredientInlineForm({
  regelId,
  prefill,
  leverancierId,
  leverancierNaam,
  onClose,
  onSuccess,
}: Props) {
  const { createNewIngredientFromFactuur } = useFactuurMutations();

  const [naam, setNaam] = React.useState(prefill.naam);
  const [categorie, setCategorie] = React.useState(prefill.categorie ?? "overig");
  const [eenheid, setEenheid] = React.useState(prefill.eenheid || "stuk");
  const startPrijs = prefill.prijsPerBasiseenheid ?? prefill.kostprijs;
  const [kostprijs, setKostprijs] = React.useState(
    startPrijs != null ? String(startPrijs) : ""
  );
  const [kostprijsOverridden, setKostprijsOverridden] = React.useState(false);
  const [minVoorraad, setMinVoorraad] = React.useState("");

  const canSave = naam.trim().length > 0 && categorie && eenheid;
  const berekendePrijs = prefill.prijsPerBasiseenheid ?? null;
  const huidigePrijsNum = parseFloat(kostprijs);
  const wijktAf =
    kostprijsOverridden &&
    berekendePrijs != null &&
    !isNaN(huidigePrijsNum) &&
    Math.abs(huidigePrijsNum - berekendePrijs) > 0.0001;
  const heeftVerpakking =
    !!prefill.verpakkingHoeveelheid && !!prefill.verpakkingEenheid;

  const handleSave = () => {
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
        verpakkingHoeveelheid: prefill.verpakkingHoeveelheid ?? null,
        verpakkingEenheid: prefill.verpakkingEenheid ?? null,
        prijsPerVerpakking: prefill.prijsPerVerpakking ?? null,
      },
      { onSuccess: () => onSuccess(naam.trim()) }
    );
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Nieuw ingrediënt</p>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Sluiten"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Leveringsinfo */}
      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
          Leveringsinfo
        </p>
        <InfoRow label="Leverancier" value={leverancierNaam ?? "Onbekend"} />
        {prefill.artikelnummer && (
          <InfoRow
            label="Artikelnummer"
            value={<span className="font-mono">{prefill.artikelnummer}</span>}
          />
        )}
        {heeftVerpakking ? (
          <>
            <InfoRow
              label="Verpakking"
              value={`1 ${prefill.verpakkingEenheid} = ${prefill.verpakkingHoeveelheid} ${eenheid}`}
            />
            <InfoRow
              label="Prijs"
              value={`€${fmtPrice(prefill.prijsPerVerpakking)} per ${prefill.verpakkingEenheid}`}
            />
            <InfoRow
              label={<span className="text-foreground">→ Berekend</span>}
              value={
                <span className="text-foreground font-semibold">
                  €{fmtPrice(prefill.prijsPerBasiseenheid)} per {eenheid}
                </span>
              }
            />
          </>
        ) : (
          <div className="flex items-start gap-1.5 text-[10px] text-warning bg-warning/10 rounded px-2 py-1 mt-1">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>Verpakking onbekend — prijs als per basiseenheid behandeld.</span>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="space-y-2.5">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Naam *
          </label>
          <NestoInput
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bijv. Kipfilet"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NestoSelect
            label="Categorie *"
            value={categorie}
            onValueChange={setCategorie}
            options={CATEGORIE_OPTIONS}
          />
          <NestoSelect
            label="Basiseenheid *"
            value={eenheid}
            onValueChange={setEenheid}
            options={EENHEID_OPTIONS}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Kostprijs (per {eenheid})
          </label>
          <div className="flex">
            <span className="flex items-center px-2.5 bg-secondary text-muted-foreground text-xs rounded-l-[var(--radius-button)] border-[1.5px] border-r-0 border-border">
              €
            </span>
            <NestoInput
              type="number"
              step="0.0001"
              min={0}
              value={kostprijs}
              onChange={(e) => setKostprijs(e.target.value)}
              placeholder="0,00"
              className="rounded-l-none border-l-0"
              disabled={!kostprijsOverridden && berekendePrijs != null}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            {!kostprijsOverridden && berekendePrijs != null ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Berekend uit factuur
              </p>
            ) : wijktAf ? (
              <p className="text-[10px] text-warning flex items-center gap-1">
                <AlertCircle className="h-2.5 w-2.5" />
                Wijkt af (€{fmtPrice(berekendePrijs)})
              </p>
            ) : (
              <span />
            )}
            {berekendePrijs != null && (
              <button
                type="button"
                onClick={() => {
                  if (kostprijsOverridden) {
                    setKostprijs(String(berekendePrijs));
                    setKostprijsOverridden(false);
                  } else {
                    setKostprijsOverridden(true);
                  }
                }}
                className="text-[10px] text-primary hover:underline"
              >
                {kostprijsOverridden ? "Reset" : "Overschrijf"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <NestoButton variant="ghost" size="sm" onClick={onClose}>
          Annuleren
        </NestoButton>
        <NestoButton
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!canSave}
          isLoading={createNewIngredientFromFactuur.isPending}
        >
          Aanmaken & koppelen
        </NestoButton>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
