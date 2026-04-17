import { useState, useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titel: string;
  fotoUrls: string[];
}

/**
 * Toont referentiefoto's voor een checklist-item aan de kok.
 * Grid van thumbnails met click-to-enlarge — geen externe lightbox.
 */
export function FotoReferentieDialog({ open, onOpenChange, titel, fotoUrls }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Reset selectie als dialog opnieuw opent
  useEffect(() => {
    if (!open) setActiveIndex(null);
  }, [open]);

  const activeUrl = activeIndex !== null ? fotoUrls[activeIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {activeUrl !== null && (
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="p-1 -ml-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Terug naar overzicht"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="truncate">
              Referentiefoto's — {titel}
            </DialogTitle>
          </div>
          <DialogDescription>Zo moet het eruit zien.</DialogDescription>
        </DialogHeader>

        {fotoUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Geen foto's beschikbaar.
          </p>
        ) : activeUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-border">
              <img
                src={activeUrl}
                alt={`Referentie ${(activeIndex ?? 0) + 1} van ${fotoUrls.length}`}
                className="w-full h-full object-contain bg-background"
              />
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 text-foreground hover:bg-background border border-border"
                aria-label="Sluit grote weergave"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {fotoUrls.length > 1 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground tabular-nums">
                Foto {(activeIndex ?? 0) + 1} van {fotoUrls.length}
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3",
              fotoUrls.length === 1
                ? "grid-cols-1"
                : "grid-cols-2 md:grid-cols-3"
            )}
          >
            {fotoUrls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveIndex(i)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Vergroot foto ${i + 1}`}
              >
                <img
                  src={url}
                  alt={`Referentie ${i + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
