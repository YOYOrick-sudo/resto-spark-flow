import { useState } from "react";
import {
  useChecklistTemplates,
  type ChecklistTemplate,
  type ChecklistItem,
} from "@/hooks/useChecklistTemplates";
import { useUserContext } from "@/contexts/UserContext";
import {
  NestoButton,
  NestoCard,
  NestoCardContent,
  NestoBadge,
  NestoInput,
  NestoSelect,
  Spinner,
  EmptyState,
} from "@/components/polar";
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, CheckSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { nestoToast } from "@/lib/nestoToast";

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
  const { context } = useUserContext();
  const { data: templates, isLoading, saveTemplate, toggleActief } = useChecklistTemplates();
  const [selection, setSelection] = useState<Selection>(null);

  const isManager = context?.role === "owner" || context?.role === "manager";

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

      {/* Rechterkolom — editor / empty */}
      <section>
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
  onSave: (data: {
    naam: string;
    type: string;
    beschrijving?: string;
    items: ChecklistItem[];
    actief?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function TemplateEditor({ template, onSave, onCancel, isSaving }: EditorProps) {
  const [naam, setNaam] = useState(template?.naam ?? "");
  const [type, setType] = useState(template?.type ?? "opening");
  const [beschrijving, setBeschrijving] = useState(template?.beschrijving ?? "");
  const [actief, setActief] = useState(template?.actief ?? true);
  const [items, setItems] = useState<ChecklistItem[]>(
    () =>
      (template?.items ?? [])
        .slice()
        .sort((a, b) => a.volgorde - b.volgorde)
  );

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
      },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const removeItem = (idx: number) =>
    setItems((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, volgorde: i + 1 }))
    );

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((it, i) => ({ ...it, volgorde: i + 1 }));
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
    });
  };

  return (
    <div className="space-y-6">
      {/* Sticky header met acties */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center justify-between py-3 -mt-3 border-b">
        <h2 className="text-lg font-semibold">
          {template ? "Template bewerken" : "Nieuwe template"}
        </h2>
        <div className="flex items-center gap-2">
          <NestoButton variant="ghost" onClick={onCancel}>
            Annuleren
          </NestoButton>
          <NestoButton onClick={handleSave} isLoading={isSaving}>
            Opslaan
          </NestoButton>
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

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Items ({items.length})
          </h3>
          {items.length > 0 && (
            <NestoButton size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Item toevoegen
            </NestoButton>
          )}
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <p className="text-base font-medium text-foreground mb-1">
              Nog geen items
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Voeg taken toe die de kok bij elke run moet uitvoeren.
            </p>
            <NestoButton size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Eerste item toevoegen
            </NestoButton>
          </div>
        )}

        {items.map((item, idx) => (
          <NestoCard key={item.id}>
            <NestoCardContent className="py-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                    disabled={idx === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                    disabled={idx === items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <NestoInput
                      value={item.titel}
                      onChange={(e) => updateItem(idx, { titel: e.target.value })}
                      placeholder="Titel van het item"
                      className="flex-1"
                    />
                    <div className="w-[160px]">
                      <NestoSelect
                        value={item.type}
                        onValueChange={(v) => updateItem(idx, { type: v as any })}
                        options={ITEM_TYPE_OPTIONS}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-muted-foreground hover:text-error p-2 rounded hover:bg-error-light shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.type === "temperatuur" && (
                    <div className="flex items-center gap-2">
                      <NestoInput
                        type="number"
                        step="0.1"
                        value={item.temp_min ?? ""}
                        onChange={(e) =>
                          updateItem(idx, {
                            temp_min:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                        placeholder="Min °C"
                        className="w-[110px]"
                      />
                      <span className="text-muted-foreground text-sm">tot</span>
                      <NestoInput
                        type="number"
                        step="0.1"
                        value={item.temp_max ?? ""}
                        onChange={(e) =>
                          updateItem(idx, {
                            temp_max:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                        placeholder="Max °C"
                        className="w-[110px]"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={!!item.vereist}
                      onCheckedChange={(v) => updateItem(idx, { vereist: v })}
                    />
                    Vereist
                  </label>
                </div>
              </div>
            </NestoCardContent>
          </NestoCard>
        ))}
      </div>
    </div>
  );
}
