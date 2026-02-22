import { useState, useEffect } from 'react';
import { NestoCard, NestoCardHeader, NestoCardTitle, NestoCardContent, NestoCardFooter } from '@/components/polar/NestoCard';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import { FormSection, FormField } from '@/components/polar/FormSection';
import { TitleHelp } from '@/components/polar/TitleHelp';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

interface Props {
  readOnly: boolean;
}

export default function ReviewPlatformsTab({ readOnly }: Props) {
  const { currentLocation } = useUserContext();
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [tripadvisorUrl, setTripadvisorUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      setGooglePlaceId(currentLocation.google_place_id || '');
      setTripadvisorUrl(currentLocation.tripadvisor_url || '');
    }
  }, [currentLocation]);

  const handleSave = async () => {
    if (!currentLocation) return;
    setSaving(true);

    const { error } = await supabase
      .from('locations')
      .update({
        google_place_id: googlePlaceId || null,
        tripadvisor_url: tripadvisorUrl || null,
      })
      .eq('id', currentLocation.id);

    setSaving(false);

    if (error) {
      toast.error('Opslaan mislukt');
    } else {
      toast.success('Review platforms opgeslagen');
    }
  };

  return (
    <NestoCard>
      <NestoCardHeader>
        <NestoCardTitle>Review Platforms</NestoCardTitle>
      </NestoCardHeader>
      <NestoCardContent>
        <FormSection title="Google Reviews" description="Koppel je Google Business profiel om reviews automatisch op te halen.">
          <FormField label="Google Place ID">
            <div className="flex items-center gap-2">
              <NestoInput
                value={googlePlaceId}
                onChange={(e) => setGooglePlaceId(e.target.value)}
                placeholder="ChIJ..."
                disabled={readOnly}
                className="flex-1"
              />
              <TitleHelp title="Google Place ID">
                Te vinden in de URL van je Google Maps pagina. Zoek je restaurant op Google Maps en kopieer het Place ID uit de URL.
              </TitleHelp>
            </div>
          </FormField>
        </FormSection>

        <FormSection title="TripAdvisor" description="Voeg je TripAdvisor URL toe voor toekomstige integratie." className="mt-6">
          <FormField label="TripAdvisor URL">
            <NestoInput
              value={tripadvisorUrl}
              onChange={(e) => setTripadvisorUrl(e.target.value)}
              placeholder="https://www.tripadvisor.com/Restaurant_Review-..."
              disabled={readOnly}
              className="w-full"
            />
          </FormField>
        </FormSection>
      </NestoCardContent>
      {!readOnly && (
        <NestoCardFooter className="flex justify-end">
          <NestoButton onClick={handleSave} disabled={saving}>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </NestoButton>
        </NestoCardFooter>
      )}
    </NestoCard>
  );
}
