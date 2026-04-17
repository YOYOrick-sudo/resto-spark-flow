import { useState, useEffect, useRef, useCallback } from "react";
import {
  useChecklistTemplates,
  type ChecklistTemplate,
  type ChecklistItem,
  type Frequentie,
} from "@/hooks/useChecklistTemplates";
import { useUserContext } from "@/contexts/UserContext";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  NestoButton,
  NestoBadge,
  NestoInput,
  NestoSelect,
  Spinner,
  EmptyState,
} from "@/components/polar";
import { Plus, Trash2, FileText, CheckSquare, GripVertical, Check, AlertCircle, Loader2, X, ChevronRight, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { nestoToast } from "@/lib/nestoToast";
import { cn } from "@/lib/utils";
import { FrequentieSelector } from "./FrequentieSelector";
import { ItemFotoUploader } from "./ItemFotoUploader";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

const TYPE_OPTIONS = [
  { value: "opening", label: "Opening" },
  { value: "tussentijds", label: "Tussentijds" },
  { value: "sluiting", label: "Sluiting" },
  { value: "schoonmaak", label: "Schoonmaak" },
  { value: "haccp", label: "HACCP" },
];

const ITEM_TYPE_OPTIONS = [
  { value: "check", label: "Afvinken" },
  { value: "temperatuur", label: "Temperatuur" },
  { value: "notitie", label: "Notitie" },
];

const TYPE_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "primary"> = {
  opening: "primary",
  sluiting: "default",
  tussentijds: "warning",
  schoonmaak: "success",
  haccp: "warning",
};

type Selection = { mode: "edit"; id: string } | { mode: "new" } | null;

export function TemplatesTab() {
  const { context, currentLocation } = useUserContext();
  const { data: templates, isLoading, saveTemplate, toggleActief } = useChecklistTemplates();
  const { data: settings } = useKeukenSettings();
  const [selection, setSelection] = useState<Selection>(null);

  const isManager = context?.role === "owner" || context?.role === "manager";
  const locationId = currentLocation?.id ?? "";

  if (!isManager) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Geen toegang"
        description="Alleen eigenaren en managers kunnen templates beheren."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const list = templates ?? [];
  const selected =
    selection?.mode === "edit"
      ? list.find((t) => t.id === selection.id) ?? null
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Linkerkolom — lijst */}
      <aside className="space-y-3">
        <NestoButton
          variant="outline"
          className="w-full justify-start min-h-[44px]"
          onClick={() => setSelection({ mode: "new" })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe template
        </NestoButton>

        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-4">
              Nog geen templates.
            </p>
          )}
          {list.map((t) => {
            const isActive = selection?.mode === "edit" && selection.id === t.id;
            const itemCount = Array.isArray(t.items) ? t.items.length : 0;
            return (
              <button
                key={t.id}
                onClick={() => setSelection({ mode: "edit", id: t.id })}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isActive
                    ? "bg-accent border-primary/40"
                    : "bg-card border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium truncate">{t.naam}</span>
                  <Switch
                    checked={t.actief}
                    onCheckedChange={(v) =>
                      toggleActief.mutate({ id: t.id, actief: v })
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <NestoBadge variant={TYPE_BADGE_VARIANT[t.type] ?? "default"}>
                    {t.type}
                  </NestoBadge>
                  <span className="text-xs text-muted-foreground">
                    {itemCount} items
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Rechterkolom — editor / empty (eigen scroll-container) */}
      <section className="h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {selection === null && (
          <EmptyState
            icon={FileText}
            title="Geen template geselecteerd"
            description="Selecteer een template links of maak een nieuwe aan."
          />
        )}
        {selection?.mode === "new" && (
          <TemplateEditor
            key="new"
            template={null}
            locationId={locationId}
            standaardTijden={settings?.standaard_tijden_per_type}
            saveTemplate={saveTemplate.mutateAsync}
            onCreated={(id) => setSelection({ mode: "edit", id })}
            onCancel={() => setSelection(null)}
          />
        )}
        {selection?.mode === "edit" && selected && (
          <TemplateEditor
            key={selected.id}
            template={selected}
            locationId={locationId}
            standaardTijden={settings?.standaard_tijden_per_type}
            saveTemplate={saveTemplate.mutateAsync}
            onCancel={() => setSelection(null)}
          />
        )}
      </section>
    </div>
  );
}

