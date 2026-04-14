import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import AutomationFlowsTab from "@/components/marketing/settings/AutomationFlowsTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingFlows() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Automation Flows"
      description="Geautomatiseerde marketing flows."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Automation Flows" },
      ]}
    >
      <AutomationFlowsTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
