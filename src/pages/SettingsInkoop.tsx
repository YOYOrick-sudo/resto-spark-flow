import { PageHeader, EmptyState } from "@/components/polar";
import { ShoppingBag } from "lucide-react";

export default function SettingsInkoop() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inkoop Instellingen" subtitle="Configureer inkoop en bestellingen." />
      <EmptyState
        icon={ShoppingBag}
        title="Configuratie volgt binnenkort"
        description="Inkoop configuratie wordt in een volgende versie beschikbaar."
      />
    </div>
  );
}
