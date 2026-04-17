import { useEffect, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useApplicationSettings, useUpdateApplicationSettings, ApplicationSettings } from '@/hooks/useApplicationSettings';
import { useCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoButton } from '@/components/polar/NestoButton';
import { SlugSection } from '@/components/onboarding/application-settings/SlugSection';
import { WelcomeContentSection } from '@/components/onboarding/application-settings/WelcomeContentSection';
import { PositionsEditor } from '@/components/onboarding/application-settings/PositionsEditor';
import { OptionalFieldsSection } from '@/components/onboarding/application-settings/OptionalFieldsSection';
import { SuccessMessageSection } from '@/components/onboarding/application-settings/SuccessMessageSection';
import { ShareSection } from '@/components/onboarding/application-settings/ShareSection';
import { ActivationSection } from '@/components/onboarding/application-settings/ActivationSection';

export default function SettingsOnboardingSollicitatiepagina() {
  const { currentLocation } = useUserContext();
  const { data: settings, isLoading } = useApplicationSettings(currentLocation?.id);
  const { data: comm } = useCommunicationSettings();
  const update = useUpdateApplicationSettings();

  const [draft, setDraft] = useState<ApplicationSettings | null>(null);
  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  const isDirty = !!(draft && settings && JSON.stringify(draft) !== JSON.stringify(settings));
  const canSave = !!draft && draft.available_positions.length > 0;

  const handleSave = () => {
    if (!draft || !canSave) return;
    update.mutate(draft);
  };
  const handleReset = () => { if (settings) setDraft(settings); };

  return (
    <SettingsDetailLayout
      title="Sollicitatiepagina"
      description="Configureer je publieke werken-bij pagina die kandidaten gebruiken om te solliciteren."
      breadcrumbs={[
        { label: 'Instellingen', path: '/instellingen/voorkeuren' },
        { label: 'Onboarding', path: '/instellingen/onboarding' },
        { label: 'Sollicitatiepagina' },
      ]}
    >
      {isLoading || !draft ? (
        <div className="text-sm text-muted-foreground">Laden…</div>
      ) : (
        <>
          <div className="space-y-8 pb-32">
            <SlugSection
              draft={draft}
              setDraft={setDraft}
              originalSlug={settings?.slug ?? draft.slug}
              isLive={settings?.is_active ?? false}
            />
            <Divider />
            <WelcomeContentSection draft={draft} setDraft={setDraft} />
            <Divider />
            <PositionsEditor draft={draft} setDraft={setDraft} />
            <Divider />
            <OptionalFieldsSection draft={draft} setDraft={setDraft} />
            <Divider />
            <SuccessMessageSection draft={draft} setDraft={setDraft} />
            <Divider />
            <ShareSection slug={draft.slug} brandColor={comm?.brand_color ?? null} />
            <Divider />
            <ActivationSection draft={draft} setDraft={setDraft} />
          </div>

          {isDirty && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
              <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {canSave ? 'Je hebt niet-opgeslagen wijzigingen' : 'Voeg minstens één functie toe om op te slaan'}
                </p>
                <div className="flex gap-2">
                  <NestoButton variant="secondary" size="sm" onClick={handleReset} disabled={update.isPending}>Annuleren</NestoButton>
                  <NestoButton variant="primary" size="sm" onClick={handleSave} disabled={!canSave || update.isPending}>
                    {update.isPending ? 'Opslaan…' : 'Wijzigingen opslaan'}
                  </NestoButton>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SettingsDetailLayout>
  );
}

const Divider = () => <div className="border-t border-border/50" />;