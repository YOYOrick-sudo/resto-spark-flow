import { PageHeader, EmptyState } from "@/components/polar";
import { Settings } from "lucide-react";

export default function SettingsVoorkeuren() {
  return (
    <div className="space-y-6">
      <PageHeader title="Voorkeuren" subtitle="Algemene app voorkeuren en instellingen." />
      <EmptyState
        icon={Settings}
        title="Configuratie volgt binnenkort"
        description="Deze instellingen worden in een volgende versie beschikbaar."
      />
    </div>
  );
}
