import { useState, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Search } from "lucide-react";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useWasteMutation } from "@/hooks/useWasteMutation";
import { nestoToast } from "@/lib/nestoToast";
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

interface SelectedIngredient {
  id: string;
  naam: string;
  eenheid: string;
  kostprijs: number | null;
  voorraad: number;
  categorie: string;
}

interface WasteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WasteModal({ open, onOpenChange }: WasteModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedIngredient | null>(null);
  const [hoeveelheid, setHoeveelheid] = useState(1);
  const [eenheid, setEenheid] = useState("kg");
  const [reden, setReden] = useState("bederf");

  const { data: searchResults = [], isLoading: searching } = useIngredientSearch(search);
  const wasteMutation = useWasteMutation();

  const geschatteKosten = useMemo(() => {
    if (!selected?.kostprijs) return null;
    return Math.round(hoeveelheid * selected.kostprijs * 100) / 100;
  }, [hoeveelheid, selected]);

  const handleSelect = (item: typeof searchResults[0]) => {
    setSelected({
      id: item.id,
      naam: item.naam,
      eenheid: item.eenheid,
      kostprijs: item.kostprijs ?? null,
      voorraad: item.voorraad ?? 0,
      categorie: item.categorie,
    });
    setEenheid(item.eenheid);
    setHoeveelheid(1);
    setSearch("");
  };

  const handleSubmit = async () => {
    if (!selected) return;

    try {
      await wasteMutation.mutateAsync({
        ingredient_id: selected.id,
        hoeveelheid,
        eenheid,
        categorie: reden,
        geschatte_kosten: geschatteKosten,
        reden: WASTE_REDENEN.find((r) => r.value === reden)?.label ?? reden,
      });
      const kostenStr = geschatteKosten != null ? ` (€${geschatteKosten.toFixed(2)})` : "";
      nestoToast.success(
        `Waste geregistreerd`,
        `${hoeveelheid} ${eenheid} ${selected.naam}${kostenStr}`
      );
      resetAndClose();
    } catch {
      nestoToast.error("Kon waste niet registreren");
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

  return (
    <NestoModal
      open={open}
      onOpenChange={(o) => { if (!o) resetAndClose(); }}
      title="Waste melden"
      size="md"
    >
      <div className="space-y-4">
        {/* Ingredient search */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            Wat?
          </label>
          {selected ? (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{selected.naam}</span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Wijzig
              </button>
            </div>
          ) : (
            <div className="relative">
              <NestoInput
                placeholder="Zoek ingrediënt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              {search.trim().length >= 2 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searching ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Zoeken...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{item.naam}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.voorraad ?? 0} {item.eenheid}
                        </span>
                      </button>
                    ))
                  )}
                </div>
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
              min={0.01}
              step={0.1}
              value={hoeveelheid}
              onChange={(e) => setHoeveelheid(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
              Eenheid
            </label>
            <Select value={eenheid} onValueChange={setEenheid}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["kg", "g", "L", "ml", "st", "bos", "pak"].map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={!selected || hoeveelheid <= 0 || wasteMutation.isPending}
          >
            {wasteMutation.isPending ? "Registreren..." : "Registreren"}
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}
