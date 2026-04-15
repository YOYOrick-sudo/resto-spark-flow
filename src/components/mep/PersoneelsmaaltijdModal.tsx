import { useState, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useGerechtSearch } from "@/hooks/useGerechtSearch";
import { useWasteMutation, type WasteInput } from "@/hooks/useWasteMutation";
import { getPortieVoorPersonen } from "@/utils/portieDefaults";
import { nestoToast } from "@/lib/nestoToast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PersoneelsmaaltijdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ItemType = "ingrediënt" | "halffabricaat" | "gerecht";

interface BreakdownIngredient {
  naam: string;
  eenheid: string;
  hoeveelheidPerPortie: number;
}

interface MealItem {
  id: string;
  type: ItemType;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  kostprijs: number | null;
  receptId?: string;
  gerechtId?: string;
  ingredientId?: string;
  isAuto?: boolean;
  breakdown?: BreakdownIngredient[];
  breakdownLoading?: boolean;
}

export function PersoneelsmaaltijdModal({ open, onOpenChange }: PersoneelsmaaltijdModalProps) {
  const [aantalPersonen, setAantalPersonen] = useState(1);
  const [items, setItems] = useState<MealItem[]>([]);

  // Search states for each section
  const [searchMain, setSearchMain] = useState("");
  const [searchGerecht, setSearchGerecht] = useState("");
  const [searchSchatting, setSearchSchatting] = useState("");

  // Collapsed sections
  const [gerechtOpen, setGerechtOpen] = useState(false);
  const [schattingOpen, setSchattingOpen] = useState(false);

  // Search queries
  const { data: hfResults = [] } = useHalffabricaatSearch(searchMain);
  const { data: igResultsMain = [] } = useIngredientSearch(searchMain);
  const { data: gerechtResults = [] } = useGerechtSearch(searchGerecht);
  const { data: igResultsSchatting = [] } = useIngredientSearch(searchSchatting);

  const wasteMutation = useWasteMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showMainDropdown = searchMain.trim().length >= 2;
  const showGerechtDropdown = searchGerecht.trim().length >= 2;
  const showSchattingDropdown = searchSchatting.trim().length >= 2;

  // Add halffabricaat
  const addHalffabricaat = (hf: typeof hfResults[0]) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "halffabricaat",
        naam: hf.naam,
        hoeveelheid: 1,
        eenheid: "portie",
        kostprijs: null,
        receptId: hf.id,
      },
    ]);
    setSearchMain("");
  };

  // Add ingredient (manual section)
  const addIngredientManual = (ig: typeof igResultsMain[0]) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "ingrediënt",
        naam: ig.naam,
        hoeveelheid: 1,
        eenheid: ig.eenheid,
        kostprijs: ig.kostprijs ?? null,
        ingredientId: ig.id,
      },
    ]);
    setSearchMain("");
  };

  // Add gerecht
  const addGerecht = async (g: typeof gerechtResults[0]) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "gerecht",
        naam: g.naam,
        hoeveelheid: aantalPersonen,
        eenheid: "portie",
        kostprijs: null,
        gerechtId: g.id,
      },
    ]);
    setSearchGerecht("");
  };

  // Add ingredient (estimation section — auto portion)
  const addIngredientSchatting = (ig: typeof igResultsSchatting[0]) => {
    const portie = getPortieVoorPersonen(ig.categorie, aantalPersonen);
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "ingrediënt",
        naam: ig.naam,
        hoeveelheid: portie.hoeveelheid,
        eenheid: portie.eenheid,
        kostprijs: ig.kostprijs ?? null,
        ingredientId: ig.id,
        isAuto: true,
      },
    ]);
    setSearchSchatting("");
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItemHoeveelheid = (id: string, h: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, hoeveelheid: h, isAuto: false } : i))
    );
  };

  // Submit
  const handleSubmit = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      let totalIngredients = 0;

      for (const item of items) {
        if (item.type === "ingrediënt" && item.ingredientId) {
          // Direct ingredient write-off
          await wasteMutation.mutateAsync({
            ingredient_id: item.ingredientId,
            hoeveelheid: item.hoeveelheid,
            eenheid: item.eenheid,
            categorie: "personeelsmaaltijd",
            geschatte_kosten: item.kostprijs ? Math.round(item.hoeveelheid * item.kostprijs * 100) / 100 : null,
          });
          totalIngredients++;
        } else if (item.type === "halffabricaat" && item.receptId) {
          // Fetch recept_ingredienten → write off each
          const { data: receptIngs } = await supabase
            .from("recept_ingredienten")
            .select("ingredient_id, hoeveelheid, eenheid, ingredient:ingredienten(kostprijs)")
            .eq("recept_id", item.receptId);

          for (const ri of receptIngs ?? []) {
            if (!ri.ingredient_id) continue;
            const kostprijs = (ri.ingredient as any)?.kostprijs ?? null;
            const qty = ri.hoeveelheid * item.hoeveelheid; // multiply by portions
            await wasteMutation.mutateAsync({
              ingredient_id: ri.ingredient_id,
              hoeveelheid: qty,
              eenheid: ri.eenheid,
              categorie: "personeelsmaaltijd",
              geschatte_kosten: kostprijs ? Math.round(qty * kostprijs * 100) / 100 : null,
            });
            totalIngredients++;
          }
        } else if (item.type === "gerecht" && item.gerechtId) {
          // Fetch gerecht_componenten → handle both recept and ingredient types
          const { data: componenten } = await supabase
            .from("gerecht_componenten")
            .select("type, recept_id, ingredient_id, hoeveelheid, eenheid")
            .eq("gerecht_id", item.gerechtId);

          for (const comp of componenten ?? []) {
            if (comp.type === "recept" && comp.recept_id) {
              // Fetch recept ingredients
              const { data: receptIngs } = await supabase
                .from("recept_ingredienten")
                .select("ingredient_id, hoeveelheid, eenheid, ingredient:ingredienten(kostprijs)")
                .eq("recept_id", comp.recept_id);

              for (const ri of receptIngs ?? []) {
                if (!ri.ingredient_id) continue;
                const kostprijs = (ri.ingredient as any)?.kostprijs ?? null;
                const qty = ri.hoeveelheid * comp.hoeveelheid * item.hoeveelheid;
                await wasteMutation.mutateAsync({
                  ingredient_id: ri.ingredient_id,
                  hoeveelheid: qty,
                  eenheid: ri.eenheid,
                  categorie: "personeelsmaaltijd",
                  geschatte_kosten: kostprijs ? Math.round(qty * kostprijs * 100) / 100 : null,
                });
                totalIngredients++;
              }
            } else if (comp.type === "ingrediënt" && comp.ingredient_id) {
              // Direct ingredient on gerecht
              const { data: ingData } = await supabase
                .from("ingredienten")
                .select("kostprijs")
                .eq("id", comp.ingredient_id)
                .single();

              const qty = comp.hoeveelheid * item.hoeveelheid;
              await wasteMutation.mutateAsync({
                ingredient_id: comp.ingredient_id,
                hoeveelheid: qty,
                eenheid: comp.eenheid,
                categorie: "personeelsmaaltijd",
                geschatte_kosten: ingData?.kostprijs ? Math.round(qty * ingData.kostprijs * 100) / 100 : null,
              });
              totalIngredients++;
            }
          }
        }
      }

      nestoToast.success(
        "Personeelsmaaltijd geregistreerd",
        `${totalIngredients} ingrediënt${totalIngredients !== 1 ? "en" : ""} afgeschreven`
      );
      resetAndClose();
    } catch {
      nestoToast.error("Kon personeelsmaaltijd niet registreren");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setAantalPersonen(1);
    setItems([]);
    setSearchMain("");
    setSearchGerecht("");
    setSearchSchatting("");
    setGerechtOpen(false);
    setSchattingOpen(false);
    onOpenChange(false);
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(o) => { if (!o) resetAndClose(); }}
      title="Personeelsmaaltijd"
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Aantal personen */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            Aantal personen
          </label>
          <NestoInput
            type="number"
            min={1}
            value={aantalPersonen}
            onChange={(e) => setAantalPersonen(parseInt(e.target.value) || 1)}
            className="w-32"
          />
        </div>

        {/* Section 1: Search halffabricaat / ingredient */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            Wat gegeten?
          </label>
          <div className="relative">
            <NestoInput
              placeholder="Zoek halffabricaat of ingrediënt..."
              value={searchMain}
              onChange={(e) => setSearchMain(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            {showMainDropdown && (
              <SearchDropdown
                halffabricaten={hfResults}
                ingredienten={igResultsMain}
                onSelectHf={addHalffabricaat}
                onSelectIng={addIngredientManual}
              />
            )}
          </div>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2"
              >
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {item.naam}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isAuto && (
                    <span className="text-[11px] text-muted-foreground">(auto)</span>
                  )}
                  <span className="text-muted-foreground">×</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={item.hoeveelheid}
                    onChange={(e) =>
                      updateItemHoeveelheid(item.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-16 text-sm text-right bg-transparent border border-border/50 rounded px-1.5 py-0.5"
                  />
                  <span className="text-xs text-muted-foreground w-12">{item.eenheid}</span>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex-1 border-t border-border/50" />
          <span className="text-xs">of</span>
          <div className="flex-1 border-t border-border/50" />
        </div>

        {/* Section 2: Gerecht van de kaart (collapsible) */}
        <div>
          <button
            onClick={() => setGerechtOpen(!gerechtOpen)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {gerechtOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Gerecht van de kaart
          </button>
          {gerechtOpen && (
            <div className="mt-2 relative">
              <NestoInput
                placeholder="Zoek gerecht..."
                value={searchGerecht}
                onChange={(e) => setSearchGerecht(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              {showGerechtDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gerechtResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
                  ) : (
                    gerechtResults.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => addGerecht(g)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{g.naam}</span>
                        <span className="text-xs text-muted-foreground">{g.categorie}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Schatting (collapsible) */}
        <div>
          <button
            onClick={() => setSchattingOpen(!schattingOpen)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {schattingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Schatting
          </button>
          {schattingOpen && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Op basis van {aantalPersonen} personen — hoeveelheden zijn bewerkbaar
              </p>
              <div className="relative">
                <NestoInput
                  placeholder="Zoek ingrediënt..."
                  value={searchSchatting}
                  onChange={(e) => setSearchSchatting(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                />
                {showSchattingDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {igResultsSchatting.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
                    ) : (
                      igResultsSchatting.map((ig) => {
                        const portie = getPortieVoorPersonen(ig.categorie, aantalPersonen);
                        return (
                          <button
                            key={ig.id}
                            onClick={() => addIngredientSchatting(ig)}
                            className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                          >
                            <span className="font-medium">{ig.naam}</span>
                            <span className="text-xs text-muted-foreground">
                              ~{portie.hoeveelheid} {portie.eenheid}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <NestoButton variant="outline" onClick={resetAndClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSubmit}
            disabled={items.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Registreren..." : "Registreren"}
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}

// Shared search dropdown for section 1
function SearchDropdown({
  halffabricaten,
  ingredienten,
  onSelectHf,
  onSelectIng,
}: {
  halffabricaten: any[];
  ingredienten: any[];
  onSelectHf: (hf: any) => void;
  onSelectIng: (ig: any) => void;
}) {
  if (halffabricaten.length === 0 && ingredienten.length === 0) {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg">
        <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
      </div>
    );
  }

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {halffabricaten.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Halffabricaten
          </div>
          {halffabricaten.map((hf) => (
            <button
              key={hf.id}
              onClick={() => onSelectHf(hf)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm"
            >
              <span className="font-medium">{hf.naam}</span>
            </button>
          ))}
        </>
      )}
      {ingredienten.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Ingrediënten
          </div>
          {ingredienten.map((ig: any) => (
            <button
              key={ig.id}
              onClick={() => onSelectIng(ig)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
            >
              <span className="font-medium">{ig.naam}</span>
              <span className="text-xs text-muted-foreground">
                {ig.voorraad ?? 0} {ig.eenheid}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
