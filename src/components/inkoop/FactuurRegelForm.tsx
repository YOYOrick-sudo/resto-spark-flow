import { useState } from "react";
import { NestoButton } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { Trash2 } from "lucide-react";

interface Props {
  factuurId: string;
  onDone: () => void;
}

export function FactuurRegelForm({ factuurId, onDone }: Props) {
  const { addRegel } = useFactuurMutations();
  const [productNaam, setProductNaam] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("");
  const [eenheid, setEenheid] = useState("");
  const [prijsPerEenheid, setPrijsPerEenheid] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [ingredientNaam, setIngredientNaam] = useState("");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useIngredientSearch(search);

  const totaal =
    hoeveelheid && prijsPerEenheid
      ? (parseFloat(hoeveelheid) * parseFloat(prijsPerEenheid)).toFixed(2)
      : "";

  const handleSave = () => {
    if (!productNaam.trim()) return;
    addRegel.mutate(
      {
        factuur_id: factuurId,
        product_naam_herkend: productNaam.trim(),
        hoeveelheid: hoeveelheid ? parseFloat(hoeveelheid) : undefined,
        eenheid: eenheid || undefined,
        prijs_per_eenheid: prijsPerEenheid
          ? parseFloat(prijsPerEenheid)
          : undefined,
        totaal: totaal ? parseFloat(totaal) : undefined,
        ingredient_id: ingredientId || undefined,
        match_status: ingredientId ? "manual" : "unmatched",
      },
      { onSuccess: () => onDone() }
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Product naam *
        </label>
        <Input
          value={productNaam}
          onChange={(e) => setProductNaam(e.target.value)}
          className="h-9"
          placeholder="Zoals op de factuur"
        />
      </div>

      <div className="relative">
        <label className="text-xs text-muted-foreground mb-1 block">
          Koppel aan ingrediënt
        </label>
        {ingredientId ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-background text-sm">
            <span className="flex-1">{ingredientNaam}</span>
            <button
              type="button"
              onClick={() => {
                setIngredientId("");
                setIngredientNaam("");
              }}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Zoek ingrediënt..."
              className="h-9"
            />
            {showSuggestions && suggestions && suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                    onClick={() => {
                      setIngredientId(s.id);
                      setIngredientNaam(s.naam);
                      setShowSuggestions(false);
                      setSearch("");
                      if (!eenheid) setEenheid(s.eenheid);
                    }}
                  >
                    {s.naam}{" "}
                    <span className="text-muted-foreground">· {s.eenheid}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Aantal
          </label>
          <Input
            type="number"
            step="0.01"
            value={hoeveelheid}
            onChange={(e) => setHoeveelheid(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Eenheid
          </label>
          <Input
            value={eenheid}
            onChange={(e) => setEenheid(e.target.value)}
            className="h-9"
            placeholder="kg"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Prijs/eh
          </label>
          <Input
            type="number"
            step="0.01"
            value={prijsPerEenheid}
            onChange={(e) => setPrijsPerEenheid(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Totaal
          </label>
          <Input
            value={totaal ? `€${totaal}` : ""}
            readOnly
            className="h-9 bg-muted/30"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <NestoButton variant="ghost" size="sm" onClick={onDone}>
          Annuleren
        </NestoButton>
        <NestoButton
          size="sm"
          onClick={handleSave}
          disabled={!productNaam.trim()}
          isLoading={addRegel.isPending}
        >
          Toevoegen
        </NestoButton>
      </div>
    </div>
  );
}
