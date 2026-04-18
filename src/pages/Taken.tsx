import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { PageHeader } from "@/components/polar";
import { DagelijksTab } from "@/components/taken/DagelijksTab";

export default function Taken() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Taken & HACCP"
        subtitle="Dagelijkse checklists en temperatuurcontrole. Templates beheer je via Instellingen → Keuken → Taken & HACCP."
        actions={[
          {
            label: "Logboek",
            icon: History,
            variant: "outline",
            onClick: () => navigate("/taken/logboek"),
          },
        ]}
      />
      <DagelijksTab />
    </div>
  );
}
