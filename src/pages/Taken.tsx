import { useState } from "react";
import { PageHeader, NestoTabs, NestoTabContent } from "@/components/polar";
import { DagelijksTab } from "@/components/taken/DagelijksTab";
import { TemplatesTab } from "@/components/taken/TemplatesTab";

const TABS = [
  { id: "dagelijks", label: "Dagelijks" },
  { id: "templates", label: "Templates" },
];

export default function Taken() {
  const [tab, setTab] = useState("dagelijks");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taken & HACCP"
        subtitle="Checklists, temperatuurcontrole en HACCP compliance."
      />
      <NestoTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <NestoTabContent value="dagelijks" activeValue={tab}>
        <DagelijksTab />
      </NestoTabContent>
      <NestoTabContent value="templates" activeValue={tab}>
        <TemplatesTab />
      </NestoTabContent>
    </div>
  );
}
