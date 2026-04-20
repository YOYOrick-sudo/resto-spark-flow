import { PageHeader, EmptyState, ModuleSubNav } from "@/components/polar";
import { KAARTBEHEER_SUBNAV } from "@/lib/moduleSubNav";
import { BarChart3 } from "lucide-react";

export default function KaartbeheerMenuEngineering() {
  return (
    <div className="space-y-6">
      <PageHeader title="Menu Engineering" subtitle="Analyseer de prestaties van je menukaart." />
      <ModuleSubNav items={KAARTBEHEER_SUBNAV} />
      <EmptyState
        icon={BarChart3}
        title="Menu Engineering"
        description="Hier kun je binnenkort de populariteit en winstgevendheid van je gerechten analyseren."
      />
    </div>
  );
}
