import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useAllergenen } from "@/hooks/useIngredienten";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { AlertTriangle } from "lucide-react";

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-border/30 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export function IngredientStapBevestigen() {
  const { formData } = useStepWizard();
  const { data: allergenenRef } = useAllergenen();

  const basis = formData.basis ?? {};
  const voorraad = formData.voorraad_prijs ?? {};
  const allergenen = formData.allergenen ?? {};

  // Build allergen pill list
  const allergeenPills = React.useMemo(() => {
    if (!allergenenRef) return [];
    return allergenenRef
      .map((a) => ({
        id: a.id,
        naam: a.naam_nl,
        status: allergenen[a.id] ?? "onbekend",
      }))
      .filter((a) => a.status === "bevat" || a.status === "kan_bevatten");
  }, [allergenenRef, allergenen]);

  const allOnbekend = React.useMemo(() => {
    if (!allergenenRef) return true;
    return allergenenRef.every((a) => (allergenen[a.id] ?? "onbekend") === "onbekend");
  }, [allergenenRef, allergenen]);

  const kostprijs = voorraad.kostprijs ? `€${Number(voorraad.kostprijs).toFixed(2)}` : "Niet ingesteld";
  const yieldPct = voorraad.yield_percentage != null && voorraad.yield_percentage !== 100
    ? `${voorraad.yield_percentage}%`
    : "100%";
  const minVoorraad = voorraad.min_voorraad ? String(voorraad.min_voorraad) : "Niet ingesteld";

  return (
    <div className="space-y-6">
      {/* Basis */}
      <div className="rounded-card border border-border/50 bg-card p-4 space-y-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Basisgegevens
        </p>
        <SummaryRow label="Naam" value={basis.naam || "—"} />
        <SummaryRow label="Categorie" value={basis.categorie || "—"} />
        <SummaryRow label="Eenheid" value={basis.eenheid || "—"} />
        <SummaryRow label="Opslag type" value={basis.opslag_type || "—"} />
      </div>

      {/* Voorraad & prijs */}
      <div className="rounded-card border border-border/50 bg-card p-4 space-y-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Voorraad & Prijs
        </p>
        <SummaryRow label="Kostprijs per eenheid" value={kostprijs} />
        <SummaryRow label="Minimum voorraad" value={minVoorraad} />
        <SummaryRow label="Bruikbaar percentage" value={yieldPct} />
      </div>

      {/* Allergenen */}
      <div className="rounded-card border border-border/50 bg-card p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Allergenen
        </p>

        {allOnbekend ? (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Allergenen nog niet ingesteld — je kunt dit later aanpassen.
            </p>
          </div>
        ) : allergeenPills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allergeenPills.map((a) => (
              <NestoBadge
                key={a.id}
                variant={a.status === "bevat" ? "error" : "warning"}
                size="sm"
              >
                {a.naam}
              </NestoBadge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Geen allergenen</span>
        )}
      </div>
    </div>
  );
}
