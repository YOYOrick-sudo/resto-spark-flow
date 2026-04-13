import { useState } from "react";
import { NestoPanel, NestoButton } from "@/components/polar";
import { useLeverancierDetail } from "@/hooks/useLeverancierDetail";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { Spinner } from "@/components/polar";

interface Props {
  leverancierId: string | null;
  onClose: () => void;
}

export function LeverancierDetailPanel({ leverancierId, onClose }: Props) {
  const { data: lev, isLoading } = useLeverancierDetail(leverancierId);
  const mutations = useVoorraadInkoopMutations();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useIngredientSearch(search);

  // New article form
  const [newArtikel, setNewArtikel] = useState({
    ingredient_id: "",
    ingredient_naam: "",
    artikel_naam: "",
    artikel_nummer: "",
    ean_code: "",
    verpakking_hoeveelheid: "",
    verpakking_eenheid: "",
    prijs_per_verpakking: "",
  });

  const resetNewArtikel = () => {
    setNewArtikel({
      ingredient_id: "", ingredient_naam: "", artikel_naam: "",
      artikel_nummer: "", ean_code: "", verpakking_hoeveelheid: "",
      verpakking_eenheid: "", prijs_per_verpakking: "",
    });
    setSearch("");
    setAddOpen(false);
  };

  const handleAddArtikel = () => {
    if (!leverancierId || !newArtikel.ingredient_id || !newArtikel.artikel_naam) return;
    mutations.createArtikel.mutate(
      {
        leverancier_id: leverancierId,
        ingredient_id: newArtikel.ingredient_id,
        artikel_naam: newArtikel.artikel_naam,
        artikel_nummer: newArtikel.artikel_nummer || undefined,
        ean_code: newArtikel.ean_code || undefined,
        verpakking_hoeveelheid: newArtikel.verpakking_hoeveelheid ? Number(newArtikel.verpakking_hoeveelheid) : undefined,
        verpakking_eenheid: newArtikel.verpakking_eenheid || undefined,
        prijs_per_verpakking: newArtikel.prijs_per_verpakking ? Number(newArtikel.prijs_per_verpakking) : undefined,
      },
      { onSuccess: resetNewArtikel }
    );
  };

  if (!leverancierId) return null;

  return (
    <NestoPanel open={!!leverancierId} onClose={onClose} title="Leverancier">
      {(titleRef) =>
        isLoading || !lev ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="px-5 py-6 space-y-6">
            <h2 ref={titleRef} className="text-xl font-semibold">{lev.naam}</h2>

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {lev.type && <div><span className="text-muted-foreground">Type</span><p className="font-medium">{lev.type}</p></div>}
              {lev.contactpersoon && <div><span className="text-muted-foreground">Contact</span><p className="font-medium">{lev.contactpersoon}</p></div>}
              {lev.email && <div><span className="text-muted-foreground">Email</span><p className="font-medium">{lev.email}</p></div>}
              {lev.telefoon && <div><span className="text-muted-foreground">Telefoon</span><p className="font-medium">{lev.telefoon}</p></div>}
            </div>

            {/* Artikelen */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Artikelen ({(lev.leveranciers_artikelen as any[])?.length ?? 0})
                </h3>
                <NestoButton variant="ghost" size="sm" onClick={() => setAddOpen(!addOpen)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
                </NestoButton>
              </div>

              {/* Add form */}
              {addOpen && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mb-3 space-y-3">
                  <div className="relative">
                    <label className="text-xs text-muted-foreground mb-1 block">Ingrediënt</label>
                    {newArtikel.ingredient_id ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-button border border-input bg-background text-sm">
                        <span className="flex-1">{newArtikel.ingredient_naam}</span>
                        <button type="button" onClick={() => setNewArtikel(a => ({ ...a, ingredient_id: "", ingredient_naam: "" }))}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Input value={search} onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }} placeholder="Zoek..." className="h-9" />
                        {showSuggestions && suggestions && suggestions.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
                            {suggestions.map(s => (
                              <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                                onClick={() => {
                                  setNewArtikel(a => ({ ...a, ingredient_id: s.id, ingredient_naam: s.naam, artikel_naam: a.artikel_naam || s.naam }));
                                  setShowSuggestions(false); setSearch("");
                                }}
                              >{s.naam}</button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Artikel naam</label>
                    <Input value={newArtikel.artikel_naam} onChange={(e) => setNewArtikel(a => ({ ...a, artikel_naam: e.target.value }))} className="h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Artikelnr.</label>
                      <Input value={newArtikel.artikel_nummer} onChange={(e) => setNewArtikel(a => ({ ...a, artikel_nummer: e.target.value }))} className="h-9" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">EAN</label>
                      <Input value={newArtikel.ean_code} onChange={(e) => setNewArtikel(a => ({ ...a, ean_code: e.target.value }))} className="h-9" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Verpakking</label>
                      <Input type="number" value={newArtikel.verpakking_hoeveelheid} onChange={(e) => setNewArtikel(a => ({ ...a, verpakking_hoeveelheid: e.target.value }))} className="h-9" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Eenheid</label>
                      <Input value={newArtikel.verpakking_eenheid} onChange={(e) => setNewArtikel(a => ({ ...a, verpakking_eenheid: e.target.value }))} className="h-9" /></div>
                    <div className="col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Prijs per verpakking</label>
                      <Input type="number" step="0.01" value={newArtikel.prijs_per_verpakking} onChange={(e) => setNewArtikel(a => ({ ...a, prijs_per_verpakking: e.target.value }))} className="h-9" /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <NestoButton variant="ghost" size="sm" onClick={resetNewArtikel}>Annuleren</NestoButton>
                    <NestoButton size="sm" onClick={handleAddArtikel}
                      disabled={!newArtikel.ingredient_id || !newArtikel.artikel_naam}
                      isLoading={mutations.createArtikel.isPending}>Opslaan</NestoButton>
                  </div>
                </div>
              )}

              {/* Articles list */}
              <div className="space-y-2">
                {(lev.leveranciers_artikelen as any[])?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.artikel_naam}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.ingredienten?.naam} · {a.artikel_nummer ?? "Geen nr."} ·{" "}
                        {a.verpakking_hoeveelheid ? `${a.verpakking_hoeveelheid} ${a.verpakking_eenheid ?? ""}` : "-"} ·{" "}
                        {a.prijs_per_verpakking != null ? `€${a.prijs_per_verpakking.toFixed(2)}` : "-"}
                      </p>
                    </div>
                    <button
                      onClick={() => mutations.deleteArtikel.mutate(a.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-error transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(!lev.leveranciers_artikelen || (lev.leveranciers_artikelen as any[]).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nog geen artikelen gekoppeld.</p>
                )}
              </div>
            </div>
          </div>
        )
      }
    </NestoPanel>
  );
}
