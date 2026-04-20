import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { PageHeader, ModuleSubNav } from "@/components/polar";
import { KEUKEN_SUBNAV } from "@/lib/moduleSubNav";
import { DagelijksTab } from "@/components/taken/DagelijksTab";

export default function Taken() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <ModuleSubNav items={KEUKEN_SUBNAV} />
      <PageHeader
        title="Taken & HACCP"
        help={{
          content:
            "Dagelijkse checklists en temperatuurcontrole. Templates beheer je via Instellingen → Keuken → Taken & HACCP.",
          action: {
            label: "Naar instellingen",
            href: "/instellingen/keuken/haccp",
          },
        }}
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
