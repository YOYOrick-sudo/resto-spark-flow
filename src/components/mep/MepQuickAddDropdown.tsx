import { Loader2, Plus, ChevronRight } from "lucide-react";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";

export interface IngredientResult {
  id: string;
  naam: string;
  categorie: string;
  eenheid: string;
  kostprijs: number | null;
  voorraad: number | null;
}

interface MepQuickAddDropdownProps {
  search: string;
  halffabricaten: HalffabricaatSearchResult[];
  ingredienten: IngredientResult[];
  isLoading: boolean;
  isPending: boolean;
  onSelectHalffabricaat: (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => void;
  onSelectIngredient: (item: IngredientResult) => void;
  onAddFreeTask: () => void;
}

export function MepQuickAddDropdown({
  search,
  halffabricaten,
  ingredienten,
  isLoading,
  isPending,
  onSelectHalffabricaat,
  onSelectIngredient,
  onAddFreeTask,
}: MepQuickAddDropdownProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredIngredienten = ingredienten.filter(
    (ing) =>
      !halffabricaten.some((hf) =>
        hf.naam.toLowerCase().includes(ing.naam.toLowerCase())
      )
  );

  const hasResults = halffabricaten.length > 0 || filteredIngredienten.length > 0;

  return (
    <div>
      {halffabricaten.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Halffabricaten
          </p>
          {halffabricaten.map((item) => {
            const methodes = item.methodes ?? [];

            if (methodes.length <= 1) {
              const m = methodes[0];
              return (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
                  onClick={() => onSelectHalffabricaat(item, m)}
                  disabled={isPending}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.naam}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.categorie}
                      {m && (
                        <>
                          {" · "}
                          <span className="capitalize">{m.type}</span>
                          {" · "}
                          {m.visuele_eenheid}
                        </>
                      )}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            }

            return (
              <div key={item.id}>
                <div className="px-4 pt-3 pb-1 flex items-baseline gap-2">
                  <p className="text-sm font-medium text-foreground">{item.naam}</p>
                  <span className="text-[11px] text-muted-foreground">{item.categorie}</span>
                </div>
                {methodes.map((m) => (
                  <button
                    key={m.id}
                    className="w-full text-left pl-8 pr-4 py-2.5 hover:bg-accent/60 transition-colors flex items-center justify-between min-h-[40px] bg-muted/30"
                    onClick={() => onSelectHalffabricaat(item, m)}
                    disabled={isPending}
                  >
                    <div>
                      <p className="text-sm text-foreground capitalize">{m.type}</p>
                      {m.visuele_eenheid && (
                        <p className="text-xs text-muted-foreground">{m.visuele_eenheid}</p>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {filteredIngredienten.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Snel prep aanmaken
          </p>
          {filteredIngredienten.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
              onClick={() => onSelectIngredient(item)}
              disabled={isPending}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{item.naam}</p>
                <p className="text-xs text-muted-foreground">
                  {item.categorie ?? "Ingrediënt"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border">
        <button
          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-2 min-h-[44px]"
          onClick={onAddFreeTask}
          disabled={isPending}
        >
          <Plus className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm text-primary font-medium">
            "{search}" als vrije taak toevoegen
          </span>
        </button>
      </div>

      {!hasResults && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Geen halffabricaten of ingrediënten gevonden
        </p>
      )}
    </div>
  );
}
