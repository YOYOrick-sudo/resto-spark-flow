import { useState } from "react";
import { ChefHat } from "lucide-react";
import { useKeukenMeldingen } from "@/hooks/useKeukenMeldingen";
import { KeukenMeldingCard } from "./KeukenMeldingCard";
import { PersoneelsmaaltijdModal } from "@/components/mep/PersoneelsmaaltijdModal";

export function KeukenSectie() {
  const meldingen = useKeukenMeldingen();
  const [maaltijdOpen, setMaaltijdOpen] = useState(false);

  // Don't show if no relevant alerts
  if (!meldingen.length) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Keuken
          </h3>
        </div>

        {meldingen.map((melding, idx) => (
          <KeukenMeldingCard
            key={`${melding.type}-${idx}`}
            melding={melding}
            onAction={
              melding.actie_label === "Personeelsmaaltijd bedenken"
                ? () => setMaaltijdOpen(true)
                : undefined
            }
          />
        ))}
      </div>

      <PersoneelsmaaltijdModal
        open={maaltijdOpen}
        onOpenChange={setMaaltijdOpen}
      />
    </>
  );
}
