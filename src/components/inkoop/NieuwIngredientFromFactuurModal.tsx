/**
 * NieuwIngredientFromFactuurModal — D.6b R3.5
 *
 * R3.5 wijzigingen:
 *   - Nieuwe leveringsinfo-card bovenaan (verpakking → basiseenheid)
 *   - Kostprijs is read-only (afgeleid uit factuur), met "Overschrijf" knop
 *   - Source of truth: prijs_per_basiseenheid (berekend door Nesto, niet AI)
 */
import * as React from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import type { NewIngredientPrefill } from "./IngredientMatchBadge";
import { Lock, AlertCircle } from "lucide-react";

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
  open: boolean;
  onClose: () => void;
  regelId: string | null;
  prefill: NewIngredientPrefill | null;
  leverancierId: string | null;
  leverancierNaam?: string | null;
}

const fmtPrice = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function NieuwIngredientFromFactuurModal({
  open,
  onClose,
  regelId,
  prefill,
  leverancierId,
  leverancierNaam,
}: Props) {
  const { createNewIngredientFromFactuur } = useFactuurMutations();

  const [naam, setNaam] = React.useState("");
  const [categorie, setCategorie] = React.useState("overig");
  const [eenheid, setEenheid] = React.useState("stuk");
  const [kostprijs, setKostprijs] = React.useState("");
  const [kostprijsOverridden, setKostprijsOverridden] = React.useState(false);
  const [minVoorraad, setMinVoorraad] = React.useState("");

  // Reset bij openen met nieuwe prefill
  React.useEffect(() => {
    if (open && prefill) {
      setNaam(prefill.naam);
      setEenheid(prefill.eenheid || "stuk");
      // R3.5 — gebruik berekende prijs per basiseenheid als bron
      const startPrijs = prefill.prijsPerBasiseenheid ?? prefill.kostprijs;
      setKostprijs(startPrijs != null ? String(startPrijs) : "");
      setKostprijsOverridden(false);
      setCategorie(prefill.categorie ?? "overig");
      setMinVoorraad("");
    }
  }, [open, prefill]);

  const canSave = naam.trim().length > 0 && categorie && eenheid && regelId;
  const berekendePrijs = prefill?.prijsPerBasiseenheid ?? null;
  const huidigePrijsNum = parseFloat(kostprijs);
  const wijktAf =
    kostprijsOverridden &&
    berekendePrijs != null &&
    !isNaN(huidigePrijsNum) &&
    Math.abs(huidigePrijsNum - berekendePrijs) > 0.0001;

  const heeftVerpakking =
    !!prefill?.verpakkingHoeveelheid && !!prefill?.verpakkingEenheid;

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
        // R3.5 — verpakking-data voor leveranciers_artikelen upsert
        verpakkingHoeveelheid: prefill.verpakkingHoeveelheid ?? null,
        verpakkingEenheid: prefill.verpakkingEenheid ?? null,
        prijsPerVerpakking: prefill.prijsPerVerpakking ?? null,
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
        <div className="px-5 py-6 space-y-5">
          <h2 ref={titleRef} className="text-h2 text-foreground mb-2">
            Nieuw ingrediënt
          </h2>

          {/* R3.5 — Leveringsinfo card */}
          <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Leveringsinfo van deze factuur
            </p>
            <InfoRow label="Leverancier" value={leverancierNaam ?? "Onbekend"} />
            {prefill?.artikelnummer && (
              <InfoRow
                label="Artikelnummer"
                value={<span className="font-mono">{prefill.artikelnummer}</span>}
              />
            )}
            {heeftVerpakking ? (
              <>
                <InfoRow
                  label="Verpakking"
                  value={`1 ${prefill?.verpakkingEenheid} = ${prefill?.verpakkingHoeveelheid} ${eenheid}`}
                />
                <InfoRow
                  label="Prijs"
                  value={`€${fmtPrice(prefill?.prijsPerVerpakking)} per ${prefill?.verpakkingEenheid}`}
                />
                <InfoRow
                  label={<span className="text-foreground">→ Berekend</span>}
                  value={
                    <span className="text-foreground font-semibold">
                      €{fmtPrice(prefill?.prijsPerBasiseenheid)} per {eenheid}
                    </span>
                  }
                />
              </>
            ) : (
              <div className="flex items-start gap-2 text-[11px] text-warning bg-warning/10 rounded-md px-2 py-1.5 mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Verpakking onbekend — prijs wordt als per basiseenheid behandeld.
                  Pas handmatig aan indien nodig.
                </span>
              </div>
            )}
          </div>

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
            label="Basiseenheid *"
            value={eenheid}
            onValueChange={setEenheid}
            options={EENHEID_OPTIONS}
          />

          {/* R3.5 — Kostprijs read-only met overschrijf */}
          <div>
            <label className="mb-2 block text-label text-muted-foreground">
              Kostprijs (per {eenheid})
            </label>
            <div className="flex">
              <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-l-[var(--radius-button)] border-[1.5px] border-r-0 border-border">
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
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {!kostprijsOverridden && berekendePrijs != null ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Berekend uit factuur
                </p>
              ) : wijktAf ? (
                <p className="text-[11px] text-warning flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Wijkt af van factuur (€{fmtPrice(berekendePrijs)})
                </p>
              ) : (
                <span />
              )}
              {berekendePrijs != null && (
                <button
                  type="button"
                  onClick={() => {
                    if (kostprijsOverridden) {
                      // reset naar berekend
                      setKostprijs(String(berekendePrijs));
                      setKostprijsOverridden(false);
                    } else {
                      setKostprijsOverridden(true);
                    }
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  {kostprijsOverridden ? "Reset naar berekend" : "Overschrijf"}
                </button>
              )}
            </div>
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
        </div>
      )}
    </NestoPanel>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
