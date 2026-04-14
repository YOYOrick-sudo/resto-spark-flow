import { NestoBadge, Spinner } from "@/components/polar";
import { useGerechtAllergenen } from "@/hooks/useGerechtAllergenen";
import { Info } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "error" | "warning" | "default" }> = {
  bevat: { label: "Bevat", variant: "error" },
  kan_bevatten: { label: "Kan bevatten", variant: "warning" },
  geen: { label: "Geen", variant: "default" },
  onbekend: { label: "Onbekend", variant: "default" },
};

export function GerechtAllergenenTab({ gerechtId }: { gerechtId: string }) {
  const { data: allergenen, isLoading } = useGerechtAllergenen(gerechtId);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Allergenen worden automatisch berekend uit de componenten van dit gerecht. Wijzig de allergenen bij de individuele ingrediënten.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(allergenen ?? []).map((a) => {
          const cfg = STATUS_LABELS[a.status] ?? STATUS_LABELS.geen;
          return (
            <div
              key={a.allergeen_id}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-border/30 bg-muted/20 min-h-[44px]"
            >
              <span className="text-sm">{a.naam_nl}</span>
              <NestoBadge variant={cfg.variant} size="sm">{cfg.label}</NestoBadge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
