import { useState, useEffect } from 'react';
import { useOnboardingSettings, useUpdateOnboardingSettings } from '@/hooks/useOnboardingSettings';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Check } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface EmailConfig {
  sender_name?: string;
  reply_to?: string;
}

export function EmailConfigSection() {
  const { data: settings, isLoading } = useOnboardingSettings();
  const updateSettings = useUpdateOnboardingSettings();
  const [saved, setSaved] = useState(false);

  const config = (settings?.email_config as unknown as EmailConfig) || {};
  const [localConfig, setLocalConfig] = useState<EmailConfig>(config);

  useEffect(() => {
    if (settings?.email_config) {
      setLocalConfig(settings.email_config as unknown as EmailConfig);
    }
  }, [settings?.email_config]);

  const debouncedSave = useDebouncedCallback((newConfig: EmailConfig) => {
    updateSettings.mutate(
      { email_config: newConfig as unknown as Json },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }, 800);

  const updateField = (field: keyof EmailConfig, value: string) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
    debouncedSave(updated);
  };

  if (isLoading) return <CardSkeleton lines={3} />;

  return (
    <div className="space-y-4">
      <NestoCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Afzender configuratie</h3>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3 w-3" />
              Opgeslagen
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5">Afzendernaam</Label>
            <Input
              value={localConfig.sender_name || ''}
              onChange={(e) => updateField('sender_name', e.target.value)}
              placeholder="Bijv. Restaurant De Kok"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deze naam verschijnt als afzender in emails naar kandidaten.
            </p>
          </div>

          <div>
            <Label className="text-sm mb-1.5">Reply-to adres</Label>
            <Input
              type="email"
              value={localConfig.reply_to || ''}
              onChange={(e) => updateField('reply_to', e.target.value)}
              placeholder="Bijv. info@restaurantdekok.nl"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Antwoorden van kandidaten worden naar dit adres gestuurd.
            </p>
          </div>
        </div>
      </NestoCard>

      <InfoAlert
        title="Platform domein"
        variant="info"
      >
        Het afzenderdomein (@nesto.app) wordt beheerd op platform-niveau en is niet per locatie aanpasbaar.
      </InfoAlert>
    </div>
  );
}
