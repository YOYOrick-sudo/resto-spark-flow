import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { KnowledgeBaseTab } from "@/components/settings/assistant/KnowledgeBaseTab";

export default function SettingsAssistentKnowledge() {
  return (
    <SettingsDetailLayout
      title="Knowledge Base"
      description="Veelgestelde vragen en restaurant kennis."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Assistent", path: "/instellingen/assistent" },
        { label: "Knowledge Base" },
      ]}
    >
      <KnowledgeBaseTab />
    </SettingsDetailLayout>
  );
}
