import { Loader2, Plus, ChevronRight, Trash2 } from "lucide-react";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";
import type { MepFavoriet } from "@/hooks/useMepFavorieten";
import { cn } from "@/lib/utils";

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
  favorieten: MepFavoriet[];
  isLoading: boolean;
  isPending: boolean;
  onSelectHalffabricaat: (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => void;
  onSelectIngredient: (item: IngredientResult) => void;
  onAddFreeTask: () => void;
  onSelectFavoriet: (fav: MepFavoriet) => void;
  onRemoveFavoriet: (id: string) => void;
}

export function MepQuickAddDropdown({
  search,
  halffabricaten,
  ingredienten,
  favorieten,
  isLoading,
  isPending,
  onSelectHalffabricaat,
  onSelectIngredient,
  onAddFreeTask,
  onSelectFavoriet,
  onRemoveFavoriet,
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

  // Filter favorieten that match search
  const matchingFavorieten = favorieten.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  const hasResults =
    halffabricaten.length > 0 ||
    filteredIngredienten.length > 0 ||
    matchingFavorieten.length > 0;

  return (
    <div>
      {/* Recent / Favorieten section */}
      {matchingFavorieten.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Recent
          </p>
          {matchingFavorieten.map((fav) => (
            <button
              key={fav.id}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px] group"
              onClick={() => onSelectFavoriet(fav)}
              disabled={isPending}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{fav.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fav.category}
                  {fav.methode && (
                    <>
                      {" · "}<span className="capitalize">{fav.methode.type}</span>
                      {fav.methode.visuele_eenheid && <>{" · "}{fav.methode.visuele_eenheid}</>}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavoriet(fav.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Halffabricaten section */}
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
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px] group"
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
                  <Plus className="h-4 w-4 text-muted-foreground" />
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
                    className="w-full text-left pl-8 pr-4 py-2.5 hover:bg-accent/60 transition-colors flex items-center justify-between min-h-[40px] bg-muted/30 group"
                    onClick={() => onSelectHalffabricaat(item, m)}
                    disabled={isPending}
                  >
                    <div>
                      <p className="text-sm text-foreground capitalize">{m.type}</p>
                      {m.visuele_eenheid && (
                        <p className="text-xs text-muted-foreground">{m.visuele_eenheid}</p>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Ingrediënten section */}
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

      {/* Free task option */}
      <div className="border-t border-border">
        <button
          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
          onClick={onAddFreeTask}
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-medium">
              "{search}" als vrije taak toevoegen
            </span>
          </div>
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
