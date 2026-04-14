

# Eenheid Selectie Verbeteren — Plan met Code

## Overzicht
1. Custom eenheid selectie bij ingredienten (NestoSelectWithCustom component)
2. Visuele eenheid in MEP completion modal
3. Eenheid conversies beheer in AlgemeenTab

---

## Stap 1: `src/hooks/useCustomEenheden.ts` (nieuw)

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

const STANDAARD_EENHEDEN = ["kg", "g", "L", "ml", "st"];

export function useCustomEenheden() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["custom-eenheden", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select("eenheid")
        .eq("location_id", locationId!)
        .not("eenheid", "in", `(${STANDAARD_EENHEDEN.join(",")})`)
        .order("eenheid");

      if (error) throw error;

      const unique = [...new Set((data || []).map((d) => d.eenheid))];
      return unique;
    },
    enabled: !!locationId,
  });
}

export { STANDAARD_EENHEDEN };
```

---

## Stap 2: `src/components/polar/NestoSelectWithCustom.tsx` (nieuw)

```tsx
import * as React from "react";
import { NestoSelect } from "./NestoSelect";
import { NestoInput } from "./NestoInput";
import type { SelectOption } from "./NestoSelect";

const CUSTOM_SENTINEL = "__custom__";

interface NestoSelectWithCustomProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  suggestions?: string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function NestoSelectWithCustom({
  label,
  value,
  onValueChange,
  options,
  suggestions = [],
  placeholder,
  error,
  disabled,
  className,
}: NestoSelectWithCustomProps) {
  const isStandard = options.some((o) => o.value === value);
  const [showCustom, setShowCustom] = React.useState(!isStandard && value !== "");
  const [customValue, setCustomValue] = React.useState(!isStandard ? value : "");

  React.useEffect(() => {
    const std = options.some((o) => o.value === value);
    if (std) {
      setShowCustom(false);
      setCustomValue("");
    } else if (value) {
      setShowCustom(true);
      setCustomValue(value);
    }
  }, [value, options]);

  const allOptions: SelectOption[] = [
    ...options,
    { value: CUSTOM_SENTINEL, label: "Anders..." },
  ];

  const selectValue = showCustom ? CUSTOM_SENTINEL : value;

  const handleSelectChange = (v: string) => {
    if (v === CUSTOM_SENTINEL) {
      setShowCustom(true);
      setCustomValue("");
    } else {
      setShowCustom(false);
      setCustomValue("");
      onValueChange(v);
    }
  };

  const handleCustomChange = (v: string) => {
    setCustomValue(v);
    onValueChange(v);
  };

  // Filter suggestions that aren't already in standard options
  const filteredSuggestions = suggestions.filter(
    (s) => !options.some((o) => o.value === s)
  );

  return (
    <div className="space-y-2">
      <NestoSelect
        label={label}
        value={selectValue}
        onValueChange={handleSelectChange}
        options={allOptions}
        placeholder={placeholder}
        error={!showCustom ? error : undefined}
        disabled={disabled}
        className={className}
      />

      {showCustom && (
        <div className="space-y-1.5">
          <NestoInput
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="bijv. zwarte bak, emmer..."
            autoFocus
            className="h-10"
            list="custom-eenheid-suggestions"
          />
          {filteredSuggestions.length > 0 && (
            <datalist id="custom-eenheid-suggestions">
              {filteredSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          {filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleCustomChange(s)}
                  className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-small text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
```

Voeg toe aan `src/components/polar/index.ts`:
```typescript
export { NestoSelectWithCustom } from "./NestoSelectWithCustom";
```

---

## Stap 3: `src/hooks/useEenheidConversies.ts` (nieuw)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EenheidConversie {
  id: string;
  ingredient_id: string;
  van_eenheid: string;
  naar_eenheid: string;
  factor: number;
}

export function useEenheidConversies(ingredientId: string | undefined) {
  return useQuery({
    queryKey: ["eenheid-conversies", ingredientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eenheid_conversies")
        .select("*")
        .eq("ingredient_id", ingredientId!);
      if (error) throw error;
      return data as EenheidConversie[];
    },
    enabled: !!ingredientId,
  });
}

export function useEenheidConversieMutations(ingredientId: string) {
  const qc = useQueryClient();
  const key = ["eenheid-conversies", ingredientId];

  const addConversie = useMutation({
    mutationFn: async (input: { van_eenheid: string; naar_eenheid: string; factor: number }) => {
      const { error } = await supabase
        .from("eenheid_conversies")
        .insert({ ingredient_id: ingredientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Conversie toegevoegd");
    },
    onError: () => toast.error("Kon conversie niet opslaan"),
  });

  const deleteConversie = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("eenheid_conversies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Conversie verwijderd");
    },
    onError: () => toast.error("Kon conversie niet verwijderen"),
  });

  return { addConversie, deleteConversie };
}
```

---

## Stap 4: `src/components/ingredienten/tabs/AlgemeenTab.tsx` (herschrijven)

```tsx
import * as React from "react";
import { NestoInput } from "@/components/polar";
import { NestoSelect } from "@/components/polar";
import { NestoButton } from "@/components/polar";
import { ConfirmDialog } from "@/components/polar";
import { NestoSelectWithCustom } from "@/components/polar/NestoSelectWithCustom";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { useCustomEenheden, STANDAARD_EENHEDEN } from "@/hooks/useCustomEenheden";
import { useEenheidConversies, useEenheidConversieMutations } from "@/hooks/useEenheidConversies";
import type { IngredientRow } from "@/hooks/useIngredienten";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Archive, Trash2, Plus } from "lucide-react";

const CATEGORIE_OPTIONS = [
  { value: "groenten", label: "Groenten" },
  { value: "vlees", label: "Vlees" },
  { value: "vis", label: "Vis" },
  { value: "zuivel", label: "Zuivel" },
  { value: "kruiden", label: "Kruiden" },
  { value: "olie", label: "Olie" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

const EENHEID_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "st", label: "st" },
];

const OPSLAG_OPTIONS = [
  { value: "koeling", label: "Koeling" },
  { value: "vriezer", label: "Vriezer" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

interface AlgemeenTabProps {
  ingredient: IngredientRow;
  onClose: () => void;
}

export function AlgemeenTab({ ingredient, onClose }: AlgemeenTabProps) {
  const { updateIngredient, archiveIngredient } = useIngredientMutations();
  const { data: customEenheden } = useCustomEenheden();
  const { data: conversies } = useEenheidConversies(ingredient.id);
  const { addConversie, deleteConversie } = useEenheidConversieMutations(ingredient.id);

  const [naam, setNaam] = React.useState(ingredient.naam);
  const [categorie, setCategorie] = React.useState(ingredient.categorie);
  const [eenheid, setEenheid] = React.useState(ingredient.eenheid);
  const [yieldPct, setYieldPct] = React.useState(ingredient.yield_percentage);
  const [btwPercentage, setBtwPercentage] = React.useState(String(ingredient.btw_percentage ?? 9));
  const [opslagType, setOpslagType] = React.useState(ingredient.opslag_type || "");
  const [opslagLocatie, setOpslagLocatie] = React.useState(ingredient.opslag_locatie || "");
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

  // Conversie form state
  const [convNaam, setConvNaam] = React.useState("");
  const [convFactor, setConvFactor] = React.useState("");
  const [convEenheid, setConvEenheid] = React.useState(ingredient.eenheid);

  React.useEffect(() => {
    setNaam(ingredient.naam);
    setCategorie(ingredient.categorie);
    setEenheid(ingredient.eenheid);
    setYieldPct(ingredient.yield_percentage);
    setBtwPercentage(String(ingredient.btw_percentage ?? 9));
    setOpslagType(ingredient.opslag_type || "");
    setOpslagLocatie(ingredient.opslag_locatie || "");
    setConvEenheid(ingredient.eenheid);
  }, [ingredient]);

  const hasChanges =
    naam !== ingredient.naam ||
    categorie !== ingredient.categorie ||
    eenheid !== ingredient.eenheid ||
    yieldPct !== ingredient.yield_percentage ||
    btwPercentage !== String(ingredient.btw_percentage ?? 9) ||
    opslagType !== (ingredient.opslag_type || "") ||
    opslagLocatie !== (ingredient.opslag_locatie || "");

  const handleSave = () => {
    updateIngredient.mutate({
      id: ingredient.id,
      naam,
      categorie,
      eenheid,
      yield_percentage: yieldPct,
      btw_percentage: Number(btwPercentage),
      opslag_type: opslagType || null,
      opslag_locatie: opslagLocatie || null,
    });
  };

  const handleAddConversie = () => {
    if (!convNaam.trim() || !convFactor || !convEenheid) return;
    addConversie.mutate(
      { van_eenheid: convNaam.trim(), naar_eenheid: convEenheid, factor: parseFloat(convFactor) },
      { onSuccess: () => { setConvNaam(""); setConvFactor(""); } }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-label text-muted-foreground">Naam</label>
        <NestoInput value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <NestoSelect
        label="Categorie"
        value={categorie}
        onValueChange={setCategorie}
        options={CATEGORIE_OPTIONS}
      />

      <NestoSelectWithCustom
        label="Eenheid"
        value={eenheid}
        onValueChange={setEenheid}
        options={EENHEID_OPTIONS}
        suggestions={customEenheden || []}
      />

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-label text-muted-foreground">Yield percentage</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">
                Hoeveel % van het ingekochte product is bruikbaar na schoonmaken/snijden
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex">
          <NestoInput
            type="number"
            min={1}
            max={100}
            value={yieldPct}
            onChange={(e) => setYieldPct(Number(e.target.value))}
            className="rounded-r-none border-r-0"
          />
          <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-r-[var(--radius-button)] border-[1.5px] border-l-0 border-border">
            %
          </span>
        </div>
      </div>

      <NestoSelect
        label="BTW percentage"
        value={btwPercentage}
        onValueChange={setBtwPercentage}
        options={[
          { value: "9", label: "9%" },
          { value: "21", label: "21%" },
          { value: "0", label: "0%" },
        ]}
      />

      <NestoSelect
        label="Opslag type"
        value={opslagType}
        onValueChange={setOpslagType}
        options={OPSLAG_OPTIONS}
        placeholder="Selecteer..."
      />

      <div>
        <label className="mb-2 block text-label text-muted-foreground">Opslag locatie</label>
        <NestoInput
          value={opslagLocatie}
          onChange={(e) => setOpslagLocatie(e.target.value)}
          placeholder="bijv. Koeling 2, Schap 3"
        />
      </div>

      {hasChanges && (
        <NestoButton
          onClick={handleSave}
          isLoading={updateIngredient.isPending}
          className="w-full"
        >
          Opslaan
        </NestoButton>
      )}

      {/* Eigen eenheid koppelen */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 mb-3">
          <label className="text-label text-muted-foreground font-medium">Eigen eenheid koppelen</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[240px] text-xs">
                Definieer eigen eenheden zoals "zwarte bak" en koppel ze aan standaard eenheden voor omrekening.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Bestaande conversies */}
        {conversies && conversies.length > 0 && (
          <div className="space-y-2 mb-3">
            {conversies.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-sm">
                  1 <span className="font-medium">{c.van_eenheid}</span> = {c.factor} {c.naar_eenheid}
                </span>
                <button
                  onClick={() => deleteConversie.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Nieuwe conversie toevoegen */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <NestoInput
              value={convNaam}
              onChange={(e) => setConvNaam(e.target.value)}
              placeholder="bijv. zwarte bak"
              className="h-10"
            />
          </div>
          <span className="text-sm text-muted-foreground pb-2.5">=</span>
          <div className="w-20">
            <NestoInput
              type="number"
              step="0.1"
              value={convFactor}
              onChange={(e) => setConvFactor(e.target.value)}
              placeholder="2.5"
              className="h-10"
            />
          </div>
          <div className="w-20">
            <NestoSelect
              value={convEenheid}
              onValueChange={setConvEenheid}
              options={EENHEID_OPTIONS}
              size="sm"
            />
          </div>
          <NestoButton
            variant="outline"
            onClick={handleAddConversie}
            disabled={!convNaam.trim() || !convFactor || addConversie.isPending}
            className="h-10 px-3"
          >
            <Plus className="h-4 w-4" />
          </NestoButton>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={() => setShowArchiveConfirm(true)}
          className="w-full text-muted-foreground"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archiveren
        </NestoButton>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Ingrediënt archiveren?"
        description="Het ingrediënt wordt verborgen uit het overzicht maar niet verwijderd."
        confirmLabel="Archiveren"
        variant="destructive"
        onConfirm={() => {
          archiveIngredient.mutate(ingredient.id, {
            onSuccess: () => onClose(),
          });
        }}
      />
    </div>
  );
}
```

---

## Stap 5: `src/components/mep/MepCompletionModal.tsx` (herschrijven)

Toon `visuele_eenheid` waar beschikbaar in plaats van `output_eenheid`:

```tsx
import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCompleteMepTask } from "@/hooks/useMepMutations";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepCompletionModalProps {
  task: MepTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MepCompletionModal({ task, open, onOpenChange }: MepCompletionModalProps) {
  const methode = task.methode;
  const defaultUnits = task.units ?? 1;
  const verwachteGram = methode
    ? methode.output_hoeveelheid * defaultUnits
    : undefined;

  // Use visuele_eenheid if available, otherwise fall back to output_eenheid
  const displayEenheid = methode?.visuele_eenheid || methode?.output_eenheid;

  const [unitsGemaakt, setUnitsGemaakt] = useState(defaultUnits);
  const [werkelijkeGram, setWerkelijkeGram] = useState<string>(
    verwachteGram?.toString() ?? ""
  );
  const [temperatuur, setTemperatuur] = useState<string>("");

  const completeTask = useCompleteMepTask();

  const calculatedYield =
    verwachteGram && werkelijkeGram
      ? Math.round((parseFloat(werkelijkeGram) / verwachteGram) * 100)
      : undefined;

  const handleSubmit = () => {
    completeTask.mutate(
      {
        taskId: task.id,
        task,
        unitsGemaakt,
        werkelijkeGram: werkelijkeGram ? parseFloat(werkelijkeGram) : undefined,
        yieldPercentage: calculatedYield,
        temperatuur: temperatuur ? parseFloat(temperatuur) : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Afronden: ${task.title}`}
      description={
        methode
          ? `${methode.type} · ${methode.output_hoeveelheid} ${displayEenheid}`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-3 w-full">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSubmit}
            disabled={completeTask.isPending || unitsGemaakt <= 0}
          >
            {completeTask.isPending ? "Bezig..." : "Afronden"}
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <NestoInput
          label="Aantal gemaakt"
          type="number"
          min={1}
          value={unitsGemaakt}
          onChange={(e) => setUnitsGemaakt(Number(e.target.value))}
          className="text-lg h-14"
        />

        {verwachteGram !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Verwachte output</p>
            <p className="text-sm font-medium">
              {(methode!.output_hoeveelheid * unitsGemaakt).toFixed(0)}{" "}
              {displayEenheid}
            </p>
          </div>
        )}

        {methode && (
          <NestoInput
            label={`Werkelijke output (${displayEenheid})`}
            type="number"
            step="0.1"
            value={werkelijkeGram}
            onChange={(e) => setWerkelijkeGram(e.target.value)}
            className="text-lg h-14"
          />
        )}

        {calculatedYield !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Yield</p>
            <p
              className={`text-sm font-medium ${
                calculatedYield >= 90
                  ? "text-success"
                  : calculatedYield >= 70
                  ? "text-warning"
                  : "text-destructive"
              }`}
            >
              {calculatedYield}%
            </p>
          </div>
        )}

        <NestoInput
          label="Temperatuur (°C, optioneel)"
          type="number"
          step="0.1"
          value={temperatuur}
          onChange={(e) => setTemperatuur(e.target.value)}
          className="h-14"
        />
      </div>
    </NestoModal>
  );
}
```

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/hooks/useCustomEenheden.ts` | Nieuw |
| `src/hooks/useEenheidConversies.ts` | Nieuw |
| `src/components/polar/NestoSelectWithCustom.tsx` | Nieuw |
| `src/components/polar/index.ts` | Export toevoegen |
| `src/components/ingredienten/tabs/AlgemeenTab.tsx` | Herschrijven — custom eenheid + conversies sectie |
| `src/components/mep/MepCompletionModal.tsx` | Herschrijven — visuele_eenheid doorvoeren |

