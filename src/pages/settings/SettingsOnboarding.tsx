import { useState } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { usePermission } from '@/hooks/usePermission';
import { EmptyState } from '@/components/polar/EmptyState';
import { TitleHelp } from '@/components/polar/TitleHelp';
import {
  PhaseConfigSection,
  TeamOwnersSection,
  EmailTemplatesSection,
  ReminderSettingsSection,
} from '@/components/onboarding/settings';

const TABS = [
  { id: 'phases', label: 'Fasen' },
  { id: 'team', label: 'Team' },
  { id: 'templates', label: 'E-mailtemplates' },
  { id: 'reminders', label: 'Reminders' },
];

export default function SettingsOnboarding() {
  const [activeTab, setActiveTab] = useState('phases');
  const hasPermission = usePermission('onboarding.settings');

  if (!hasPermission) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <EmptyState
          title="Geen toegang"
          description="Je hebt geen rechten om de onboarding instellingen te beheren."
        />
      </div>
    );
  }

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Onboarding
          <TitleHelp title="Wat is onboarding?">
            <p className="text-muted-foreground">Het inwerkproces voor nieuwe medewerkers. Configureer fases, taken en communicatie.</p>
          </TitleHelp>
        </span>
      }
      description="Beheer de onboarding pipeline, email templates en herinneringen."
      breadcrumbs={[
        { label: 'Instellingen', path: '/instellingen/voorkeuren' },
        { label: 'Onboarding' },
      ]}
    >
      <NestoTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <NestoTabContent value="phases" activeValue={activeTab}>
        <PhaseConfigSection />
      </NestoTabContent>

      <NestoTabContent value="team" activeValue={activeTab}>
        <TeamOwnersSection />
      </NestoTabContent>

      <NestoTabContent value="templates" activeValue={activeTab}>
        <EmailTemplatesSection />
      </NestoTabContent>

      <NestoTabContent value="reminders" activeValue={activeTab}>
        <ReminderSettingsSection />
      </NestoTabContent>
    </SettingsDetailLayout>
  );
}
