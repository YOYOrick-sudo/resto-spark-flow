import { PageHeader, EmptyState } from "@/components/polar";
import { BarChart3 } from "lucide-react";

export default function KaartbeheerMenuEngineering() {
  return (
    <div className="space-y-6">
      <PageHeader title="Menu Engineering" subtitle="Analyseer de prestaties van je menukaart." />
      <EmptyState
        icon={BarChart3}
        title="Menu Engineering"
        description="Hier kun je binnenkort de populariteit en winstgevendheid van je gerechten analyseren."
      />
    </div>
  );
}
