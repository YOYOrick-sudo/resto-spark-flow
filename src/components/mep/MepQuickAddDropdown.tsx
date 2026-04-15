import { Loader2, Plus, ChevronRight, Star } from "lucide-react";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";
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
  isLoading: boolean;
  isPending: boolean;
  onSelectHalffabricaat: (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => void;
  onSelectIngredient: (item: IngredientResult) => void;
  onAddFreeTask: () => void;
  onAddFavoriet?: (input: {
    title: string;
    category: string;
    recept_id?: string | null;
    methode_id?: string | null;
  }) => void;
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
  onAddFavoriet,
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

  const handleFavClick = (e: React.MouseEvent, input: {
    title: string;
    category: string;
    recept_id?: string | null;
    methode_id?: string | null;
  }) => {
    e.stopPropagation();
    onAddFavoriet?.(input);
  };

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
              const title = m ? `${item.naam} ${m.type.toLowerCase()}` : item.naam;
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
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onAddFavoriet && (
                      <span
                        role="button"
                        onClick={(e) =>
                          handleFavClick(e, {
                            title,
                            category: item.categorie || "halffabricaat",
                            recept_id: item.id,
                            methode_id: m?.id,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-primary/10"
                      >
                        <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </span>
                    )}
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            }

            return (
              <div key={item.id}>
                <div className="px-4 pt-3 pb-1 flex items-baseline gap-2">
                  <p className="text-sm font-medium text-foreground">{item.naam}</p>
                  <span className="text-[11px] text-muted-foreground">{item.categorie}</span>
                </div>
                {methodes.map((m) => {
                  const title = `${item.naam} ${m.type.toLowerCase()}`;
                  return (
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
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {onAddFavoriet && (
                          <span
                            role="button"
                            onClick={(e) =>
                              handleFavClick(e, {
                                title,
                                category: item.categorie || "halffabricaat",
                                recept_id: item.id,
                                methode_id: m.id,
                              })
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-primary/10"
                          >
                            <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </span>
                        )}
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
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
          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px] group"
          onClick={onAddFreeTask}
          disabled={isPending}
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-medium">
              "{search}" als vrije taak toevoegen
            </span>
          </div>
          {onAddFavoriet && (
            <span
              role="button"
              onClick={(e) =>
                handleFavClick(e, {
                  title: search,
                  category: "Overig",
                })
              }
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm hover:bg-primary/10"
            >
              <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </span>
          )}
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
