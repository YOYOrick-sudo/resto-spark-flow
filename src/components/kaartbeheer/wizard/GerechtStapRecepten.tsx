import { useState } from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { NestoInput, NestoButton } from "@/components/polar";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { Plus, Trash2 } from "lucide-react";

interface LinkedRecept {
  id: string;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  kostprijs_per_portie: number;
  porties: number;
}

export function GerechtStapRecepten() {
  const { formData, setStepData } = useStepWizard();
  const items: LinkedRecept[] = formData.recepten?.items ?? [];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    id: string;
    naam: string;
    eenheid: string;
    kostprijs: number;
    porties: number;
  } | null>(null);
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const { data: results } = useHalffabricaatSearch(search);

  const updateItems = (newItems: LinkedRecept[]) => {
    setStepData("recepten", { items: newItems });
  };

  const handleAdd = () => {
    if (!selected) return;
    const newItem: LinkedRecept = {
      id: selected.id,
      naam: selected.naam,
      hoeveelheid: parseFloat(hoeveelheid) || 1,
      eenheid: selected.eenheid,
      kostprijs_per_portie: selected.kostprijs,
      porties: selected.porties,
    };
    updateItems([...items, newItem]);
    setSelected(null);
    setSearch("");
    setHoeveelheid("1");
  };

  const handleRemove = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const totalKostprijs = items.reduce(
    (sum, r) => sum + r.hoeveelheid * r.kostprijs_per_portie,
    0
  );

  const showDropdown = results !== undefined && search.trim().length >= 2;
  const hasResults = results && results.length > 0;

  return (
    <div className="space-y-4">
      {/* Linked recipes list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((r, i) => (
            <div
              key={`${r.id}-${i}`}
              className="flex items-center gap-3 py-3 px-4 rounded-xl border border-border/30 bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.naam}</p>
                <p className="text-xs text-muted-foreground">
                  {r.hoeveelheid} {r.eenheid} · €{(r.hoeveelheid * r.kostprijs_per_portie).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(i)}
                className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search & add */}
      {!selected ? (
        <div className="relative">
          <NestoInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek halffabricaat of recept..."
          />
          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {hasResults &&
                results!.map((r: any) => {
                  const alreadyAdded = items.some((it) => it.id === r.id);
                  const m = r.methodes?.[0];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={alreadyAdded}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 disabled:opacity-50"
                      onClick={() => {
                        setSelected({
                          id: r.id,
                          naam: r.naam,
                          eenheid: (m?.visuele_eenheid || m?.output_eenheid || "portie").replace(/^1\s+/, ''),
                          kostprijs: r.totale_kostprijs
                            ? r.totale_kostprijs / Math.max(r.porties ?? 1, 1)
                            : 0,
                          porties: r.porties ?? 1,
                        });
                        setSearch("");
                      }}
                    >
                      {r.naam}
                      <span className="text-muted-foreground"> · {r.categorie}</span>
                      {alreadyAdded && <span className="text-muted-foreground"> (al toegevoegd)</span>}
                    </button>
                  );
                })}
              {results && results.length === 0 && search.trim().length >= 2 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Geen resultaten. <a href="/recepten" target="_blank" className="text-primary hover:underline">Nieuw recept aanmaken →</a>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
          <p className="text-sm font-medium">{selected.naam}</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Hoeveelheid</label>
              <NestoInput
                type="number"
                step="0.1"
                value={hoeveelheid}
                onChange={(e) => setHoeveelheid(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground pb-2.5">{selected.eenheid}</span>
          </div>
          <div className="flex justify-end gap-2">
            <NestoButton variant="ghost" onClick={() => setSelected(null)}>
              Annuleren
            </NestoButton>
            <NestoButton onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Toevoegen
            </NestoButton>
          </div>
        </div>
      )}

      {/* Total cost */}
      {items.length > 0 && (
        <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-muted/30 text-sm">
          <span className="text-muted-foreground">Totale ingrediëntkostprijs</span>
          <span className="font-medium">€{totalKostprijs.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
