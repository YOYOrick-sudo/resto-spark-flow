import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { EmailTemplatesSection } from "@/components/onboarding/settings";

export default function SettingsOnboardingTemplates() {
  return (
    <SettingsDetailLayout
      title="E-mailtemplates"
      description="E-mail templates voor kandidaten."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Onboarding", path: "/instellingen/onboarding" },
        { label: "E-mailtemplates" },
      ]}
    >
      <EmailTemplatesSection />
    </SettingsDetailLayout>
  );
}
