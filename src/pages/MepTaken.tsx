import { PageHeader, EmptyState } from "@/components/polar";
import { ClipboardList } from "lucide-react";

export default function MepTaken() {
  return (
    <div className="space-y-6">
      <PageHeader title="MEP Taken" subtitle="Mise-en-place taken voor de keuken." />
      <EmptyState
        icon={ClipboardList}
        title="Nog geen MEP taken aangemaakt"
        description="Maak je eerste MEP takenlijst aan om te beginnen."
      />
    </div>
  );
}
