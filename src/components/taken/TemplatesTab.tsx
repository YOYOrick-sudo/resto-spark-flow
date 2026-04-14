import { useState, useEffect } from "react";
import { useChecklistTemplates, type ChecklistTemplate, type ChecklistItem } from "@/hooks/useChecklistTemplates";
import { useUserContext } from "@/contexts/UserContext";
import { NestoButton, NestoCard, NestoCardContent, NestoBadge, NestoInput, NestoSelect, Spinner, EmptyState } from "@/components/polar";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { Plus, Trash2, ArrowUp, ArrowDown, CheckSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const TYPE_OPTIONS = [
  { value: "opening", label: "Opening" },
  { value: "sluiting", label: "Sluiting" },
  { value: "tussentijds", label: "Tussentijds" },
  { value: "schoonmaak", label: "Schoonmaak" },
  { value: "haccp", label: "HACCP" },
];

const ITEM_TYPE_OPTIONS = [
  { value: "check", label: "Checkbox" },
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

export function TemplatesTab() {
  const { context } = useUserContext();
  const { data: templates, isLoading, saveTemplate, toggleActief } = useChecklistTemplates();
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

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

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const handleNew = () => {
    setIsNew(true);
    setEditing({
      id: "",
      location_id: "",
      naam: "",
      type: "opening",
      categorie: null,
      beschrijving: null,
      items: [],
      actief: true,
      created_at: "",
      updated_at: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NestoButton onClick={handleNew} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe template
        </NestoButton>
      </div>

      {(templates ?? []).length === 0 ? (
        <EmptyState icon={CheckSquare} title="Geen templates" description="Maak je eerste template aan." />
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Naam</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Actief</th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => { setIsNew(false); setEditing(t); }}
                >
                  <td className="px-4 py-3 font-medium">{t.naam}</td>
                  <td className="px-4 py-3">
                    <NestoBadge variant={TYPE_BADGE_VARIANT[t.type] ?? "default"}>{t.type}</NestoBadge>
                  </td>
                  <td className="px-4 py-3 text-right">{t.items.length}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={t.actief}
                      onCheckedChange={(v) => toggleActief.mutate({ id: t.id, actief: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateEditorPanel
        template={editing}
        isNew={isNew}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={saveTemplate}
      />
    </div>
  );
}

// --- Template Editor Panel ---

interface EditorProps {
  template: ChecklistTemplate | null;
  isNew: boolean;
  open: boolean;
  onClose: () => void;
  onSave: ReturnType<typeof useChecklistTemplates>["saveTemplate"];
}

function TemplateEditorPanel({ template, isNew, open, onClose, onSave }: EditorProps) {
  const [naam, setNaam] = useState("");
  const [type, setType] = useState("opening");
  const [beschrijving, setBeschrijving] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (template) {
      setNaam(template.naam);
      setType(template.type);
      setBeschrijving(template.beschrijving ?? "");
      setItems([...template.items]);
    }
  }, [template]);

  if (!template) return null;

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        titel: "",
        type: "check",
        volgorde: items.length + 1,
        vereist: false,
        temp_min: null,
        temp_max: null,
        frequentie: "dagelijks",
      },
    ]);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, volgorde: i + 1 }));
    setItems(next);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next.map((it, i) => ({ ...it, volgorde: i + 1 })));
  };

  const updateItem = (idx: number, patch: Partial<ChecklistItem>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleSave = async () => {
    await onSave.mutateAsync({
      id: isNew ? undefined : template.id,
      naam,
      type,
      beschrijving,
      items,
    });
    onClose();
  };

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title={isNew ? "Nieuwe template" : "Template bewerken"}
      footer={
        <NestoButton
          onClick={handleSave}
          disabled={!naam.trim() || items.length === 0}
          isLoading={onSave.isPending}
          className="w-full min-h-[48px]"
        >
          Opslaan
        </NestoButton>
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6 space-y-5">
          <h2 ref={titleRef} className="text-xl font-semibold">
            {isNew ? "Nieuwe template" : template.naam}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Naam</label>
              <NestoInput value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam checklist" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <NestoSelect value={type} onValueChange={setType} options={TYPE_OPTIONS} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Beschrijving</label>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                className="w-full min-h-[60px] rounded-xl border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optionele beschrijving..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Items</h3>
              <NestoButton variant="outline" size="sm" onClick={addItem} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-1" />
                Item toevoegen
              </NestoButton>
            </div>

            {items.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === items.length - 1}
                      className="h-8 w-8 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <NestoInput
                      value={item.titel}
                      onChange={(e) => updateItem(idx, { titel: e.target.value })}
                      placeholder="Item titel"
                    />
                    <div className="flex gap-2 items-center">
                      <NestoSelect
                        value={item.type}
                        onValueChange={(v) => updateItem(idx, { type: v as any })}
                        options={ITEM_TYPE_OPTIONS}
                      />
                      <label className="flex items-center gap-2 text-sm min-h-[44px]">
                        <Switch
                          checked={item.vereist}
                          onCheckedChange={(v) => updateItem(idx, { vereist: v })}
                        />
                        Vereist
                      </label>
                    </div>
                    {item.type === "temperatuur" && (
                      <div className="flex gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Min °C</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.temp_min ?? ""}
                            onChange={(e) => updateItem(idx, { temp_min: e.target.value ? parseFloat(e.target.value) : null })}
                            className="h-10 w-20 rounded-lg border bg-background px-2 text-sm text-center"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Max °C</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.temp_max ?? ""}
                            onChange={(e) => updateItem(idx, { temp_max: e.target.value ? parseFloat(e.target.value) : null })}
                            className="h-10 w-20 rounded-lg border bg-background px-2 text-sm text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="h-10 w-10 rounded-lg flex items-center justify-center hover:bg-error-light text-error shrink-0 min-h-[44px]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