// ---- Inline editor ----

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EditorProps {
  template: ChecklistTemplate | null;
  locationId: string;
  standaardTijden?: Record<string, string>;
  saveTemplate: (input: {
    id?: string;
    naam: string;
    type: string;
    beschrijving?: string;
    items: ChecklistItem[];
    actief?: boolean;
    frequentie?: Frequentie;
    frequentie_config?: Record<string, any>;
    default_time?: string | null;
  }) => Promise<any>;
  onCreated?: (id: string) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, locationId, standaardTijden, saveTemplate, onCreated, onCancel }: EditorProps) {
  const [naam, setNaam] = useState(template?.naam ?? "");
  const [type, setType] = useState(template?.type ?? "opening");
  const [beschrijving, setBeschrijving] = useState(template?.beschrijving ?? "");
  const [actief, setActief] = useState(template?.actief ?? true);
  const [frequentie, setFrequentie] = useState<Frequentie>(template?.frequentie ?? "dagelijks");
  const [frequentieConfig, setFrequentieConfig] = useState<Record<string, any>>(
    template?.frequentie_config ?? {}
  );
  const [defaultTime, setDefaultTime] = useState<string>(
    template?.default_time ? template.default_time.slice(0, 5) : ""
  );
  const [items, setItems] = useState<ChecklistItem[]>(
    () =>
      (template?.items ?? [])
        .slice()
        .sort((a, b) => a.volgorde - b.volgorde)
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Houd huidige template-id bij — wordt gezet zodra een nieuwe template voor het eerst geinsert is.
  const [currentId, setCurrentId] = useState<string | undefined>(template?.id);
  // Markeer of editor "vies" is (heeft pending wijzigingen vergeleken met laatst opgeslagen versie)
  const dirtyRef = useRef(false);
  // Markeer of we al een initiële save voor een nieuwe template hebben gedaan (om dubbele inserts te voorkomen)
  const creatingRef = useRef(false);
  // Voorkom dat de auto-save al triggert bij eerste mount (state-init zou anders direct als wijziging gezien worden)
  const mountedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const fallbackTijd = standaardTijden?.[type]?.slice(0, 5) ?? "—";

  // ---- Save-engine ----
  const performSave = useCallback(
    async (overrides?: Partial<{
      naam: string;
      type: string;
      beschrijving: string;
      actief: boolean;
      frequentie: Frequentie;
      frequentieConfig: Record<string, any>;
      defaultTime: string;
      items: ChecklistItem[];
    }>) => {
      const eff = {
        naam: overrides?.naam ?? naam,
        type: overrides?.type ?? type,
        beschrijving: overrides?.beschrijving ?? beschrijving,
        actief: overrides?.actief ?? actief,
        frequentie: overrides?.frequentie ?? frequentie,
        frequentieConfig: overrides?.frequentieConfig ?? frequentieConfig,
        defaultTime: overrides?.defaultTime ?? defaultTime,
        items: overrides?.items ?? items,
      };

      // Validatie: naam is vereist voor een save
      if (!eff.naam.trim()) {
        setSaveStatus("idle");
        return;
      }

      // Voorkom dubbele inserts wanneer we nog bezig zijn een nieuwe template aan te maken
      if (!currentId && creatingRef.current) return;

      setSaveStatus("saving");
      try {
        const payload = {
          id: currentId,
          naam: eff.naam.trim(),
          type: eff.type,
          beschrijving: eff.beschrijving.trim() || undefined,
          actief: eff.actief,
          items: eff.items.map((it, i) => ({ ...it, volgorde: i + 1 })),
          frequentie: eff.frequentie,
          frequentie_config: eff.frequentieConfig,
          default_time: eff.defaultTime ? `${eff.defaultTime}:00` : null,
        };

        if (!currentId) creatingRef.current = true;
        const result: any = await saveTemplate(payload);
        if (!currentId) {
          creatingRef.current = false;
          // Probeer id uit response te halen; anders laat parent eventueel weten via onCreated als die ooit komt
          const newId: string | undefined = result?.id ?? result?.[0]?.id;
          if (newId) {
            setCurrentId(newId);
            onCreated?.(newId);
          }
        }
        dirtyRef.current = false;
        setSaveStatus("saved");
      } catch (e) {
        creatingRef.current = false;
        setSaveStatus("error");
        nestoToast.error("Opslaan mislukt, probeer opnieuw");
      }
    },
    [naam, type, beschrijving, actief, frequentie, frequentieConfig, defaultTime, items, currentId, saveTemplate, onCreated]
  );

  const debouncedSave = useDebouncedCallback(() => {
    if (!dirtyRef.current) return;
    void performSave();
  }, 800);

  // Auto-clear "saved" indicator na 1.5s, zodat hij niet permanent in beeld blijft
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => {
      setSaveStatus((s) => (s === "saved" ? "idle" : s));
    }, 1500);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // Markeer dirty + trigger debounced save bij elke statewijziging
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    dirtyRef.current = true;
    debouncedSave();
  }, [naam, type, beschrijving, actief, frequentie, frequentieConfig, defaultTime, items, debouncedSave]);

  // Instant save voor toggles (geen debounce — voelt direct aan)
  const saveNow = useCallback(
    (overrides?: Parameters<typeof performSave>[0]) => {
      debouncedSave.cancel();
      dirtyRef.current = true;
      void performSave(overrides);
    },
    [debouncedSave, performSave]
  );

  // ---- Item-mutaties ----
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        titel: "",
        type: "check",
        volgorde: prev.length + 1,
        vereist: false,
        temp_min: null,
        temp_max: null,
        frequentie: "dagelijks",
        foto_urls: [],
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  // Voor toggles & andere instant-acties op items: muteer + sla direct op
  const updateItemInstant = (id: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      saveNow({ items: next });
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev
        .filter((it) => it.id !== id)
        .map((it, i) => ({ ...it, volgorde: i + 1 }));
      saveNow({ items: next });
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.id === active.id);
      const newIndex = prev.findIndex((it) => it.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex).map((it, i) => ({
        ...it,
        volgorde: i + 1,
      }));
      saveNow({ items: next });
      return next;
    });
  };

  const handleCancel = () => {
    debouncedSave.cancel();
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Subtiele topbar — alleen status + sluiten, geen titel/badge */}
      <div className="flex items-center justify-end gap-1.5 -mb-2">
        <SaveStatusIndicator status={saveStatus} />
        <button
          type="button"
          onClick={handleCancel}
          className="p-1.5 -mr-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Basisvelden */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Naam</label>
          <NestoInput
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bv. Opening keuken"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Type</label>
          <NestoSelect
            value={type}
            onValueChange={(v) => {
              setType(v);
              saveNow({ type: v });
            }}
            options={TYPE_OPTIONS}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Beschrijving</label>
          <NestoInput
            value={beschrijving}
            onChange={(e) => setBeschrijving(e.target.value)}
            placeholder="Optioneel"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={actief}
            onCheckedChange={(v) => {
              setActief(v);
              saveNow({ actief: v });
            }}
          />
          <span className="text-sm">Actief (verschijnt bij dag-start)</span>
        </div>
      </div>

      {/* Frequentie */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Frequentie
        </h3>
        <FrequentieSelector
          frequentie={frequentie}
          config={frequentieConfig}
          onChange={(f, c) => {
            setFrequentie(f);
            setFrequentieConfig(c);
          }}
        />
      </div>

      {/* Standaard tijd */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Standaard tijd
        </h3>
        <div className="flex items-end gap-3">
          <div>
            <input
              type="time"
              value={defaultTime}
              onChange={(e) => setDefaultTime(e.target.value)}
              className="h-10 w-32 rounded-button border-[1.5px] border-border bg-card px-3 text-sm tabular-nums focus:!border-primary focus:outline-none focus:ring-0"
            />
          </div>
          {!defaultTime && (
            <p className="text-xs text-muted-foreground pb-2">
              Leeg = standaard tijd uit settings (nu: {fallbackTijd} voor type "{type}")
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Items ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground mb-3">
              Nog geen items — voeg taken toe die de kok bij elke run uitvoert.
            </p>
            <NestoButton size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Eerste item toevoegen
            </NestoButton>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((it) => it.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      locationId={locationId}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                      onUpdateInstant={(patch) => updateItemInstant(item.id, patch)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Item toevoegen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Status indicator ----

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground" aria-label="Opslaan…" title="Opslaan…">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 text-success animate-in fade-in" aria-label="Opgeslagen" title="Opgeslagen">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 text-error" aria-label="Opslaan mislukt" title="Opslaan mislukt">
        <AlertCircle className="h-3.5 w-3.5" />
      </span>
    );
  }
  return null;
}

// ---- Sortable row ----

interface SortableItemRowProps {
  item: ChecklistItem;
  locationId: string;
  onUpdate: (patch: Partial<ChecklistItem>) => void;
  onUpdateInstant: (patch: Partial<ChecklistItem>) => void;
  onRemove: () => void;
}

const QUICK_TEMPLATES: Array<{ label: string; value: string }> = [
  {
    label: "Schoonmaakinstructie",
    value: "Stappen:\n1. \n2. \n3. \n\nProduct: \nContacttijd: ",
  },
  {
    label: "Dosering",
    value: "Verhouding: \nHoeveelheid: ",
  },
  {
    label: "Aandachtspunt",
    value: "Let op: ",
  },
];

function SortableItemRow({ item, locationId, onUpdate, onUpdateInstant, onRemove }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? "none"
      : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease",
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? "hidden" : "visible",
    zIndex: isDragging ? 10 : "auto",
  };

  const isTemp = item.type === "temperatuur";
  const fotoUrls = item.foto_urls ?? [];
  const beschrijving = item.beschrijving ?? "";
  const hasBeschrijving = beschrijving.trim().length > 0;
  const hasContent = hasBeschrijving || fotoUrls.length > 0;

  const [expanded, setExpanded] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="grid grid-cols-[24px_1fr_140px_auto_28px_28px_28px] items-center gap-2 px-2 py-1.5 hover:bg-accent/30 transition-colors">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-muted touch-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Versleep om te herschikken"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Titel + (info-indicator als beschrijving aanwezig) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={item.titel}
            onChange={(e) => onUpdate({ titel: e.target.value })}
            placeholder="Titel van het item"
            className="h-8 px-2 text-sm bg-transparent border border-transparent rounded hover:bg-background focus:bg-background focus:border-border focus:outline-none focus:ring-1 focus:ring-ring transition-colors min-w-0 flex-1"
          />
          {hasBeschrijving && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-muted-foreground/70 hover:text-primary p-0.5 rounded transition-colors flex-shrink-0"
              aria-label="Beschrijving aanwezig — klik om te zien"
              title={beschrijving.length > 60 ? `${beschrijving.slice(0, 60)}…` : beschrijving}
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Type select — instant save */}
        <div>
          <NestoSelect
            value={item.type}
            onValueChange={(v) => onUpdateInstant({ type: v as ChecklistItem["type"] })}
            options={ITEM_TYPE_OPTIONS}
          />
        </div>

        {/* Vereist + (temp inline indien nodig) */}
        <div className="flex items-center gap-3">
          {isTemp && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={item.temp_min ?? ""}
                onChange={(e) =>
                  onUpdate({
                    temp_min:
                      e.target.value === "" ? null : parseFloat(e.target.value),
                  })
                }
                placeholder="Min"
                className="h-8 w-16 px-2 text-sm tabular-nums bg-transparent border border-border rounded hover:bg-background focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Min temperatuur"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="number"
                step="0.1"
                value={item.temp_max ?? ""}
                onChange={(e) =>
                  onUpdate({
                    temp_max:
                      e.target.value === "" ? null : parseFloat(e.target.value),
                  })
                }
                placeholder="Max"
                className="h-8 w-16 px-2 text-sm tabular-nums bg-transparent border border-border rounded hover:bg-background focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Max temperatuur"
              />
              <span className="text-xs text-muted-foreground">°C</span>
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Switch
              checked={!!item.vereist}
              onCheckedChange={(v) => onUpdateInstant({ vereist: v })}
            />
            <span>Vereist</span>
          </label>
        </div>

        {/* Foto-uploader */}
        <div className={cn(fotoUrls.length === 0 && "opacity-0 group-hover:opacity-100 transition-opacity")}>
          {locationId && (
            <ItemFotoUploader
              locationId={locationId}
              itemId={item.id}
              fotoUrls={fotoUrls}
              onChange={(urls) => onUpdateInstant({ foto_urls: urls })}
            />
          )}
        </div>

        {/* Expand chevron — altijd zichtbaar als content, anders alleen op hover */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
            !hasContent && "opacity-0 group-hover:opacity-100"
          )}
          aria-label={expanded ? "Beschrijving inklappen" : "Beschrijving toevoegen"}
          aria-expanded={expanded}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
          />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          aria-label="Item verwijderen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded paneel — beschrijving + chips */}
      {expanded && (
        <div className="px-2 pb-3 pt-1 ml-6 mr-9 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {beschrijving.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onUpdate({ beschrijving: q.value })}
                  className="text-xs px-2 py-1 rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  + {q.label}
                </button>
              ))}
            </div>
          )}
          <Textarea
            value={beschrijving}
            onChange={(e) => onUpdate({ beschrijving: e.target.value })}
            placeholder="Extra instructies, hoe te doen, aandachtspunten…"
            rows={3}
            className="text-sm leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
