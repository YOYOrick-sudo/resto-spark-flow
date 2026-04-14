import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NestoButton, NestoInput, NestoSelect, Spinner } from "@/components/polar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useKeukenSettings,
  useUpdateKeukenSettings,
  useUpdateAiBevoegdheden,
  type KeukenSettings,
  type AiBevoegdheden,
} from "@/hooks/useKeukenSettings";

const AUTONOMY_OPTIONS = [
  { value: "zelfstandig", label: "Zelfstandig" },
  { value: "vraag_eerst", label: "Vraag eerst" },
  { value: "uit", label: "Uit" },
];

const AI_TASKS: { key: keyof Omit<AiBevoegdheden, "haccp_waarschuwingen">; label: string }[] = [
  { key: "prep_lijsten", label: "Prep lijsten genereren" },
  { key: "besteladvies", label: "Besteladvies aanmaken" },
  { key: "interne_transfers", label: "Interne transfers voorstellen" },
  { key: "voorraad_waarschuwingen", label: "Voorraad waarschuwingen" },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function InputWithSuffix({
  label,
  value,
  onChange,
  suffix,
  helpText,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  helpText?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="flex">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 flex-1 rounded-l-button border-[1.5px] border-r-0 border-border bg-card px-3 text-sm text-foreground tabular-nums focus:!border-primary focus:outline-none focus:ring-0"
        />
        <div className="h-11 flex items-center px-3 rounded-r-button border-[1.5px] border-border bg-secondary text-sm text-muted-foreground font-medium">
          {suffix}
        </div>
      </div>
      {helpText && <p className="text-xs text-muted-foreground mt-1.5">{helpText}</p>}
    </div>
  );
}

function CategoryManager({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
}) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setNewItem("");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-foreground border border-border"
          >
            {item}
            <button
              onClick={() => onRemove(idx)}
              className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nieuwe categorie..."
          className="h-11 flex-1 rounded-button border-[1.5px] border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none focus:ring-0"
        />
        <NestoButton
          variant="outline"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-1" />
          Toevoegen
        </NestoButton>
      </div>
    </div>
  );
}

