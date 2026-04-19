import { useState } from "react";
import { NestoButton } from "@/components/polar";
import { Plus, X } from "lucide-react";

/**
 * Shared input + category-management primitives for keuken settings subpages.
 *
 * Note: the legacy `SectionHeader` component was removed in Fase 2 (typografie-sweep).
 * Use `SettingsCardHeader` (H2) or `SettingsSectionLabel` (H3) from
 * `@/components/settings` instead.
 */

/**
 * Numeric input with a fixed suffix (e.g. %, °C, €).
 * Keeps consistent height + focus styling across keuken subpages.
 */
export function InputWithSuffix({
  label,
  value,
  onChange,
  onBlur,
  suffix,
  helpText,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
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
          onBlur={onBlur}
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

/**
 * Pills-based category manager: shows current categories as removable pills,
 * with an inline input + Add button to append new ones.
 */
export function CategoryManager({
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
              aria-label={`Verwijder ${item}`}
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
