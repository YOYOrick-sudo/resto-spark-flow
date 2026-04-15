

# MEP Quick Add — Snelle Prep + Vrije Taken

## Overzicht

De zoekbalk zoekt in halffabricaten EN ingrediënten. Bij ingrediënten opent een "Snelle Prep" modal die in 1 klik een halffabricaat aanmaakt + op de MEP zet. Vrije taken ook mogelijk. **Geen database migraties nodig** — alles past in bestaande tabellen.

---

## Nieuwe bestanden (4)

### 1. `src/utils/prepDefaults.ts`

```typescript
export const PREP_HANDELINGEN = [
  { type: 'Raspen',      defaultYield: 95,  defaultDuur: 10 },
  { type: 'Snijden',     defaultYield: 90,  defaultDuur: 15 },
  { type: 'Schillen',    defaultYield: 85,  defaultDuur: 20 },
  { type: 'Wassen',      defaultYield: 80,  defaultDuur: 5  },
  { type: 'Portioneren', defaultYield: 100, defaultDuur: 10 },
  { type: 'Aanvullen',   defaultYield: 100, defaultDuur: 2  },
  { type: 'Ontdooien',   defaultYield: 95,  defaultDuur: 5  },
  { type: 'Marineren',   defaultYield: 100, defaultDuur: 10 },
  { type: 'Roosteren',   defaultYield: 90,  defaultDuur: 15 },
  { type: 'Vacuümeren',  defaultYield: 100, defaultDuur: 10 },
  { type: 'Fileren',     defaultYield: 50,  defaultDuur: 20 },
  { type: 'Overig',      defaultYield: 100, defaultDuur: 10 },
] as const;

export type PrepHandeling = typeof PREP_HANDELINGEN[number]['type'];

export function getPrepDefaults(type: string) {
  return PREP_HANDELINGEN.find(h => h.type === type) ?? PREP_HANDELINGEN[PREP_HANDELINGEN.length - 1];
}
```

---

### 2. `src/hooks/useSnellePrep.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface SnellePrepInput {
  ingredientId: string;
  ingredientNaam: string;
  handeling: string;
  hoeveelheid: number;
  eenheid: string;
  yieldPercentage: number;
  duurMinuten: number;
  taskDate: string;
}

export function useSnellePrep() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: SnellePrepInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");

      const titel = `${input.ingredientNaam} ${input.handeling.toLowerCase()}`;

      // 1. Maak halffabricaat (recept) aan
      const { data: recept, error: receptErr } = await supabase
        .from("recepten")
        .insert({
          location_id: locationId,
          naam: titel,
          categorie: "Prep",
          type: "halffabricaat",
          porties: 1,
          actieve_bereidingstijd: input.duurMinuten,
        })
        .select("id")
        .single();
      if (receptErr) throw receptErr;

      // 2. Koppel ingrediënt
      const { error: ingredErr } = await supabase
        .from("recept_ingredienten")
        .insert({
          recept_id: recept.id,
          ingredient_id: input.ingredientId,
          hoeveelheid: input.hoeveelheid,
          eenheid: input.eenheid,
        });
      if (ingredErr) throw ingredErr;

      // 3. Maak methode aan
      const outputHoeveelheid = input.hoeveelheid * (input.yieldPercentage / 100);
      const { data: methode, error: methodeErr } = await supabase
        .from("halffabricaat_methodes")
        .insert({
          recept_id: recept.id,
          type: input.handeling,
          output_hoeveelheid: outputHoeveelheid,
          output_eenheid: input.eenheid,
          visuele_eenheid: `${outputHoeveelheid} ${input.eenheid}`,
          standaard_duur: input.duurMinuten,
          houdbaarheid: input.handeling === "Marineren" ? 2 : 1,
        })
        .select("id")
        .single();
      if (methodeErr) throw methodeErr;

      // 4. Maak MEP taak aan
      const { error: taskErr } = await supabase
        .from("mep_tasks")
        .insert({
          location_id: locationId,
          title: titel,
          category: "Prep",
          task_date: input.taskDate,
          recept_id: recept.id,
          methode_id: methode.id,
          units: 1,
          prioriteit: "Normaal",
          status: "pending",
        });
      if (taskErr) throw taskErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
      qc.invalidateQueries({ queryKey: ["halffabricaat-search"] });
      nestoToast.success("Prep aangemaakt en op MEP gezet!");
    },
    onError: (e: Error) => nestoToast.error("Aanmaken mislukt", e.message),
  });
}
```

---

### 3. `src/components/mep/SnellePrepModal.tsx`

```tsx
import { useState, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { PREP_HANDELINGEN, getPrepDefaults } from "@/utils/prepDefaults";
import { useSnellePrep } from "@/hooks/useSnellePrep";

interface Ingredient {
  id: string;
  naam: string;
  categorie: string;
  eenheid: string;
  kostprijs: number | null;
  voorraad: number | null;
}

interface SnellePrepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient;
  taskDate: string;
}

