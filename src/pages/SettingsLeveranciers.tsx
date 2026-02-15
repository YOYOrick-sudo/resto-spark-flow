import { PageHeader, EmptyState } from "@/components/polar";
import { Truck } from "lucide-react";

export default function SettingsLeveranciers() {
  return (
    <div className="space-y-6">
      <PageHeader title="Leveranciers" subtitle="Beheer leverancier integraties en koppelingen." />
      <EmptyState
        icon={Truck}
        title="Leveranciers"
        description="Leverancier koppelingen worden in een volgende versie beschikbaar."
      />
    </div>
  );
}
