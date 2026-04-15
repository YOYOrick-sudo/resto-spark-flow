import { useState, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useWasteMutation } from "@/hooks/useWasteMutation";
import { berekenPortieGrootte, getPrimaireMethode, converteerNaarMethodeEenheid } from "@/utils/portieGrootte";
import { nestoToast } from "@/lib/nestoToast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WASTE_REDENEN = [
  { value: "bederf", label: "Bederf" },
  { value: "gevallen_gemorst", label: "Gevallen / gemorst" },
  { value: "overproductie", label: "Overproductie" },
  { value: "bereidingsfout", label: "Bereidingsfout" },
  { value: "over_tht", label: "Over THT" },
  { value: "overig", label: "Overig" },
] as const;

interface BreakdownIngredient {
  ingredient_id: string;
  naam: string;
  eenheid: string;
  hoeveelheidPerPortie: number;
  kostprijs: number | null;
}

interface SelectedItem {
  id: string;
  type: "ingrediënt" | "halffabricaat";
  naam: string;
  eenheid: string;
  kostprijs: number | null;
  voorraad: number;
  // halffabricaat-specific
  receptId?: string;
  portieDisplay?: string | null;
  methodeOutputHoeveelheid?: number | null;
  methodeOutputEenheid?: string | null;
  receptPorties?: number | null;
  breakdown?: BreakdownIngredient[];
  breakdownLoading?: boolean;
}

