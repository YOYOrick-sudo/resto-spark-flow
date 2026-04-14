import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { TeamOwnersSection } from "@/components/onboarding/settings";

export default function SettingsOnboardingTeam() {
  return (
    <SettingsDetailLayout
      title="Team"
      description="Team beheer en rollen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Onboarding", path: "/instellingen/onboarding" },
        { label: "Team" },
      ]}
    >
      <TeamOwnersSection />
    </SettingsDetailLayout>
  );
}
