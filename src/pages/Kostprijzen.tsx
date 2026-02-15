import { PageHeader, EmptyState } from "@/components/polar";
import { Calculator } from "lucide-react";

export default function Kostprijzen() {
  return (
    <div className="space-y-6">
      <PageHeader title="Kostprijzen" subtitle="Overzicht van kostprijzen en marges." />
      <EmptyState
        icon={Calculator}
        title="Nog geen kostprijzen berekend"
        description="Kostprijzen worden automatisch berekend op basis van recepten."
      />
    </div>
  );
}