export default function SettingsKeuken() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();
  const updateAi = useUpdateAiBevoegdheden();

  // Form state
  const [buffer, setBuffer] = useState("");
  const [koelingMax, setKoelingMax] = useState("");
  const [vriezerMax, setVriezerMax] = useState("");
  const [kernMin, setKernMin] = useState("");
  const [warmhoudenMin, setWarmhoudenMin] = useState("");
  const [ingredientCats, setIngredientCats] = useState<string[]>([]);
  const [receptCats, setReceptCats] = useState<string[]>([]);
  const [gerechtCats, setGerechtCats] = useState<string[]>([]);
  const [aiBevoegdheden, setAiBevoegdheden] = useState<AiBevoegdheden | null>(null);

  // Sync from DB
  useEffect(() => {
    if (settings) {
      setBuffer(String(settings.besteladvies_buffer_percentage ?? 20));
      setKoelingMax(String(settings.haccp_koeling_max ?? 7));
      setVriezerMax(String(settings.haccp_vriezer_max ?? -18));
      setKernMin(String(settings.haccp_kern_min ?? 75));
      setWarmhoudenMin(String(settings.haccp_warmhouden_min ?? 60));
      setIngredientCats([...settings.ingredient_categorieen]);
      setReceptCats([...settings.recept_categorieen]);
      setGerechtCats([...settings.gerecht_categorieen]);
      setAiBevoegdheden({ ...settings.ai_bevoegdheden_keuken });
    }
  }, [settings]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      String(settings.besteladvies_buffer_percentage ?? 20) !== buffer ||
      String(settings.haccp_koeling_max ?? 7) !== koelingMax ||
      String(settings.haccp_vriezer_max ?? -18) !== vriezerMax ||
      String(settings.haccp_kern_min ?? 75) !== kernMin ||
      String(settings.haccp_warmhouden_min ?? 60) !== warmhoudenMin ||
      JSON.stringify(settings.ingredient_categorieen) !== JSON.stringify(ingredientCats) ||
      JSON.stringify(settings.recept_categorieen) !== JSON.stringify(receptCats) ||
      JSON.stringify(settings.gerecht_categorieen) !== JSON.stringify(gerechtCats)
    );
  }, [settings, buffer, koelingMax, vriezerMax, kernMin, warmhoudenMin, ingredientCats, receptCats, gerechtCats]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      besteladvies_buffer_percentage: parseFloat(buffer) || 20,
      haccp_koeling_max: parseFloat(koelingMax) || 7,
      haccp_vriezer_max: parseFloat(vriezerMax) || -18,
      haccp_kern_min: parseFloat(kernMin) || 75,
      haccp_warmhouden_min: parseFloat(warmhoudenMin) || 60,
      ingredient_categorieen: ingredientCats,
      recept_categorieen: receptCats,
      gerecht_categorieen: gerechtCats,
    });
  };

  const handleAiChange = (key: keyof AiBevoegdheden, value: string) => {
    if (key === "haccp_waarschuwingen") return;
    const next = { ...aiBevoegdheden!, [key]: value } as AiBevoegdheden;
    setAiBevoegdheden(next);
    updateAi.mutate(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/instellingen/voorkeuren">Instellingen</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Keuken</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/instellingen/voorkeuren">Instellingen</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Keuken</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Content */}
      <div className="max-w-[720px] mx-auto">
        {/* Page Header */}
        <div className="pb-6">
          <h1 className="text-h1 text-foreground">Keuken</h1>
          <p className="text-body text-muted-foreground mt-1">Instellingen voor je keukenmodule.</p>
        </div>

        {/* Section 1: Inkoop & Voorraad */}
        <div>
          <SectionHeader
            title="INKOOP & VOORRAAD"
            description="Instellingen voor besteladvies en voorraadberekeningen."
          />
          <InputWithSuffix
            label="Extra buffer bovenop het tekort"
            value={buffer}
            onChange={setBuffer}
            suffix="%"
            helpText="Bij het genereren van besteladvies wordt dit percentage bovenop het berekende tekort opgeteld."
            step="1"
          />
        </div>

        {/* Section 2: HACCP Temperatuur Grenzen */}
        <div className="border-t border-border/50 pt-6 mt-6">
          <SectionHeader
            title="HACCP TEMPERATUUR GRENZEN"
            description="Standaard grenzen voor temperatuurcontroles. Waarden buiten deze grenzen worden rood gemarkeerd en vereisen actie."
          />
          <div className="grid grid-cols-2 gap-4">
            <InputWithSuffix label="Koeling maximaal" value={koelingMax} onChange={setKoelingMax} suffix="°C" step="0.1" />
            <InputWithSuffix label="Vriezer maximaal" value={vriezerMax} onChange={setVriezerMax} suffix="°C" step="0.1" />
            <InputWithSuffix label="Kern minimum" value={kernMin} onChange={setKernMin} suffix="°C" step="0.1" />
            <InputWithSuffix label="Warmhouden minimum" value={warmhoudenMin} onChange={setWarmhoudenMin} suffix="°C" step="0.1" />
          </div>
        </div>

        {/* Section 3: Categorieën */}
        <div className="border-t border-border/50 pt-6 mt-6">
          <SectionHeader
            title="CATEGORIEËN"
            description="Categorieën voor ingrediënten en recepten. Voeg toe of verwijder naar behoefte."
          />
          <div className="space-y-6">
            <CategoryManager
              label="Ingrediënt categorieën"
              items={ingredientCats}
              onAdd={(item) => setIngredientCats((prev) => [...prev, item])}
              onRemove={(idx) => setIngredientCats((prev) => prev.filter((_, i) => i !== idx))}
            />
            <CategoryManager
              label="Recept categorieën"
              items={receptCats}
              onAdd={(item) => setReceptCats((prev) => [...prev, item])}
              onRemove={(idx) => setReceptCats((prev) => prev.filter((_, i) => i !== idx))}
            />
            <CategoryManager
              label="Gerecht categorieën"
              items={gerechtCats}
              onAdd={(item) => setGerechtCats((prev) => [...prev, item])}
              onRemove={(idx) => setGerechtCats((prev) => prev.filter((_, i) => i !== idx))}
            />
          </div>
        </div>

        {/* Section 4: Assistent Bevoegdheden */}
        <div className="border-t border-border/50 pt-6 mt-6">
          <SectionHeader
            title="ASSISTENT BEVOEGDHEDEN"
            description="Bepaal hoeveel autonomie de Assistent krijgt voor keuken-gerelateerde taken."
          />
          <div className="space-y-3">
            {AI_TASKS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2.5 px-3">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <div className="w-[160px]">
                  <NestoSelect
                    value={aiBevoegdheden?.[key] ?? "vraag_eerst"}
                    onValueChange={(v) => handleAiChange(key, v)}
                    options={AUTONOMY_OPTIONS}
                  />
                </div>
              </div>
            ))}
            {/* HACCP — locked */}
            <TooltipProvider>
              <div className="flex items-center justify-between py-2.5 px-3 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">HACCP waarschuwingen</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>HACCP waarschuwingen zijn altijd actief voor voedselveiligheid</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-[160px]">
                  <NestoSelect
                    value="zelfstandig"
                    options={[{ value: "zelfstandig", label: "Zelfstandig" }]}
                    disabled
                  />
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Save button */}
        <div className="border-t border-border/50 pt-6 mt-6 pb-8">
          <NestoButton
            onClick={handleSave}
            disabled={!isDirty}
            className="min-h-[44px] w-full sm:w-auto"
            isLoading={updateSettings.isPending}
          >
            Opslaan
          </NestoButton>
        </div>
      </div>
    </div>
  );
}
