

# Inline Aanmaken van Halffabricaten & Ingrediënten

## Wat verandert

In `src/components/kaartbeheer/GerechtComponentenTab.tsx`: wanneer een zoekopdracht geen resultaten oplevert, verschijnt er een "aanmaken" optie onderaan de dropdown.

- **Halffabricaat**: maakt nieuw recept aan (type=halffabricaat), navigeert naar `/recepten?open={id}`, toont toast
- **Ingrediënt**: maakt nieuw ingrediënt aan, selecteert het direct in het formulier (geen navigatie), toont toast

## Code

Nieuw bestand: **geen** -- alles in `GerechtComponentenTab.tsx`.

### Volledige vervanging van `GerechtComponentenTab.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NestoButton } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GerechtDetail, GerechtComponent } from "@/hooks/useGerechtDetail";
import { Plus, Trash2 } from "lucide-react";

function ComponentRow({ comp, onRemove }: { comp: GerechtComponent; onRemove: () => void }) {
  // ... unchanged
}

function AddHalffabricaat({ gerechtId, emptyState }: { gerechtId: string; emptyState?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: results } = useHalffabricaatSearch(search);
  const { addComponent } = useGerechtMutations();
  const { currentLocation } = useUserContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ... if (!open) return button -- unchanged

  const handleCreate = async () => {
    if (!currentLocation?.id || !search.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("recepten")
        .insert({
          naam: search.trim(),
          type: "halffabricaat",
          categorie: "Overig",
          location_id: currentLocation.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast({
        title: "Halffabricaat aangemaakt",
        description: "Vul het recept verder in op de recepten pagina.",
      });
      navigate(`/recepten?open=${data.id}`);
    } catch (err) {
      toast({ title: "Fout bij aanmaken", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // In the dropdown, after mapping results:
  // Add this block after the results.map() and before closing </div>:
  {search.trim().length >= 2 && results && results.length === 0 && (
    <button
      type="button"
      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/50 min-h-[44px] flex items-center gap-2 border-t border-border/30"
      onClick={handleCreate}
      disabled={creating}
    >
      <Plus className="h-3.5 w-3.5" />
      "{search.trim()}" aanmaken als nieuw halffabricaat
    </button>
  )}

  // Also: show dropdown when results is empty too (currently only shows when results.length > 0)
  // Change condition from: {results && results.length > 0 && (
  // To: {results !== undefined && search.trim().length >= 2 && (
  // Then inside, conditionally render results OR the create option

  // ... rest unchanged
}

function AddIngredient({ gerechtId, emptyState }: { gerechtId: string; emptyState?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [eenheid, setEenheid] = useState("");
  const [selected, setSelected] = useState<{ id: string; naam: string; eenheid: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: results } = useIngredientSearch(search);
  const { addComponent } = useGerechtMutations();
  const { currentLocation } = useUserContext();
  const { toast } = useToast();

  // ... if (!open) return button -- unchanged

  const handleCreate = async () => {
    if (!currentLocation?.id || !search.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("ingredienten")
        .insert({
          naam: search.trim(),
          eenheid: "kg",
          kostprijs: 0,
          location_id: currentLocation.id,
        })
        .select("id, naam, eenheid")
        .single();
      if (error) throw error;
      toast({ title: "Ingrediënt aangemaakt" });
      // Select it directly in the form
      setSelected({ id: data.id, naam: data.naam, eenheid: data.eenheid });
      setEenheid(data.eenheid);
    } catch (err) {
      toast({ title: "Fout bij aanmaken", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Same dropdown pattern: show create option when no results
  {search.trim().length >= 2 && results && results.length === 0 && (
    <button
      type="button"
      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/50 min-h-[44px] flex items-center gap-2 border-t border-border/30"
      onClick={handleCreate}
      disabled={creating}
    >
      <Plus className="h-3.5 w-3.5" />
      Nieuw ingrediënt "{search.trim()}" aanmaken
    </button>
  )}

  // ... rest unchanged
}

// GerechtComponentenTab -- unchanged
```

### Samenvatting van wijzigingen in het bestand

1. **Nieuwe imports**: `useNavigate`, `useUserContext`, `supabase`, `useToast`
2. **AddHalffabricaat**: `handleCreate` functie + dropdown toont "aanmaken" optie bij lege resultaten. Dropdown conditie wijzigt van `results.length > 0` naar `results !== undefined && search.trim().length >= 2`
3. **AddIngredient**: `handleCreate` functie + dropdown toont "aanmaken" optie bij lege resultaten. Na aanmaken wordt het ingrediënt direct geselecteerd in het formulier (geen navigatie)

