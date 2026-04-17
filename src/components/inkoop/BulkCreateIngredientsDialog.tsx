/**
 * BulkCreateIngredientsDialog — D.6b R4b-1
 *
 * Bulk-aanmaak van nieuwe ingrediënten uit unmatched factuurregels.
 * Gebruikt sequentiële mutation om race-conditions op
 * leveranciers_artikelen upserts te voorkomen.
 */
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

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
  { value: "stuk", label: "stuk" },
];

interface RowState {
  regelId: string;
  checked: boolean;
  naam: string;
  categorie: string;
  eenheid: string;
  kostprijs: number | null;
  aliasNaam: string;
  artikelnummer: string | null;
  verpakkingHoeveelheid: number | null;
  verpakkingEenheid: string | null;
  prijsPerVerpakking: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  regels: FactuurRegel[];
  leverancierId: string | null;
}

export function BulkCreateIngredientsDialog({ open, onClose, regels, leverancierId }: Props) {
  const { bulkCreateIngredientsFromFactuur } = useFactuurMutations();

  const [rows, setRows] = React.useState<RowState[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setRows(
      regels.map((r) => ({
        regelId: r.id,
        checked: true,
        naam: r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend,
        categorie: r.ai_category_hint ?? "overig",
        eenheid: r.ai_suggested_eenheid ?? "stuk",
        kostprijs: r.prijs_per_basiseenheid ?? r.prijs_per_eenheid ?? null,
        aliasNaam: r.product_naam_herkend,
        artikelnummer: r.ai_raw_artikelnummer,
        verpakkingHoeveelheid: r.verpakking_hoeveelheid,
        verpakkingEenheid: r.verpakking_eenheid,
        prijsPerVerpakking: r.prijs_per_eenheid,
      }))
    );
  }, [open, regels]);

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const selectedCount = rows.filter((r) => r.checked).length;

  const handleSubmit = () => {
    const items = rows
      .filter((r) => r.checked && r.naam.trim().length > 0)
      .map((r) => ({
        regelId: r.regelId,
        naam: r.naam.trim(),
        categorie: r.categorie,
        eenheid: r.eenheid,
        kostprijs: r.kostprijs ?? undefined,
        aliasNaam: r.aliasNaam,
        leverancierId,
        artikelnummer: r.artikelnummer,
        verpakkingHoeveelheid: r.verpakkingHoeveelheid,
        verpakkingEenheid: r.verpakkingEenheid,
        prijsPerVerpakking: r.prijsPerVerpakking,
      }));

    if (items.length === 0) return;

    bulkCreateIngredientsFromFactuur.mutate(items, { onSuccess: () => onClose() });
  };

  const fmtPrice = (n: number | null) =>
    n == null
      ? "—"
      : `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Maak {regels.length} nieuwe ingrediënten aan
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Vink ingrediënten uit die je niet wilt aanmaken. Pas naam/categorie/eenheid waar nodig.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[24px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_80px] gap-2 px-2 pb-1 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background">
            <span />
            <span>Naam</span>
            <span>Categorie</span>
            <span>Eenheid</span>
            <span className="text-right">€/eh</span>
          </div>

          {rows.map((r, idx) => (
            <div
              key={r.regelId}
              className={`grid grid-cols-[24px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_80px] gap-2 px-2 py-1.5 rounded-lg items-center ${
                r.checked ? "bg-card" : "bg-muted/30 opacity-60"
              }`}
            >
              <Checkbox
                checked={r.checked}
                onCheckedChange={(v) => updateRow(idx, { checked: v === true })}
              />
              <NestoInput
                value={r.naam}
                onChange={(e) => updateRow(idx, { naam: e.target.value })}
                disabled={!r.checked}
                className="h-8 text-xs"
              />
              <NestoSelect
                value={r.categorie}
                onValueChange={(v) => updateRow(idx, { categorie: v })}
                options={CATEGORIE_OPTIONS}
                disabled={!r.checked}
              />
              <NestoSelect
                value={r.eenheid}
                onValueChange={(v) => updateRow(idx, { eenheid: v })}
                options={EENHEID_OPTIONS}
                disabled={!r.checked}
              />
              <span className="text-xs text-muted-foreground tabular-nums text-right">
                {fmtPrice(r.kostprijs)}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-border/50 pt-3">
          <NestoButton variant="outline" onClick={onClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedCount === 0}
            isLoading={bulkCreateIngredientsFromFactuur.isPending}
          >
            Maak {selectedCount} ingrediënten aan
          </NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
