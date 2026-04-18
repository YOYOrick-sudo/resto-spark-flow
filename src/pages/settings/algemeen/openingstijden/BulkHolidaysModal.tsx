import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { NestoButton } from "@/components/polar/NestoButton";
import { nestoToast } from "@/lib/nestoToast";
import { getDutchHolidaysForYear } from "@/lib/dutchHolidays";
import {
  useBulkInsertExceptions,
  useExceptions,
} from "@/hooks/useOperatingHoursSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | undefined;
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function defaultYear(): number {
  const now = new Date();
  // From October onwards, default to next year (chef plans ahead)
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

export default function BulkHolidaysModal({ open, onOpenChange, locationId }: Props) {
  const [year, setYear] = useState<number>(defaultYear());
  const { data: existing = [] } = useExceptions(locationId);
  const bulk = useBulkInsertExceptions(locationId);

  const existingDates = useMemo(
    () => new Set(existing.map((e) => e.exception_date)),
    [existing]
  );

  const holidays = useMemo(() => {
    const all = getDutchHolidaysForYear(year);
    const now = new Date();
    const currentYear = now.getFullYear();
    if (year !== currentYear) return all;
    // For the current year, hide holidays that have already passed.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return all.filter((h) => h.date >= startOfToday);
  }, [year]);

  // selection per ISO date — keyed by year so resets on year change
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  // Re-seed defaults whenever year (or existing data) changes
  useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const h of holidays) {
      // Skip already-existing → checkbox forced off + disabled later
      if (existingDates.has(h.iso)) {
        next[h.iso] = false;
      } else {
        next[h.iso] = h.defaultSelected;
      }
    }
    setSelection(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, existing.length]);

  const toggleAll = (checked: boolean) => {
    setSelection((prev) => {
      const next = { ...prev };
      for (const h of holidays) {
        if (!existingDates.has(h.iso)) next[h.iso] = checked;
      }
      return next;
    });
  };

  const selectedCount = holidays.filter(
    (h) => selection[h.iso] && !existingDates.has(h.iso)
  ).length;

  const handleSubmit = () => {
    if (!locationId || selectedCount === 0) return;
    const items = holidays
      .filter((h) => selection[h.iso] && !existingDates.has(h.iso))
      .map((h) => ({
        exception_date: h.iso,
        exception_type: "closed" as const,
        label: h.name,
      }));
    bulk.mutate(items, {
      onSuccess: (rows) => {
        nestoToast.success(
          `${rows.length} ${rows.length === 1 ? "feestdag" : "feestdagen"} toegevoegd`
        );
        onOpenChange(false);
      },
      onError: (e: any) => nestoToast.error("Toevoegen mislukt", e?.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feestdagen toevoegen</DialogTitle>
          <DialogDescription>
            Voeg standaard Nederlandse feestdagen in één keer toe als gesloten dagen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-y border-border py-2">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Vorig jaar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-base font-semibold tabular-nums">{year}</div>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Volgend jaar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground -mt-1">
          <span>{holidays.length} feestdagen</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="hover:text-foreground transition-colors"
            >
              Alles aan
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="hover:text-foreground transition-colors"
            >
              Alles uit
            </button>
          </div>
        </div>

        <ul className="max-h-80 overflow-y-auto divide-y divide-border -mx-1">
          {holidays.map((h) => {
            const already = existingDates.has(h.iso);
            const checked = !!selection[h.iso] && !already;
            return (
              <li key={h.iso} className="flex items-center gap-3 py-2 px-1">
                <Checkbox
                  id={`hol-${h.iso}`}
                  checked={checked}
                  disabled={already}
                  onCheckedChange={(v) =>
                    setSelection((prev) => ({ ...prev, [h.iso]: !!v }))
                  }
                />
                <label
                  htmlFor={`hol-${h.iso}`}
                  className={`flex-1 flex items-center justify-between gap-3 text-sm cursor-pointer ${
                    already ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dateFmt.format(h.date)}
                    {already && <span className="ml-2 italic">al toegevoegd</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="gap-2">
          <NestoButton variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedCount === 0 || bulk.isPending}
          >
            {bulk.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {selectedCount === 0
              ? "Geen selectie"
              : `${selectedCount} ${selectedCount === 1 ? "feestdag" : "feestdagen"} toevoegen`}
          </NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
