import { PageHeader, EmptyState } from "@/components/polar";
import { UtensilsCrossed } from "lucide-react";

export default function Kaartbeheer() {
  return (
    <div className="space-y-6">
      <PageHeader title="Kaartbeheer" subtitle="Beheer alle gerechten op je menukaart." />
      <EmptyState
        icon={UtensilsCrossed}
        title="Nog geen gerechten toegevoegd"
        description="Voeg je eerste gerecht toe om te beginnen."
      />
    </div>
  );
}
