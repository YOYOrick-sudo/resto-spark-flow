import { useState } from "react";
import {
  useChecklistTemplates,
  type ChecklistTemplate,
  type ChecklistItem,
  type Frequentie,
} from "@/hooks/useChecklistTemplates";
import { useUserContext } from "@/contexts/UserContext";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import {
  NestoButton,
  NestoBadge,
  NestoInput,
  NestoSelect,
  Spinner,
  EmptyState,
} from "@/components/polar";
import { Plus, Trash2, FileText, CheckSquare, GripVertical } from "lucide-react";
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
            onSave={async (data) => {
              await saveTemplate.mutateAsync(data);
              nestoToast.success("Template aangemaakt");
              setSelection(null);
            }}
            onCancel={() => setSelection(null)}
            isSaving={saveTemplate.isPending}
          />
        )}
        {selection?.mode === "edit" && selected && (
          <TemplateEditor
            key={selected.id}
            template={selected}
            locationId={locationId}
            standaardTijden={settings?.standaard_tijden_per_type}
            onSave={async (data) => {
              await saveTemplate.mutateAsync({ ...data, id: selected.id });
              nestoToast.success("Template opgeslagen");
            }}
            onCancel={() => setSelection(null)}
            isSaving={saveTemplate.isPending}
          />
        )}
      </section>
    </div>
  );
}

// ---- Inline editor ----

interface EditorProps {
  template: ChecklistTemplate | null;
  locationId: string;
  standaardTijden?: Record<string, string>;
  onSave: (data: {
    naam: string;
    type: string;
    beschrijving?: string;
    items: ChecklistItem[];
    actief?: boolean;
    frequentie?: Frequentie;
    frequentie_config?: Record<string, any>;
    default_time?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function TemplateEditor({ template, locationId, standaardTijden, onSave, onCancel, isSaving }: EditorProps) {
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const fallbackTijd = standaardTijden?.[type]?.slice(0, 5) ?? "—";

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

  const removeItem = (id: string) =>
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, i) => ({ ...it, volgorde: i + 1 }))
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.id === active.id);
      const newIndex = prev.findIndex((it) => it.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((it, i) => ({
        ...it,
        volgorde: i + 1,
      }));
    });
  };

  const handleSave = async () => {
    if (!naam.trim()) {
      nestoToast.error("Geef een naam op");
      return;
    }
    await onSave({
      naam: naam.trim(),
      type,
      beschrijving: beschrijving.trim() || undefined,
      actief,
      items: items.map((it, i) => ({ ...it, volgorde: i + 1 })),
      frequentie,
      frequentie_config: frequentieConfig,
      default_time: defaultTime ? `${defaultTime}:00` : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sticky header met acties */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border">
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight truncate">
              {template ? naam.trim() || "Naamloze template" : "Nieuwe template"}
            </h2>
            {template && (
              <NestoBadge variant={TYPE_BADGE_VARIANT[type] ?? "default"}>
                {type}
              </NestoBadge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NestoButton variant="ghost" size="sm" onClick={onCancel}>
              Annuleren
            </NestoButton>
            <NestoButton size="sm" onClick={handleSave} isLoading={isSaving}>
              Opslaan
            </NestoButton>
          </div>
        </div>
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
          <NestoSelect value={type} onValueChange={setType} options={TYPE_OPTIONS} />
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
          <Switch checked={actief} onCheckedChange={setActief} />
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

// ---- Sortable row ----

interface SortableItemRowProps {
  item: ChecklistItem;
  locationId: string;
  onUpdate: (patch: Partial<ChecklistItem>) => void;
  onRemove: () => void;
}

function SortableItemRow({ item, locationId, onUpdate, onRemove }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group grid grid-cols-[24px_1fr_140px_auto_28px_28px] items-center gap-2 px-2 py-1.5 hover:bg-accent/30 transition-colors"
    >
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

      {/* Titel */}
      <input
        type="text"
        value={item.titel}
        onChange={(e) => onUpdate({ titel: e.target.value })}
        placeholder="Titel van het item"
        className="h-8 px-2 text-sm bg-transparent border border-transparent rounded hover:bg-background focus:bg-background focus:border-border focus:outline-none focus:ring-1 focus:ring-ring transition-colors min-w-0"
      />

      {/* Type select compact */}
      <div>
        <NestoSelect
          value={item.type}
          onValueChange={(v) => onUpdate({ type: v as ChecklistItem["type"] })}
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
            onCheckedChange={(v) => onUpdate({ vereist: v })}
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
            onChange={(urls) => onUpdate({ foto_urls: urls })}
          />
        )}
      </div>

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
  );
}
