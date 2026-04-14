import { useState } from "react";
import { NestoButton, NestoBadge } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import type { GerechtDetail, GerechtComponent } from "@/hooks/useGerechtDetail";
import { Plus, Trash2 } from "lucide-react";

function ComponentRow({ comp, onRemove }: { comp: GerechtComponent; onRemove: () => void }) {
  const isHf = comp.type === "halffabricaat";
  const naam = isHf ? comp.recept_naam : comp.ingredient_naam;
  const kostprijs = isHf
    ? comp.hoeveelheid * ((comp.recept_totale_kostprijs ?? 0) / Math.max(comp.recept_porties ?? 1, 1))
    : comp.hoeveelheid * (comp.ingredient_kostprijs ?? 0);

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-border/30 bg-muted/20 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{naam ?? "Onbekend"}</p>
        <p className="text-xs text-muted-foreground">
          {comp.hoeveelheid} {comp.eenheid} · €{kostprijs.toFixed(2)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddHalffabricaat({ gerechtId }: { gerechtId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const { data: results } = useHalffabricaatSearch(search);
  const { addComponent } = useGerechtMutations();

  if (!open) {
    return (
      <NestoButton variant="ghost" size="sm" onClick={() => setOpen(true)} className="min-h-[44px]">
        <Plus className="h-3.5 w-3.5 mr-1" /> Halffabricaat toevoegen
      </NestoButton>
    );
  }

  const handleAdd = () => {
    if (!selected) return;
    addComponent.mutate(
      {
        gerecht_id: gerechtId,
        type: "halffabricaat",
        recept_id: selected.id,
        hoeveelheid: parseFloat(hoeveelheid) || 1,
        eenheid: selected.eenheid,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(null);
          setSearch("");
          setHoeveelheid("1");
        },
      }
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
      {!selected ? (
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek halffabricaat..."
            className="h-11"
            autoFocus
          />
          {results && results.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
              {results.map((r: any) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                  onClick={() => {
                    const m = r.methodes?.[0];
                    setSelected({
                      id: r.id,
                      naam: r.naam,
                      eenheid: m?.visuele_eenheid || m?.output_eenheid || "portie",
                    });
                  }}
                >
                  {r.naam} <span className="text-muted-foreground">· {r.categorie}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium">{selected.naam}</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Hoeveelheid</label>
              <Input type="number" step="0.1" value={hoeveelheid} onChange={(e) => setHoeveelheid(e.target.value)} className="h-11" />
            </div>
            <span className="text-sm text-muted-foreground pb-3">{selected.eenheid}</span>
          </div>
          <div className="flex justify-end gap-2">
            <NestoButton variant="ghost" size="sm" onClick={() => { setOpen(false); setSelected(null); }} className="min-h-[44px]">
              Annuleren
            </NestoButton>
            <NestoButton size="sm" onClick={handleAdd} isLoading={addComponent.isPending} className="min-h-[44px]">
              Toevoegen
            </NestoButton>
          </div>
        </>
      )}
    </div>
  );
}

function AddIngredient({ gerechtId }: { gerechtId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [eenheid, setEenheid] = useState("");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const { data: results } = useIngredientSearch(search);
  const { addComponent } = useGerechtMutations();

  if (!open) {
    return (
      <NestoButton variant="ghost" size="sm" onClick={() => setOpen(true)} className="min-h-[44px]">
        <Plus className="h-3.5 w-3.5 mr-1" /> Ingrediënt toevoegen
      </NestoButton>
    );
  }

  const handleAdd = () => {
    if (!selected) return;
    addComponent.mutate(
      {
        gerecht_id: gerechtId,
        type: "ingredient",
        ingredient_id: selected.id,
        hoeveelheid: parseFloat(hoeveelheid) || 1,
        eenheid: eenheid || selected.eenheid,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(null);
          setSearch("");
          setHoeveelheid("1");
          setEenheid("");
        },
      }
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
      {!selected ? (
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek ingrediënt..."
            className="h-11"
            autoFocus
          />
          {results && results.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                  onClick={() => {
                    setSelected({ id: r.id, naam: r.naam, eenheid: r.eenheid });
                    setEenheid(r.eenheid);
                  }}
                >
                  {r.naam} <span className="text-muted-foreground">· {r.eenheid}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium">{selected.naam}</p>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hoeveelheid</label>
              <Input type="number" step="0.01" value={hoeveelheid} onChange={(e) => setHoeveelheid(e.target.value)} className="h-11 w-24" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Eenheid</label>
              <Input value={eenheid} onChange={(e) => setEenheid(e.target.value)} className="h-11 w-20" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <NestoButton variant="ghost" size="sm" onClick={() => { setOpen(false); setSelected(null); }} className="min-h-[44px]">
              Annuleren
            </NestoButton>
            <NestoButton size="sm" onClick={handleAdd} isLoading={addComponent.isPending} className="min-h-[44px]">
              Toevoegen
            </NestoButton>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  gerecht: GerechtDetail;
}

export function GerechtComponentenTab({ gerecht }: Props) {
  const { removeComponent } = useGerechtMutations();

  const halffabricaten = gerecht.componenten.filter((c) => c.type === "halffabricaat");
  const ingredienten = gerecht.componenten.filter((c) => c.type === "ingredient");

  const totaalHf = halffabricaten.reduce((s, c) => {
    return s + c.hoeveelheid * ((c.recept_totale_kostprijs ?? 0) / Math.max(c.recept_porties ?? 1, 1));
  }, 0);
  const totaalIng = ingredienten.reduce((s, c) => {
    return s + c.hoeveelheid * (c.ingredient_kostprijs ?? 0);
  }, 0);
  const totaalKostprijs = totaalHf + totaalIng;
  const vkp = gerecht.verkoopprijs ?? 0;
  const marge = vkp > 0 ? ((vkp - totaalKostprijs) / vkp) * 100 : null;
  const foodCost = vkp > 0 ? (totaalKostprijs / vkp) * 100 : null;

  const foodCostVariant =
    foodCost !== null ? (foodCost < 30 ? "success" : foodCost <= 35 ? "warning" : "error") : "default";
  const margeVariant =
    marge !== null ? (marge > 65 ? "success" : marge >= 55 ? "warning" : "error") : "default";

  return (
    <div className="space-y-6">
      {/* Halffabricaten */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Halffabricaten ({halffabricaten.length})
        </h3>
        <div className="space-y-2 mb-3">
          {halffabricaten.map((c) => (
            <ComponentRow key={c.id} comp={c} onRemove={() => removeComponent.mutate(c.id)} />
          ))}
        </div>
        <AddHalffabricaat gerechtId={gerecht.id} />
      </div>

      {/* Ingrediënten */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ingrediënten ({ingredienten.length})
        </h3>
        <div className="space-y-2 mb-3">
          {ingredienten.map((c) => (
            <ComponentRow key={c.id} comp={c} onRemove={() => removeComponent.mutate(c.id)} />
          ))}
        </div>
        <AddIngredient gerechtId={gerecht.id} />
      </div>

      {/* Kostprijs samenvatting */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Kostprijs samenvatting
        </h3>
        <div className="grid grid-cols-2 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Halffabricaten</span>
          <span className="text-right">€{totaalHf.toFixed(2)}</span>
          <span className="text-muted-foreground">Ingrediënten</span>
          <span className="text-right">€{totaalIng.toFixed(2)}</span>
          <span className="font-semibold pt-1 border-t border-border/50">Totale kostprijs</span>
          <span className="font-semibold text-right pt-1 border-t border-border/50">€{totaalKostprijs.toFixed(2)}</span>
          <span className="text-muted-foreground">Verkoopprijs</span>
          <span className="text-right">{vkp > 0 ? `€${vkp.toFixed(2)}` : "—"}</span>
          <span className="text-muted-foreground">Marge</span>
          <span className="text-right">
            {marge !== null ? (
              <NestoBadge variant={margeVariant} size="sm">
                {marge.toFixed(1)}%
              </NestoBadge>
            ) : (
              "—"
            )}
          </span>
          <span className="text-muted-foreground">Food cost</span>
          <span className="text-right">
            {foodCost !== null ? (
              <NestoBadge variant={foodCostVariant} size="sm">
                {foodCost.toFixed(1)}%
              </NestoBadge>
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
