import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { ReminderSettingsSection } from "@/components/onboarding/settings";

export default function SettingsOnboardingReminders() {
  return (
    <SettingsDetailLayout
      title="Reminders"
      description="Automatische herinneringen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Onboarding", path: "/instellingen/onboarding" },
        { label: "Reminders" },
      ]}
    >
      <ReminderSettingsSection />
    </SettingsDetailLayout>
  );
}
