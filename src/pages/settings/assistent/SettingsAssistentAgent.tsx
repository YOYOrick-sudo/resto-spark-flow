import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { AgentConfigTab } from "@/components/settings/assistant/AgentConfigTab";

export default function SettingsAssistentAgent() {
  return (
    <SettingsDetailLayout
      title="AI Assistent"
      description="Persoonlijkheid, toon en gedrag."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Assistent", path: "/instellingen/assistent" },
        { label: "AI Assistent" },
      ]}
    >
      <AgentConfigTab />
    </SettingsDetailLayout>
  );
}
