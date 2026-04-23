// ============================================================
// Sprint A3 — Modal voor verpakking & toeslagen
// ============================================================
// Toont alle is_emballage / OVERIG_REGEX regels als compacte lijst.
// Chef kan een regel verwijderen wanneer die ten onrechte als verpakking
// is geclassificeerd (scan-fout). Geen edit, geen re-classify (out of scope).
// Auto-skip bij goedkeuren wordt door C1-flow afgehandeld.
// ============================================================

import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton } from "@/components/polar";
import { sumRegelTotaal } from "@/lib/factuur-categories";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  open: boolean;
  onClose: () => void;
  regels: FactuurRegel[];
  isEditable: boolean;
  onDeleteRegel: (id: string) => void;
}

export function VerpakkingModal({
  open,
  onClose,
  regels,
  isEditable,
  onDeleteRegel,
}: Props) {
  const totaal = sumRegelTotaal(regels);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>📦</span>
            Verpakking & toeslagen
          </DialogTitle>
          <DialogDescription>
            Tellen mee in het factuur-totaal, maar vragen geen ingrediënt-koppeling.
            Verwijder een regel als die per ongeluk als verpakking is herkend.
          </DialogDescription>
        </DialogHeader>

        {regels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Geen verpakking-regels op deze factuur.
          </p>
        ) : (
          <div className="border border-border/50 rounded-lg divide-y divide-border/40 max-h-[60vh] overflow-auto">
            {regels.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.product_naam_herkend}
                  </p>
                  {(r.hoeveelheid != null || r.eenheid) && (
                    <p className="text-xs text-muted-foreground">
                      {r.hoeveelheid ?? "-"} {r.eenheid ?? ""}
                    </p>
                  )}
                </div>
                <div className="text-sm tabular-nums text-foreground">
                  €{(r.totaal ?? 0).toFixed(2)}
                </div>
                {isEditable && (
                  <button
                    onClick={() => onDeleteRegel(r.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label={`Verwijder ${r.product_naam_herkend}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex !justify-between items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Totaal verpakking: </span>
            <span className="font-semibold tabular-nums">€{totaal.toFixed(2)}</span>
          </div>
          <NestoButton variant="outline" onClick={onClose}>
            Sluiten
          </NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
