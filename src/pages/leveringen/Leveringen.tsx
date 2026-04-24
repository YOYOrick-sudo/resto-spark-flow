// TOUCH-FIRST: zie docs/development/TOUCH_FIRST_GUIDELINES.md
// Operationele route — chef werkt op iPad. Tap-targets ≥60px, geen hover-only critical actions.

import * as React from "react";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/polar/PageHeader";
import { EmptyState } from "@/components/polar/EmptyState";
import { CardSkeleton } from "@/components/polar/LoadingStates";
import { useGoodsReceipts } from "@/hooks/useGoodsReceipts";
import { LeveringCard } from "./components/LeveringCard";
import { PakbonAIDisclaimerModal } from "./components/PakbonAIDisclaimerModal";

const SECTION_LABELS: Record<"vandaag" | "deze_week" | "eerder", string> = {
  vandaag: "Vandaag",
  deze_week: "Later deze week",
  eerder: "Eerder",
};

export default function Leveringen() {
  const { isLoading, isError, grouped } = useGoodsReceipts();

  const totalCount =
    grouped.vandaag.length + grouped.deze_week.length + grouped.eerder.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PakbonAIDisclaimerModal />

      <PageHeader
        title="Leveringen"
        subtitle="Pakbonnen die wachten op jouw bevestiging"
      />

      <div className="mt-6 space-y-8">
        {isLoading && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-body text-destructive font-medium">
              Pakbonnen konden niet geladen worden.
            </p>
            <p className="text-small text-muted-foreground mt-1">
              Probeer de pagina opnieuw te laden.
            </p>
          </div>
        )}

        {!isLoading && !isError && totalCount === 0 && (
          <EmptyState
            icon={Truck}
            title="Geen openstaande leveringen"
            description="Zodra een leverancier een pakbon stuurt, verschijnt deze hier voor jouw controle."
            size="lg"
          />
        )}

        {!isLoading &&
          !isError &&
          (Object.keys(grouped) as Array<keyof typeof grouped>).map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;
            return (
              <section key={groupKey}>
                <h2 className="text-caption text-muted-foreground/80 uppercase tracking-widest mb-3 px-1">
                  {SECTION_LABELS[groupKey]} · {items.length}
                </h2>
                <div className="space-y-3">
                  {items.map((lev) => (
                    <LeveringCard key={lev.id} levering={lev} />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
