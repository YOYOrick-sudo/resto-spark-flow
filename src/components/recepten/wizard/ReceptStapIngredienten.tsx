import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useIngredienten, IngredientRow } from "@/hooks/useIngredienten";
import { NestoBadge, NestoInput } from "@/components/polar";
import { NieuwIngredientModal } from "@/components/ingredienten/NieuwIngredientModal";
import { Search, Trash2 } from "lucide-react";

interface WizardIngredient {
  id: string;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  kostprijs: number | null;
  yield_percentage: number;
}

export function ReceptStapIngredienten() {
  const { formData, setStepData } = useStepWizard();
  const items: WizardIngredient[] = formData.ingredienten?.items ?? [];
  const porties = formData.basis?.porties ?? 1;

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
  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const existingIds = new Set(items.map((i) => i.id));
  const suggestions = (allIngredienten || []).filter(
    (i) => !existingIds.has(i.id) && i.naam.toLowerCase().includes(searchVal.toLowerCase())
  );

  const updateItems = (newItems: WizardIngredient[]) => {
    setStepData("ingredienten", { items: newItems });
  };

  const handleAdd = (ing: IngredientRow) => {
    updateItems([
      ...items,
      {
        id: ing.id,
        naam: ing.naam,
        hoeveelheid: 1,
        eenheid: ing.eenheid,
        kostprijs: ing.kostprijs,
        yield_percentage: ing.yield_percentage,
      },
    ]);
    setSearchVal("");
    setShowDropdown(false);
  };

  const handleRemove = (id: string) => {
    updateItems(items.filter((i) => i.id !== id));
  };

  const handleHoeveelheidChange = (id: string, val: number) => {
    updateItems(items.map((i) => (i.id === id ? { ...i, hoeveelheid: val } : i)));
  };

  // Calculations
  const calcRegelTotaal = (item: WizardIngredient) => {
    if (item.kostprijs == null) return null;
    const effectief = item.kostprijs / (item.yield_percentage / 100);
    return item.hoeveelheid * effectief;
  };

  const totaal = items.reduce((sum, i) => sum + (calcRegelTotaal(i) ?? 0), 0);
  const perPortie = porties > 0 ? totaal / porties : 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <NestoInput
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Zoek ingrediënt..."
            className="pl-10"
          />
        </div>
        {showDropdown && searchVal && (
          <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-dropdown shadow-lg max-h-48 overflow-y-auto">
            {suggestions.slice(0, 8).map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleAdd(ing)}
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

      {/* List */}
      <div className="space-y-1">
        {items.map((item) => {
          const regelTotaal = calcRegelTotaal(item);
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
            >
              <span className="flex-1 text-sm font-medium text-foreground truncate">
                {item.naam}
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={item.hoeveelheid}
                onChange={(e) => handleHoeveelheidChange(item.id, Number(e.target.value))}
                className="w-16 h-7 text-center text-sm border border-border rounded-md bg-card focus:!border-primary focus:outline-none"
              />
              <span className="text-xs text-muted-foreground w-8">{item.eenheid}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {regelTotaal != null ? `€${regelTotaal.toFixed(2)}` : ""}
              </span>
              {item.kostprijs == null && (
                <NestoBadge variant="warning" size="sm">Geen prijs</NestoBadge>
              )}
              <button
                onClick={() => handleRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="rounded-xl bg-muted/30 p-4 space-y-2 border border-border/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Totale ingrediëntkostprijs</span>
            <span className="font-medium text-foreground">€{totaal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kostprijs per portie</span>
            <span className="font-medium text-primary">€{perPortie.toFixed(2)}</span>
          </div>
        </div>
      )}

      <NieuwIngredientModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onCreated={() => {}}
      />
    </div>
  );
}
