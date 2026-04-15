import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoSelect } from "@/components/polar";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import type { ImportRow, RowStatus } from "@/hooks/useAfnamelijstImport";

interface Props {
  row: ImportRow;
  onChange: (updated: ImportRow) => void;
}

const STATUS_OPTIONS = [
  { value: "matched", label: "Gematcht" },
  { value: "new", label: "Nieuw" },
  { value: "skip", label: "Overslaan" },
];

const CATEGORIE_OPTIONS = [
  { value: "Vlees", label: "Vlees" },
  { value: "Vis", label: "Vis" },
  { value: "Zuivel", label: "Zuivel" },
  { value: "Groente", label: "Groente" },
  { value: "Fruit", label: "Fruit" },
  { value: "Kruiden", label: "Kruiden" },
  { value: "Droog", label: "Droog" },
  { value: "Dranken", label: "Dranken" },
  { value: "Bakkerij", label: "Bakkerij" },
  { value: "Overig", label: "Overig" },
];

const EENHEID_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "stuk", label: "stuk" },
  { value: "bos", label: "bos" },
  { value: "doos", label: "doos" },
];

export function ImportPreviewRow({ row, onChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suggestions } = useIngredientSearch(search);
  const m = row.parsed.mapped;

  const priceDiff =
    row.matchedIngredient?.kostprijs != null && m.prijs_per_verpakking != null
      ? (() => {
          const newKostprijs =
            m.verpakking_hoeveelheid && m.verpakking_hoeveelheid > 0
              ? m.prijs_per_verpakking / m.verpakking_hoeveelheid
              : m.prijs_per_verpakking;
          const old = row.matchedIngredient!.kostprijs!;
          if (old === 0) return null;
          return ((newKostprijs - old) / old) * 100;
        })()
      : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-4 rounded-xl border transition-colors",
        row.status === "skip" && "opacity-50",
        row.status === "matched" && "border-border/30 bg-muted/20",
        row.status === "new" && "border-primary/20 bg-primary/5",
        !row.checked && "opacity-40"
      )}
    >
      <label className="mt-1 shrink-0">
        <input
          type="checkbox"
          checked={row.checked}
          onChange={(e) => onChange({ ...row, checked: e.target.checked })}
          className="rounded border-border"
        />
      </label>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{m.artikel_naam}</p>
        <p className="text-xs text-muted-foreground">
          {m.artikel_nummer ? `Art. ${m.artikel_nummer}` : ""}
          {m.verpakking_hoeveelheid
            ? ` · ${m.verpakking_hoeveelheid} ${m.verpakking_eenheid ?? ""}`
            : ""}
          {m.prijs_per_verpakking != null ? ` · €${m.prijs_per_verpakking.toFixed(2)}` : ""}
        </p>
      </div>

      {row.status !== "skip" && (
        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
      )}

      <div className="w-[260px] shrink-0 space-y-1">
        {row.status === "matched" && row.matchedIngredient && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-full text-left text-sm font-medium truncate flex items-center gap-1 hover:text-primary"
            >
              {row.matchedIngredient.naam}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {row.confidence === "medium" && (
              <span className="text-[10px] text-amber-500 font-medium">Controleer match</span>
            )}
            {priceDiff != null && (
              <span
                className={cn(
                  "text-xs tabular-nums block",
                  priceDiff === 0 && "text-muted-foreground",
                  priceDiff > 0 && "text-red-500",
                  priceDiff < 0 && "text-green-500"
                )}
              >
                {row.matchedIngredient.kostprijs != null
                  ? `€${row.matchedIngredient.kostprijs.toFixed(2)}`
                  : "—"}{" "}
                {priceDiff === 0
                  ? "= gelijk"
                  : `${priceDiff > 0 ? "▲" : "▼"} ${Math.abs(priceDiff).toFixed(1)}%`}
              </span>
            )}

            {searchOpen && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-2 space-y-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek ingrediënt..."
                  className="w-full text-sm px-2 py-1.5 rounded-lg border border-input bg-background"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto">
                  {(suggestions ?? []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted/50 rounded-lg"
                      onClick={() => {
                        onChange({
                          ...row,
                          matchedIngredient: s as any,
                          confidence: "high",
                        });
                        setSearchOpen(false);
                        setSearch("");
                      }}
                    >
                      {s.naam}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {row.status === "new" && (
          <div className="space-y-1">
            <span className="text-xs text-primary font-medium">Nieuw ingrediënt</span>
            <div className="flex gap-1.5">
              <NestoSelect
                value={row.newCategorie}
                onValueChange={(v) => onChange({ ...row, newCategorie: v })}
                options={CATEGORIE_OPTIONS}
                className="flex-1"
              />
              <NestoSelect
                value={row.newEenheid}
                onValueChange={(v) => onChange({ ...row, newEenheid: v })}
                options={EENHEID_OPTIONS}
                className="w-20"
              />
            </div>
          </div>
        )}

        {row.status === "skip" && (
          <span className="text-xs text-muted-foreground">Overslaan</span>
        )}
      </div>

      <div className="w-[110px] shrink-0">
        <NestoSelect
          value={row.status}
          onValueChange={(v) =>
            onChange({
              ...row,
              status: v as RowStatus,
              checked: v !== "skip",
            })
          }
          options={STATUS_OPTIONS}
        />
      </div>
    </div>
  );
}
