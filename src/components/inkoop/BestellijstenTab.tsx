import { useState } from "react";
import { EmptyState } from "@/components/polar";
import { useBestellingen } from "@/hooks/useBestellingen";
import { BestellingCard } from "./BestellingCard";
import { BestellingDetailPanel } from "./BestellingDetailPanel";
import { ShoppingCart } from "lucide-react";
import { Spinner } from "@/components/polar";

export function BestellijstenTab() {
  const { data: alle, isLoading } = useBestellingen();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const concepten = (alle ?? []).filter((b) => b.status === "concept");
  const verzonden = (alle ?? []).filter((b) => b.status === "verzonden");

  return (
    <div className="space-y-8">
      {/* Concept bestellingen */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Concept ({concepten.length})
        </h3>
        {concepten.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Geen concept bestellingen.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {concepten.map((b) => (
              <BestellingCard key={b.id} bestelling={b} onClick={() => setSelectedId(b.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Verzonden bestellingen */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Verzonden ({verzonden.length})
        </h3>
        {verzonden.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Geen verzonden bestellingen.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {verzonden.map((b) => (
              <BestellingCard key={b.id} bestelling={b} onClick={() => setSelectedId(b.id)} />
            ))}
          </div>
        )}
      </section>

      <BestellingDetailPanel
        bestellingId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
