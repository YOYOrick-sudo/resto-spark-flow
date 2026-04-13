import { useState, useMemo } from "react";
import { NestoButton, NestoSelect } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { Trash2 } from "lucide-react";

const categorieOptions = [
  { value: "bederf", label: "Bederf" },
  { value: "overproductie", label: "Overproductie" },
  { value: "bereidingsfout", label: "Bereidingsfout" },
  { value: "schilafval", label: "Schilafval" },
  { value: "retour", label: "Retour" },
  { value: "overig", label: "Overig" },
];

export function WasteRegistreerForm() {
  const [search, setSearch] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [hoeveelheid, setHoeveelheid] = useState("");
  const [categorie, setCategorie] = useState("bederf");
  const [reden, setReden] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suggestions } = useIngredientSearch(search);
  const mutations = useVoorraadInkoopMutations();

  const geschatteKosten = useMemo(() => {
    if (!selectedIngredient?.kostprijs || !hoeveelheid) return null;
    return Number(hoeveelheid) * selectedIngredient.kostprijs;
  }, [selectedIngredient, hoeveelheid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !hoeveelheid || !categorie) return;

    mutations.createWasteRegistratie.mutate(
      {
        ingredient_id: selectedIngredient.id,
        hoeveelheid: Number(hoeveelheid),
        eenheid: selectedIngredient.eenheid,
        categorie,
        reden: reden || undefined,
        geschatte_kosten: geschatteKosten ?? undefined,
      },
      {
        onSuccess: () => {
          setSearch("");
          setSelectedIngredient(null);
          setHoeveelheid("");
          setCategorie("bederf");
          setReden("");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card shadow-card p-5 space-y-4 max-w-xl">
      {/* Ingredient zoeken */}
      <div className="relative">
        <label className="text-sm text-muted-foreground mb-1 block">Ingrediënt</label>
        {selectedIngredient ? (
          <div className="flex items-center gap-2 rounded-button border border-input bg-background px-3 h-10">
            <span className="flex-1 text-sm">{selectedIngredient.naam}</span>
            <button
              type="button"
              onClick={() => { setSelectedIngredient(null); setSearch(""); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Zoek ingrediënt..."
            />
            {showSuggestions && suggestions && suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors min-h-[44px]"
                    onClick={() => {
                      setSelectedIngredient(s);
                      setSearch(s.naam);
                      setShowSuggestions(false);
                    }}
                  >
                    {s.naam} <span className="text-muted-foreground">({s.eenheid})</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Hoeveelheid */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground mb-1 block">Hoeveelheid</label>
          <div className="flex">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={hoeveelheid}
              onChange={(e) => setHoeveelheid(e.target.value)}
              className="rounded-r-none border-r-0"
              placeholder="0"
            />
            <span className="flex items-center px-3 bg-secondary border border-input border-l-0 rounded-r-button text-sm text-muted-foreground">
              {selectedIngredient?.eenheid ?? "eenheid"}
            </span>
          </div>
        </div>
      </div>

      {/* Categorie */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Categorie</label>
        <NestoSelect
          options={categorieOptions}
          value={categorie}
          onValueChange={setCategorie}
          placeholder="Selecteer categorie"
        />
      </div>

      {/* Reden */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Reden (optioneel)</label>
        <Textarea
          value={reden}
          onChange={(e) => setReden(e.target.value)}
          placeholder="Omschrijf de reden..."
          rows={2}
        />
      </div>

      {/* Geschatte kosten */}
      {geschatteKosten != null && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-xl text-sm">
          <span className="text-muted-foreground">Geschatte kosten</span>
          <span className="font-medium tabular-nums">€{geschatteKosten.toFixed(2)}</span>
        </div>
      )}

      <NestoButton
        type="submit"
        isLoading={mutations.createWasteRegistratie.isPending}
        disabled={!selectedIngredient || !hoeveelheid || !categorie}
        className="w-full min-h-[44px]"
      >
        Registreren
      </NestoButton>
    </form>
  );
}
