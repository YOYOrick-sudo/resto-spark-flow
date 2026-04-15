import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NestoButton, NestoBadge } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";
import type { GerechtDetail, GerechtComponent } from "@/hooks/useGerechtDetail";
import { Plus, Trash2, Info } from "lucide-react";
import { AllergeenPills, type AllergeenPillData } from "@/components/polar/AllergeenPills";
import { useComponentenAllergenen } from "@/hooks/useComponentenAllergenen";

function ComponentRow({ comp, onRemove, allergenen }: { comp: GerechtComponent; onRemove: () => void; allergenen?: AllergeenPillData[] }) {
  const isHf = comp.type === "halffabricaat";
  const naam = isHf ? comp.recept_naam : comp.ingredient_naam;
  const kostprijs = isHf
    ? comp.hoeveelheid * ((comp.recept_totale_kostprijs ?? 0) / Math.max(comp.recept_porties ?? 1, 1))
    : comp.hoeveelheid * (comp.ingredient_kostprijs ?? 0);

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-border/30 bg-muted/20 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{naam ?? "Onbekend"}</p>
          {allergenen && allergenen.length > 0 && (
             <div className="flex items-center gap-1">
               {allergenen.filter(a => a.status === "bevat" || a.status === "kan_bevatten").slice(0, 2).map(a => (
                 <NestoBadge key={a.allergeen_id} variant="default" size="sm">{a.code}</NestoBadge>
               ))}
               {allergenen.filter(a => a.status === "bevat" || a.status === "kan_bevatten").length > 2 && (
                 <NestoBadge variant="default" size="sm">+{allergenen.filter(a => a.status === "bevat" || a.status === "kan_bevatten").length - 2}</NestoBadge>
               )}
             </div>
           )}
        </div>
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

function AddHalffabricaat({ gerechtId, emptyState }: { gerechtId: string; emptyState?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: results } = useHalffabricaatSearch(search);
  const { addComponent } = useGerechtMutations();
  const { currentLocation } = useUserContext();
  const navigate = useNavigate();

  if (!open) {
    return (
      <NestoButton variant={emptyState ? "outline" : "ghost"} size="sm" onClick={() => setOpen(true)} className="min-h-[44px]">
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

  const handleCreate = async () => {
    if (!currentLocation?.id || !search.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("recepten")
        .insert({
          naam: search.trim(),
          type: "halffabricaat",
          categorie: "Overig",
          location_id: currentLocation.id,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      nestoToast.success("Halffabricaat aangemaakt", "Vul het halffabricaat verder in op de halffabricaten pagina.");
      navigate(`/recepten?open=${(data as any).id}`);
    } catch {
      nestoToast.error("Fout bij aanmaken");
    } finally {
      setCreating(false);
    }
  };

  const showDropdown = results !== undefined && search.trim().length >= 2;
  const hasResults = results && results.length > 0;
  const noResults = results && results.length === 0 && search.trim().length >= 2;

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
          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
              {hasResults && results.map((r: any) => (
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
              {noResults && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/50 min-h-[44px] flex items-center gap-2"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  <Plus className="h-3.5 w-3.5" />
                  "{search.trim()}" aanmaken als nieuw halffabricaat
                </button>
              )}
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

function AddIngredient({ gerechtId, emptyState }: { gerechtId: string; emptyState?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [eenheid, setEenheid] = useState("");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: results } = useIngredientSearch(search);
  const { addComponent } = useGerechtMutations();
  const { currentLocation } = useUserContext();

  if (!open) {
    return (
      <NestoButton variant={emptyState ? "outline" : "ghost"} size="sm" onClick={() => setOpen(true)} className="min-h-[44px]">
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

  const handleCreate = async () => {
    if (!currentLocation?.id || !search.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("ingredienten")
        .insert({
          naam: search.trim(),
          eenheid: "kg",
          kostprijs: 0,
          location_id: currentLocation.id,
        } as any)
        .select("id, naam, eenheid")
        .single();
      if (error) throw error;
      nestoToast.success("Ingrediënt aangemaakt");
      setSelected({ id: (data as any).id, naam: (data as any).naam, eenheid: (data as any).eenheid });
      setEenheid((data as any).eenheid);
    } catch {
      nestoToast.error("Fout bij aanmaken");
    } finally {
      setCreating(false);
    }
  };

  const showDropdown = results !== undefined && search.trim().length >= 2;
  const hasResults = results && results.length > 0;
  const noResults = results && results.length === 0 && search.trim().length >= 2;

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
          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
              {hasResults && results.map((r) => (
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
              {noResults && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/50 min-h-[44px] flex items-center gap-2"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nieuw ingrediënt "{search.trim()}" aanmaken
                </button>
              )}
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
  const { data: allergeenData } = useComponentenAllergenen(gerecht.componenten);

  const halffabricaten = gerecht.componenten.filter((c) => c.type === "halffabricaat");
  const ingredienten = gerecht.componenten.filter((c) => c.type === "ingredient");

  const STATUS_LABELS: Record<string, { label: string; variant: "error" | "warning" | "default" }> = {
    bevat: { label: "Bevat", variant: "error" },
    kan_bevatten: { label: "Kan bevatten", variant: "warning" },
  };

  return (
    <div className="space-y-6">
      {/* Halffabricaten */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Halffabricaten ({halffabricaten.length})
        </h3>
        {halffabricaten.length === 0 ? (
          <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-muted/10">
            <p className="text-sm text-muted-foreground mb-4">
              Nog geen halffabricaten. Voeg een halffabricaat toe om de kostprijs te berekenen.
            </p>
            <AddHalffabricaat gerechtId={gerecht.id} emptyState />
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {halffabricaten.map((c) => (
                <ComponentRow key={c.id} comp={c} onRemove={() => removeComponent.mutate(c.id)} allergenen={allergeenData?.perComponent.get(c.id)} />
              ))}
            </div>
            <AddHalffabricaat gerechtId={gerecht.id} />
          </>
        )}
      </div>

      {/* Ingrediënten */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ingrediënten ({ingredienten.length})
        </h3>
        {ingredienten.length === 0 ? (
          <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center bg-muted/10">
            <p className="text-sm text-muted-foreground mb-4">
              Nog geen losse ingrediënten.
            </p>
            <AddIngredient gerechtId={gerecht.id} emptyState />
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {ingredienten.map((c) => (
                <ComponentRow key={c.id} comp={c} onRemove={() => removeComponent.mutate(c.id)} allergenen={allergeenData?.perComponent.get(c.id)} />
              ))}
            </div>
            <AddIngredient gerechtId={gerecht.id} />
          </>
        )}
      </div>

      {/* Allergenen samenvatting */}
      {allergeenData && allergeenData.summary.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Allergenen
          </h3>
          <div className="flex flex-wrap gap-2">
             {allergeenData.summary.map((a) => {
               if (a.status === "bevat") {
                 return (
                   <NestoBadge key={a.allergeen_id} variant="error" size="sm">
                     {a.naam_nl ?? a.code}
                   </NestoBadge>
                 );
               }
               if (a.status === "kan_bevatten") {
                 return (
                   <NestoBadge key={a.allergeen_id} variant="warning" size="sm">
                     Kan bevatten: {a.naam_nl ?? a.code}
                   </NestoBadge>
                 );
               }
               return null;
             })}
           </div>
        </div>
      )}
    </div>
  );
}
