import { NestoBadge } from "@/components/polar";
import { cn } from "@/lib/utils";

interface Props {
  bestelling: {
    id: string;
    bestelnummer: string | null;
    leverancier_naam: string;
    regels_count: number;
    totaal_bedrag: number | null;
    status: string;
    besteldatum: string | null;
    verwachte_leverdatum: string | null;
  };
  onClick: () => void;
}

const statusVariant: Record<string, "default" | "primary" | "success" | "error"> = {
  concept: "default",
  verzonden: "primary",
  ontvangen: "success",
  geannuleerd: "error",
};

export function BestellingCard({ bestelling: b, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl bg-card border border-border/50 p-4 text-left transition-all duration-150",
        "hover:shadow-md hover:border-border min-h-[44px]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{b.leverancier_naam}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {b.bestelnummer ?? "Geen nummer"} · {b.regels_count} {b.regels_count === 1 ? "regel" : "regels"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <NestoBadge variant={statusVariant[b.status] ?? "default"} size="sm">
            {b.status}
          </NestoBadge>
          {b.totaal_bedrag != null && (
            <span className="text-sm font-medium tabular-nums">€{b.totaal_bedrag.toFixed(2)}</span>
          )}
        </div>
      </div>
      {(b.besteldatum || b.verwachte_leverdatum) && (
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          {b.besteldatum && <span>Besteld: {b.besteldatum}</span>}
          {b.verwachte_leverdatum && <span>Verwacht: {b.verwachte_leverdatum}</span>}
        </div>
      )}
    </button>
  );
}
