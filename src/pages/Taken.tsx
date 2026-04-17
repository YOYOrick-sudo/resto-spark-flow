import { PageHeader } from "@/components/polar";
import { DagelijksTab } from "@/components/taken/DagelijksTab";

export default function Taken() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Taken & HACCP"
        subtitle="Dagelijkse checklists en temperatuurcontrole. Templates beheer je via Instellingen → Keuken → Taken & HACCP."
      />
      <DagelijksTab />
    </div>
  );
}
