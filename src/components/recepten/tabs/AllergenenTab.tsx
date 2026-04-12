import { ReceptDetail } from "@/hooks/useRecept";
import { NestoBadge } from "@/components/polar";

interface AllergenenTabProps {
  recept: ReceptDetail;
}

const statusConfig: Record<string, { variant: "error" | "warning" | "default"; label: string }> = {
  bevat: { variant: "error", label: "Bevat" },
  kan_bevatten: { variant: "warning", label: "Kan bevatten" },
  onbekend: { variant: "default", label: "Onbekend" },
};

export function AllergenenTab({ recept }: AllergenenTabProps) {
  const allergenen = [...recept.recept_allergenen].sort(
    (a, b) => (a.allergenen?.sort_order ?? 0) - (b.allergenen?.sort_order ?? 0)
  );

  const activeAllergenen = allergenen.filter((a) => a.status !== "geen");

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground italic">
        Automatisch berekend uit ingrediënten
      </p>

      {activeAllergenen.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Geen allergenen gedetecteerd
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {activeAllergenen.map((a) => {
            const config = statusConfig[a.status] || statusConfig.onbekend;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
              >
                <span className="text-sm text-foreground">
                  {a.allergenen?.naam_nl ?? a.allergeen_id}
                </span>
                <NestoBadge variant={config.variant} size="sm">
                  {config.label}
                </NestoBadge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
