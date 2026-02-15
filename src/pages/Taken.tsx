import { PageHeader, EmptyState } from "@/components/polar";
import { CheckSquare } from "lucide-react";

export default function Taken() {
  return (
    <div className="space-y-6">
      <PageHeader title="Taken & Checklists" subtitle="Beheer service taken en checklists." />
      <EmptyState
        icon={CheckSquare}
        title="Nog geen taken aangemaakt"
        description="Maak je eerste takenlijst aan om te beginnen."
      />
    </div>
  );
}
