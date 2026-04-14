import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { PermissionsTab } from "@/components/settings/assistant/PermissionsTab";

export default function SettingsAssistentPermissions() {
  return (
    <SettingsDetailLayout
      title="Bevoegdheden"
      description="Autonomie per taak instellen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Assistent", path: "/instellingen/assistent" },
        { label: "Bevoegdheden" },
      ]}
    >
      <PermissionsTab />
    </SettingsDetailLayout>
  );
}