interface WasteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WasteModal({ open, onOpenChange }: WasteModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [hoeveelheid, setHoeveelheid] = useState(1);
  const [eenheid, setEenheid] = useState("kg");
  const [reden, setReden] = useState("bederf");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: hfResults = [] } = useHalffabricaatSearch(search);
  const { data: igResults = [], isLoading: searching } = useIngredientSearch(search);
  const wasteMutation = useWasteMutation();

  // Calculate portieFractie for cost estimation and breakdown display
  const portieFractie = useMemo(() => {
    if (!selected || selected.type !== "halffabricaat") return hoeveelheid;
    if (eenheid === "portie") return hoeveelheid;
    if (!selected.methodeOutputHoeveelheid || !selected.receptPorties) return hoeveelheid;
    const portieGrootte = selected.methodeOutputHoeveelheid / selected.receptPorties;
    const inMethodeEenheid = converteerNaarMethodeEenheid(
      hoeveelheid,
      eenheid,
      selected.methodeOutputEenheid ?? "g"
    );
    return inMethodeEenheid / portieGrootte;
  }, [hoeveelheid, eenheid, selected]);

  // Estimated cost
  const geschatteKosten = useMemo(() => {
    if (!selected) return null;
    if (selected.type === "ingrediënt") {
      if (!selected.kostprijs) return null;
      return Math.round(hoeveelheid * selected.kostprijs * 100) / 100;
    }
    // halffabricaat: sum of breakdown ingredients × portieFractie
    if (!selected.breakdown) return null;
    let total = 0;
    for (const b of selected.breakdown) {
      if (b.kostprijs) {
        total += b.hoeveelheidPerPortie * portieFractie * b.kostprijs;
      }
    }
    return Math.round(total * 100) / 100;
  }, [hoeveelheid, selected, portieFractie]);

  const handleSelectIngredient = (item: typeof igResults[0]) => {
    setSelected({
      id: item.id,
      type: "ingrediënt",
      naam: item.naam,
      eenheid: item.eenheid,
      kostprijs: item.kostprijs ?? null,
      voorraad: item.voorraad ?? 0,
    });
    setEenheid(item.eenheid);
    setHoeveelheid(1);
    setSearch("");
  };

  const handleSelectHalffabricaat = async (hf: typeof hfResults[0]) => {
    const primaireMethode = getPrimaireMethode(hf.methodes ?? []);
    const portie = berekenPortieGrootte(
      primaireMethode?.output_hoeveelheid ?? null,
      primaireMethode?.output_eenheid ?? null,
      hf.porties
    );

    const item: SelectedItem = {
      id: hf.id,
      type: "halffabricaat",
      naam: hf.naam,
      eenheid: "portie",
      kostprijs: null,
      voorraad: 0,
      receptId: hf.id,
      portieDisplay: portie?.display ?? null,
      methodeOutputHoeveelheid: primaireMethode?.output_hoeveelheid ?? null,
      methodeOutputEenheid: primaireMethode?.output_eenheid ?? null,
      receptPorties: hf.porties,
      breakdownLoading: true,
    };

    setSelected(item);
    setEenheid("portie");
    setHoeveelheid(1);
    setSearch("");

    // Fetch breakdown
    try {
      const { data: receptIngs } = await supabase
        .from("recept_ingredienten")
        .select("ingredient_id, hoeveelheid, ingredient:ingredienten(naam, eenheid, kostprijs)")
        .eq("recept_id", hf.id);

      const porties = hf.porties || 1;
      const breakdown: BreakdownIngredient[] = (receptIngs ?? [])
        .filter((ri) => ri.ingredient && ri.ingredient_id)
        .map((ri) => ({
          ingredient_id: ri.ingredient_id!,
          naam: (ri.ingredient as any).naam,
          eenheid: (ri.ingredient as any).eenheid,
          hoeveelheidPerPortie: ri.hoeveelheid / porties,
          kostprijs: (ri.ingredient as any).kostprijs ?? null,
        }));

      setSelected((prev) => prev ? { ...prev, breakdown, breakdownLoading: false } : prev);
    } catch {
      setSelected((prev) => prev ? { ...prev, breakdownLoading: false } : prev);
    }
  };

  const handleSubmit = async () => {
    if (!selected || hoeveelheid <= 0) return;
    setIsSubmitting(true);

    const redenLabel = WASTE_REDENEN.find((r) => r.value === reden)?.label ?? reden;

    try {
      if (selected.type === "ingrediënt") {
        // Direct ingredient write-off
        await wasteMutation.mutateAsync({
          ingredient_id: selected.id,
          hoeveelheid,
          eenheid,
          categorie: reden,
          geschatte_kosten: geschatteKosten,
          reden: redenLabel,
        });
        const kostenStr = geschatteKosten != null ? ` (€${geschatteKosten.toFixed(2)})` : "";
        nestoToast.success(
          "Waste geregistreerd",
          `${hoeveelheid} ${eenheid} ${selected.naam}${kostenStr}`
        );
      } else {
        // Halffabricaat: write off each ingredient from the recipe
        const { data: receptIngs } = await supabase
          .from("recept_ingredienten")
          .select("ingredient_id, hoeveelheid, eenheid, ingredient:ingredienten(kostprijs)")
          .eq("recept_id", selected.receptId!);

        let totalIngredients = 0;
        for (const ri of receptIngs ?? []) {
          if (!ri.ingredient_id) continue;
          const kostprijs = (ri.ingredient as any)?.kostprijs ?? null;
          const qtyPerPortie = ri.hoeveelheid / (selected.receptPorties ?? 1);
          const qty = qtyPerPortie * portieFractie;
          await wasteMutation.mutateAsync({
            ingredient_id: ri.ingredient_id,
            hoeveelheid: qty,
            eenheid: ri.eenheid,
            categorie: reden,
            geschatte_kosten: kostprijs ? Math.round(qty * kostprijs * 100) / 100 : null,
            reden: redenLabel,
          });
          totalIngredients++;
        }
        const kostenStr = geschatteKosten != null ? ` (€${geschatteKosten.toFixed(2)})` : "";
        nestoToast.success(
          "Waste geregistreerd",
          `${hoeveelheid} ${eenheid === "portie" ? `portie${hoeveelheid !== 1 ? "s" : ""}` : eenheid} ${selected.naam}${kostenStr} — ${totalIngredients} ingrediënt${totalIngredients !== 1 ? "en" : ""} afgeschreven`
        );
      }
      resetAndClose();
    } catch {
      nestoToast.error("Kon waste niet registreren");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSearch("");
    setSelected(null);
    setHoeveelheid(1);
    setEenheid("kg");
    setReden("bederf");
    onOpenChange(false);
  };

  const showDropdown = search.trim().length >= 2;

  // Build eenheid options for the dropdown
  const eenheidOptions = useMemo(() => {
    if (!selected) return [];
    if (selected.type === "ingrediënt") {
      return ["kg", "g", "L", "ml", "st", "bos", "pak"];
    }
    // halffabricaat
    const portieLabel = selected.portieDisplay ? `portie (${selected.portieDisplay})` : "portie";
    return [
      { value: "portie", label: portieLabel },
      { value: "kg", label: "kg" },
      { value: "g", label: "g" },
      { value: "L", label: "L" },
    ];
  }, [selected]);

  return (
    <NestoModal
      open={open}
      onOpenChange={(o) => { if (!o) resetAndClose(); }}
      title="Waste melden"
      size="md"
    >
      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            Wat?
          </label>
          {selected ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{selected.naam}</span>
                  {selected.type === "halffabricaat" && (
                    <span className="text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      halffabricaat
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Wijzig
                </button>
              </div>

              {/* Breakdown for halffabricaat */}
              {selected.type === "halffabricaat" && selected.breakdownLoading && (
                <div className="pl-3">
                  <Skeleton className="h-3 w-48" />
                </div>
              )}
              {selected.type === "halffabricaat" && selected.breakdown && selected.breakdown.length > 0 && (
                <div className="pl-3 text-xs text-muted-foreground">
                  ↳{" "}
                  {selected.breakdown.slice(0, 3).map((b, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      {(b.hoeveelheidPerPortie * portieFractie).toFixed(2)} {b.eenheid} {b.naam}
                    </span>
                  ))}
                  {selected.breakdown.length > 3 && ` · +${selected.breakdown.length - 3} meer`}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <NestoInput
                placeholder="Zoek halffabricaat of ingrediënt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              {showDropdown && (
                <WasteSearchDropdown
                  halffabricaten={hfResults}
                  ingredienten={igResults}
                  searching={searching}
                  onSelectHf={handleSelectHalffabricaat}
                  onSelectIng={handleSelectIngredient}
                />
              )}
            </div>
          )}
        </div>

        {/* Quantity + unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
              Hoeveel?
            </label>
            <NestoInput
              type="number"
              min={selected?.type === "halffabricaat" && eenheid === "portie" ? 1 : 0.01}
              step={selected?.type === "halffabricaat" && eenheid === "portie" ? 1 : 0.1}
              value={hoeveelheid}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return;
                setHoeveelheid(parseFloat(v) || 0);
              }}
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
              Eenheid
            </label>
            {selected?.type === "halffabricaat" ? (
              <Select value={eenheid} onValueChange={(v) => {
                // Reset hoeveelheid on unit change
                if (v === "portie" && eenheid !== "portie") {
                  setHoeveelheid(1);
                } else if (v !== "portie" && eenheid === "portie" && selected.methodeOutputHoeveelheid && selected.receptPorties) {
                  const portieGrootte = selected.methodeOutputHoeveelheid / selected.receptPorties;
                  let gewicht = hoeveelheid * portieGrootte;
                  const methodeEenheid = selected.methodeOutputEenheid ?? "g";
                  if (v === "g" && methodeEenheid === "kg") gewicht *= 1000;
                  else if (v === "kg" && methodeEenheid === "g") gewicht /= 1000;
                  setHoeveelheid(Math.round(gewicht * 100) / 100);
                }
                setEenheid(v);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(eenheidOptions as { value: string; label: string }[]).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={eenheid} onValueChange={setEenheid}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(eenheidOptions as string[]).map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            Reden
          </label>
          <Select value={reden} onValueChange={setReden}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WASTE_REDENEN.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cost preview */}
        {selected && (
          <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">Geschatte kosten: </span>
            <span className="font-medium">
              {geschatteKosten != null ? `€${geschatteKosten.toFixed(2)}` : "—"}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <NestoButton variant="outline" onClick={resetAndClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSubmit}
            disabled={!selected || hoeveelheid <= 0 || isSubmitting}
          >
            {isSubmitting ? "Registreren..." : "Registreren"}
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}

// Dual search dropdown
function WasteSearchDropdown({
  halffabricaten,
  ingredienten,
  searching,
  onSelectHf,
  onSelectIng,
}: {
  halffabricaten: any[];
  ingredienten: any[];
  searching: boolean;
  onSelectHf: (hf: any) => void;
  onSelectIng: (ig: any) => void;
}) {
  if (searching && halffabricaten.length === 0 && ingredienten.length === 0) {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg">
        <div className="px-3 py-2 text-sm text-muted-foreground">Zoeken...</div>
      </div>
    );
  }

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
