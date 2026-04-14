import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { PhaseConfigSection } from "@/components/onboarding/settings";

export default function SettingsOnboardingFasen() {
  return (
    <SettingsDetailLayout
      title="Fasen"
      description="Onboarding pipeline en stappen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Onboarding", path: "/instellingen/onboarding" },
        { label: "Fasen" },
      ]}
    >
      <PhaseConfigSection />
    </SettingsDetailLayout>
  );
}
