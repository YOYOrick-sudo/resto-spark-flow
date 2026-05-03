import * as React from "react";
import { ReceptDetail, ReceptIngredientRow } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { useIngredienten, IngredientRow } from "@/hooks/useIngredienten";
import { NestoButton, NestoInput, NestoBadge } from "@/components/polar";
import { NieuwIngredientModal } from "@/components/ingredienten/NieuwIngredientModal";
import { Search, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface IngredintenTabProps {
  recept: ReceptDetail;
}

export function IngredintenTab({ recept }: IngredintenTabProps) {
  const { addIngredient, removeIngredient, updateIngredientHoeveelheid, recalculateKostprijs } =
    useReceptMutations();
  const { data: allIngredienten } = useIngredienten({
    search: "",
    categorie: "",
    voorraadStatus: "",
    leverancierId: "",
    showArchived: false,
  });
  const [searchVal, setSearchVal] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [arbeid, setArbeid] = React.useState(recept.arbeidskostprijs);
  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setArbeid(recept.arbeidskostprijs);
  }, [recept.arbeidskostprijs]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const existingIds = new Set(recept.recept_ingredienten.map((ri) => ri.ingredient_id));
  const suggestions = (allIngredienten || []).filter(
    (i) =>
      !existingIds.has(i.id) &&
      i.naam.toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleAddIngredient = (ingredient: IngredientRow) => {
    addIngredient.mutate({
      receptId: recept.id,
      ingredientId: ingredient.id,
      hoeveelheid: 1,
      eenheid: ingredient.eenheid,
      sortOrder: recept.recept_ingredienten.length,
    });
    setSearchVal("");
    setShowDropdown(false);
  };

  // Cost calculations
  const calcRegelTotaal = (ri: ReceptIngredientRow) => {
    const kostprijs = ri.ingredienten?.kostprijs;
    const yieldPct = ri.ingredienten?.yield_percentage ?? 100;
    if (kostprijs == null) return null;
    const effectief = kostprijs / (yieldPct / 100);
    return ri.hoeveelheid * effectief;
  };

  const totaleIngredientkostprijs = recept.recept_ingredienten.reduce((sum, ri) => {
    const t = calcRegelTotaal(ri);
    return sum + (t ?? 0);
  }, 0);

  const totaleKostprijs = totaleIngredientkostprijs + arbeid;

  const handleArbeidBlur = () => {
    if (arbeid !== recept.arbeidskostprijs) {
      recalculateKostprijs.mutate({
        receptId: recept.id,
        totaleIngredientkostprijs,
        arbeidskostprijs: arbeid,
      });
    }
  };

  // Recalc on ingredient changes
  React.useEffect(() => {
    const currentCalc = recept.recept_ingredienten.reduce((sum, ri) => {
      const t = calcRegelTotaal(ri);
      return sum + (t ?? 0);
    }, 0);
    if (Math.abs(currentCalc - recept.totale_ingredientkostprijs) > 0.01) {
      recalculateKostprijs.mutate({
        receptId: recept.id,
        totaleIngredientkostprijs: currentCalc,
        arbeidskostprijs: recept.arbeidskostprijs,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recept.recept_ingredienten.length]);

  return (
    <div className="space-y-4">
      {/* Search & add */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Zoek ingrediënt..."
            className="w-full h-10 pl-10 pr-4 rounded-button border-[1.5px] border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none"
          />
        </div>
        {showDropdown && searchVal && (
          <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-dropdown shadow-lg max-h-48 overflow-y-auto">
            {suggestions.slice(0, 8).map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleAddIngredient(ing)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
              >
                <span className="font-medium text-foreground">{ing.naam}</span>
                <span className="text-xs text-muted-foreground">{ing.eenheid}</span>
              </button>
            ))}
            {suggestions.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Geen resultaten.{" "}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowNewModal(true);
                  }}
                  className="text-primary hover:underline"
                >
                  Nieuw ingrediënt aanmaken
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingredient list */}
      <div className="space-y-1">
        {recept.recept_ingredienten
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ri) => {
            const regelTotaal = calcRegelTotaal(ri);
            return (
              <div
                key={ri.id}
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {ri.ingredienten?.naam ?? "—"}
                </span>
                <HoeveelheidInput
                  id={ri.id}
                  receptId={recept.id}
                  value={ri.hoeveelheid}
                  onSave={(val) =>
                    updateIngredientHoeveelheid.mutate({ id: ri.id, hoeveelheid: val })
                  }
                />
                <span className="text-xs text-muted-foreground w-8">{ri.eenheid}</span>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {regelTotaal != null ? `€${regelTotaal.toFixed(2)}` : ""}
                </span>
                {ri.ingredienten?.kostprijs == null && (
                  <NestoBadge variant="warning" size="sm">
                    Geen prijs
                  </NestoBadge>
                )}
                <button
                  onClick={() =>
                    removeIngredient.mutate({ id: ri.id, receptId: recept.id })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            );
          })}
      </div>

      {/* Financial summary */}
      <div className="rounded-xl bg-muted/30 p-4 space-y-2 border border-border/50">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ingrediëntkostprijs</span>
          <span className="font-medium text-foreground">€{totaleIngredientkostprijs.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Arbeidskostprijs</span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">€</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={arbeid}
              onChange={(e) => setArbeid(Number(e.target.value))}
              onBlur={handleArbeidBlur}
              className="w-20 h-7 text-right text-sm border border-border rounded-md bg-card px-2 focus:!border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
          <span className="font-medium text-foreground">Totale kostprijs</span>
          <span className="font-semibold text-foreground">€{totaleKostprijs.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Kostprijs per portie</span>
          <span className="font-medium text-primary">€{kostprijsPerPortie.toFixed(2)}</span>
        </div>
      </div>

      <NieuwIngredientModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onCreated={() => {}}
      />
    </div>
  );
}

// Inline editable hoeveelheid
function HoeveelheidInput({
  id,
  receptId,
  value,
  onSave,
}: {
  id: string;
  receptId: string;
  value: number;
  onSave: (val: number) => void;
}) {
  const [val, setVal] = React.useState(value);
  React.useEffect(() => setVal(value), [value]);

  return (
    <input
      type="number"
      min={0}
      step={0.01}
      value={val}
      onChange={(e) => setVal(Number(e.target.value))}
      onBlur={() => val !== value && val > 0 && onSave(val)}
      className="w-16 h-7 text-center text-sm border border-border rounded-md bg-card focus:!border-primary focus:outline-none"
    />
  );
}
