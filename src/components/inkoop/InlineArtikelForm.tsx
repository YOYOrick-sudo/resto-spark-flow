import { useState } from "react";
import { NestoButton } from "@/components/polar/NestoButton";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface Props {
  leverancierId: string;
  onDone: () => void;
}

export function InlineArtikelForm({ leverancierId, onDone }: Props) {
  const mutations = useVoorraadInkoopMutations();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useIngredientSearch(search);

  const [form, setForm] = useState({
    ingredient_id: "",
    ingredient_naam: "",
    artikel_naam: "",
    artikel_nummer: "",
    ean_code: "",
    verpakking_hoeveelheid: "",
    verpakking_eenheid: "",
    prijs_per_verpakking: "",
  });

  const handleSave = () => {
    if (!form.ingredient_id || !form.artikel_naam) return;
    mutations.createArtikel.mutate(
      {
        leverancier_id: leverancierId,
        ingredient_id: form.ingredient_id,
        artikel_naam: form.artikel_naam,
        artikel_nummer: form.artikel_nummer || undefined,
        ean_code: form.ean_code || undefined,
        verpakking_hoeveelheid: form.verpakking_hoeveelheid ? Number(form.verpakking_hoeveelheid) : undefined,
        verpakking_eenheid: form.verpakking_eenheid || undefined,
        prijs_per_verpakking: form.prijs_per_verpakking ? Number(form.prijs_per_verpakking) : undefined,
      },
      {
        onSuccess: () => {
          setForm({ ingredient_id: "", ingredient_naam: "", artikel_naam: "", artikel_nummer: "", ean_code: "", verpakking_hoeveelheid: "", verpakking_eenheid: "", prijs_per_verpakking: "" });
          setSearch("");
          onDone();
        },
      }
    );
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <label className="text-xs text-muted-foreground mb-1 block">Ingrediënt *</label>
        {form.ingredient_id ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-background text-sm">
            <span className="flex-1">{form.ingredient_naam}</span>
            <button type="button" onClick={() => setForm((f) => ({ ...f, ingredient_id: "", ingredient_naam: "" }))}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }} placeholder="Zoek ingrediënt..." className="h-9" />
            {showSuggestions && suggestions && suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
                {suggestions.map((s) => (
                  <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                    onClick={() => {
                      setForm((f) => ({ ...f, ingredient_id: s.id, ingredient_naam: s.naam, artikel_naam: f.artikel_naam || s.naam }));
                      setShowSuggestions(false);
                      setSearch("");
                    }}
                  >{s.naam}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Artikel naam *</label>
        <Input value={form.artikel_naam} onChange={(e) => setForm((f) => ({ ...f, artikel_naam: e.target.value }))} className="h-9" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Artikelnr.</label>
          <Input value={form.artikel_nummer} onChange={(e) => setForm((f) => ({ ...f, artikel_nummer: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">EAN</label>
          <Input value={form.ean_code} onChange={(e) => setForm((f) => ({ ...f, ean_code: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Verpakking</label>
          <Input type="number" value={form.verpakking_hoeveelheid} onChange={(e) => setForm((f) => ({ ...f, verpakking_hoeveelheid: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Eenheid</label>
          <Input value={form.verpakking_eenheid} onChange={(e) => setForm((f) => ({ ...f, verpakking_eenheid: e.target.value }))} className="h-9" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Prijs per verpakking</label>
          <Input type="number" step="0.01" value={form.prijs_per_verpakking} onChange={(e) => setForm((f) => ({ ...f, prijs_per_verpakking: e.target.value }))} className="h-9" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <NestoButton variant="ghost" size="sm" onClick={onDone}>Annuleren</NestoButton>
        <NestoButton size="sm" onClick={handleSave} disabled={!form.ingredient_id || !form.artikel_naam} isLoading={mutations.createArtikel.isPending}>
          Opslaan
        </NestoButton>
      </div>
    </div>
  );
}