export function SnellePrepModal({ open, onOpenChange, ingredient, taskDate }: SnellePrepModalProps) {
  const [handeling, setHandeling] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState(1);
  const [eenheid, setEenheid] = useState(ingredient.eenheid || "kg");
  const [yieldPct, setYieldPct] = useState(100);
  const [duur, setDuur] = useState(10);

  const snellePrep = useSnellePrep();

  // Auto-fill yield + duur when handeling changes
  const handleHandelingChange = (val: string) => {
    setHandeling(val);
    const defaults = getPrepDefaults(val);
    setYieldPct(defaults.defaultYield);
    setDuur(defaults.defaultDuur);
  };

  const preview = useMemo(() => {
    if (!handeling) return null;
    const naam = `${ingredient.naam} ${handeling.toLowerCase()}`;
    const outputHoeveelheid = hoeveelheid * (yieldPct / 100);
    const kostprijsPerEenheid = ingredient.kostprijs
      ? ingredient.kostprijs / (yieldPct / 100)
      : null;
    return { naam, outputHoeveelheid, kostprijsPerEenheid };
  }, [handeling, hoeveelheid, yieldPct, ingredient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handeling) return;
    snellePrep.mutate(
      {
        ingredientId: ingredient.id,
        ingredientNaam: ingredient.naam,
        handeling,
        hoeveelheid,
        eenheid,
        yieldPercentage: yieldPct,
        duurMinuten: duur,
        taskDate,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handelingOptions = PREP_HANDELINGEN.map(h => ({
    value: h.type,
    label: h.type,
  }));

  const eenheidOptions = ["kg", "g", "L", "ml", "stuk"].map(e => ({
    value: e,
    label: e,
  }));

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Snelle prep"
      description={ingredient.naam}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NestoSelect
          label="Handeling"
          placeholder="Kies handeling..."
          value={handeling}
          onValueChange={handleHandelingChange}
          options={handelingOptions}
        />

        <div className="grid grid-cols-2 gap-4">
          <NestoInput
            label="Hoeveelheid"
            type="number"
            min={0.1}
            step={0.1}
            value={hoeveelheid}
            onChange={(e) => setHoeveelheid(Number(e.target.value))}
          />
          <NestoSelect
            label="Eenheid"
            value={eenheid}
            onValueChange={setEenheid}
            options={eenheidOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NestoInput
            label="Yield %"
            type="number"
            min={1}
            max={100}
            value={yieldPct}
            onChange={(e) => setYieldPct(Number(e.target.value))}
          />
          <NestoInput
            label="Duur (min)"
            type="number"
            min={1}
            value={duur}
            onChange={(e) => setDuur(Number(e.target.value))}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="border-t border-border/50 pt-4 mt-4 space-y-1">
            <p className="text-sm text-foreground">
              → <span className="font-medium">{preview.naam}</span>
            </p>
            {preview.kostprijsPerEenheid != null && (
              <p className="text-xs text-muted-foreground">
                → Kostprijs: €{preview.kostprijsPerEenheid.toFixed(2)}/{eenheid}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              → Output: {preview.outputHoeveelheid.toFixed(2)} {eenheid}
            </p>
            {ingredient.voorraad != null && (
              <p className="text-xs text-muted-foreground">
                → Voorraad: {ingredient.voorraad} {ingredient.eenheid} beschikbaar
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <NestoButton variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={!handeling || snellePrep.isPending}>
            {snellePrep.isPending ? "Aanmaken..." : "Aanmaken + op MEP zetten"}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
```

---

### 4. `src/components/mep/MepQuickAddDropdown.tsx`

```tsx
import { Loader2, Plus, ChevronRight } from "lucide-react";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";

interface IngredientResult {
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

  // Filter ingrediënten: hide those already covered by a halffabricaat result
  const filteredIngredienten = ingredienten.filter(
    (ing) =>
      !halffabricaten.some((hf) =>
        hf.naam.toLowerCase().includes(ing.naam.toLowerCase())
      )
  );

  const hasResults = halffabricaten.length > 0 || filteredIngredienten.length > 0;

  return (
    <div>
      {/* Halffabricaten */}
      {halffabricaten.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Halffabricaten
          </p>
          {halffabricaten.map((item) => {
            const methodes = item.methodes ?? [];
            if (methodes.length <= 1) {
              return (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
                  onClick={() => onSelectHalffabricaat(item, methodes[0])}
                  disabled={isPending}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.naam}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.categorie}
                      {methodes[0] && ` · ${methodes[0].visuele_eenheid}`}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            }
            return (
              <div key={item.id}>
                <p className="px-4 pt-3 pb-1 text-sm font-medium text-foreground">
                  {item.naam}
                </p>
                {methodes.map((m) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-6 py-2.5 hover:bg-accent transition-colors flex items-center justify-between min-h-[40px]"
                    onClick={() => onSelectHalffabricaat(item, m)}
                    disabled={isPending}
                  >
                    <div>
                      <p className="text-sm text-foreground capitalize">{m.type}</p>
                      <p className="text-xs text-muted-foreground">{m.visuele_eenheid}</p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Snel Prep Aanmaken */}
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

      {/* Vrije taak */}
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
```

---

## Gewijzigde bestanden (3)

### 5. `src/components/mep/MepQuickAdd.tsx` (volledig herschreven)

```tsx
import { useState } from "react";
import { NestoInput } from "@/components/polar/NestoInput";
import { Search } from "lucide-react";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useCreateMepTask, useUpdateMepTask } from "@/hooks/useMepMutations";
import { MepQuickAddDropdown } from "./MepQuickAddDropdown";
import { SnellePrepModal } from "./SnellePrepModal";
import { addDays, format } from "date-fns";
import { nestoToast } from "@/lib/nestoToast";
import type { MepTask } from "@/hooks/useMepTasks";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";

interface MepQuickAddProps {
  taskDate: string;
  dayTasks: MepTask[];
}

export function MepQuickAdd({ taskDate, dayTasks }: MepQuickAddProps) {
  const [search, setSearch] = useState("");
  const [prepIngredient, setPrepIngredient] = useState<{
    id: string;
    naam: string;
    categorie: string;
    eenheid: string;
    kostprijs: number | null;
    voorraad: number | null;
  } | null>(null);

  const { data: halffabricaten = [], isLoading: hfLoading } = useHalffabricaatSearch(search);
  const { data: ingredienten = [], isLoading: igLoading } = useIngredientSearch(search);
  const createTask = useCreateMepTask();
  const updateTask = useUpdateMepTask();

  const isPending = createTask.isPending || updateTask.isPending;
  const isLoading = hfLoading || igLoading;

  function getSmartDate(): string {
    const now = new Date();
    const isToday = taskDate === format(now, "yyyy-MM-dd");
    return isToday && now.getHours() >= 17
      ? format(addDays(now, 1), "yyyy-MM-dd")
      : taskDate;
  }

  // ── Halffabricaat ──
  const handleAddHalffabricaat = (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => {
    const smartDate = getSmartDate();
    const existing = dayTasks.find(
      (t) =>
        t.recept_id === item.id &&
        (!methode || t.methode_id === methode.id) &&
        t.task_date === smartDate &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    );

    if (existing) {
      const newUnits = (existing.units ?? 1) + 1;
      updateTask.mutate({ id: existing.id, units: newUnits });
      nestoToast.success(`${item.naam} — verhoogd naar ${newUnits}×`);
    } else {
      const title = methode
        ? `${item.naam} ${methode.type.toLowerCase()}`
        : item.naam;
      createTask.mutate({
        title,
        category: item.categorie || "halffabricaat",
        task_date: smartDate,
        recept_id: item.id,
        methode_id: methode?.id ?? null,
        units: 1,
        prioriteit: "Normaal",
      });
    }
    setSearch("");
  };

  // ── Ingrediënt → open Snelle Prep modal ──
  const handleSelectIngredient = (item: typeof prepIngredient & {}) => {
    setPrepIngredient(item);
    setSearch("");
  };

  // ── Vrije taak ──
  const handleAddFreeTask = () => {
    const smartDate = getSmartDate();
    const title = search.trim();
    if (!title) return;

    const existing = dayTasks.find(
      (t) =>
        t.title === title &&
        !t.recept_id &&
        t.task_date === smartDate &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    );

    if (existing) {
      const newUnits = (existing.units ?? 1) + 1;
      updateTask.mutate({ id: existing.id, units: newUnits });
      nestoToast.success(`${title} — verhoogd naar ${newUnits}×`);
    } else {
      createTask.mutate({
        title,
        category: "Overig",
        task_date: smartDate,
        units: 1,
        prioriteit: "Normaal",
      });
    }
    setSearch("");
  };

  const showDropdown = search.trim().length >= 2;

  return (
    <div>
      <div className="relative">
        <NestoInput
          placeholder="Zoek halffabricaat, ingrediënt of voeg taak toe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        {showDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <MepQuickAddDropdown
              search={search.trim()}
              halffabricaten={halffabricaten}
              ingredienten={ingredienten}
              isLoading={isLoading}
              isPending={isPending}
              onSelectHalffabricaat={handleAddHalffabricaat}
              onSelectIngredient={handleSelectIngredient}
              onAddFreeTask={handleAddFreeTask}
            />
          </div>
        )}
      </div>

      {/* Snelle Prep Modal */}
      {prepIngredient && (
        <SnellePrepModal
          open={!!prepIngredient}
          onOpenChange={(open) => { if (!open) setPrepIngredient(null); }}
          ingredient={prepIngredient}
          taskDate={getSmartDate()}
        />
      )}
    </div>
  );
}
```

---

### 6. `src/hooks/useIngredientSearch.ts` (gewijzigd)

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export function useIngredientSearch(searchTerm: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["ingredient-search", locationId, searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, kostprijs, voorraad, categorie")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .ilike("naam", `%${searchTerm}%`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!locationId && searchTerm.length >= 2,
  });
}
```

Wijzigingen: `categorie` toegevoegd aan select, limit 10 → 5.

---

### 7. `src/hooks/useHalffabricaatSearch.ts` (gewijzigd)

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface HalffabricaatSearchResult {
  id: string;
  naam: string;
  categorie: string;
  type: string;
  methodes: {
    id: string;
    type: string;
    output_hoeveelheid: number;
    output_eenheid: string;
    visuele_eenheid: string;
    houdbaarheid: number | null;
  }[];
}

export function useHalffabricaatSearch(search: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["halffabricaat-search", locationId, search],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("recepten")
        .select(`
          id, naam, categorie, type, porties, totale_kostprijs,
          methodes:halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(id, type, output_hoeveelheid, output_eenheid, visuele_eenheid, houdbaarheid)
        `)
        .eq("location_id", locationId)
        .eq("is_archived", false)
        .eq("type", "halffabricaat")
        .ilike("naam", `%${search.trim()}%`)
        .order("naam", { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as unknown as HalffabricaatSearchResult[];
    },
    enabled: !!locationId && search.trim().length >= 2,
  });
}
```

Wijzigingen: limit 20 → 5, enabled bij `search.trim().length >= 2` (was altijd enabled), `.ilike` altijd toegepast (niet conditioneel).

---

## Samenvatting

| # | Bestand | Actie |
|---|---------|-------|
| 1 | `src/utils/prepDefaults.ts` | **Nieuw** |
| 2 | `src/hooks/useSnellePrep.ts` | **Nieuw** |
| 3 | `src/components/mep/SnellePrepModal.tsx` | **Nieuw** |
| 4 | `src/components/mep/MepQuickAddDropdown.tsx` | **Nieuw** |
| 5 | `src/components/mep/MepQuickAdd.tsx` | **Herschreven** |
| 6 | `src/hooks/useIngredientSearch.ts` | **Gewijzigd** |
| 7 | `src/hooks/useHalffabricaatSearch.ts` | **Gewijzigd** |

Geen database migraties. Geen nieuwe kolommen. De `ingredient_id` kolom uit het vorige plan is **geschrapt**.

