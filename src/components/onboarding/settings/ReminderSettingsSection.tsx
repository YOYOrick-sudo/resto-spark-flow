import { useState, useEffect } from 'react';
import { useOnboardingSettings, useUpdateOnboardingSettings } from '@/hooks/useOnboardingSettings';
import { NestoCard } from '@/components/polar/NestoCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Check } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface ReminderConfig {
  reminder_enabled?: boolean;
  first_reminder_hours?: number;
  urgent_reminder_hours?: number;
  no_response_days?: number;
}

export function ReminderSettingsSection() {
  const { data: settings, isLoading } = useOnboardingSettings();
  const updateSettings = useUpdateOnboardingSettings();
  const [saved, setSaved] = useState(false);

  const config = (settings?.reminder_config as unknown as ReminderConfig) || {};
  const [localConfig, setLocalConfig] = useState<ReminderConfig>(config);

  useEffect(() => {
    if (settings?.reminder_config) {
      setLocalConfig(settings.reminder_config as unknown as ReminderConfig);
    }
  }, [settings?.reminder_config]);

  const saveConfig = (newConfig: ReminderConfig) => {
    updateSettings.mutate(
      { reminder_config: newConfig as unknown as Json },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  const debouncedSave = useDebouncedCallback((newConfig: ReminderConfig) => {
    saveConfig(newConfig);
  }, 800);

  const updateField = (field: keyof ReminderConfig, value: any) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);

    if (field === 'reminder_enabled') {
      saveConfig(updated);
    } else {
      debouncedSave(updated);
    }
  };

  if (isLoading) return <CardSkeleton lines={4} />;

  const enabled = localConfig.reminder_enabled ?? true;

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">Automatische herinneringen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stuur automatisch herinneringen wanneer taken te lang openstaan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" />
            Opgeslagen
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(val) => updateField('reminder_enabled', val)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm min-w-[200px]">1e herinnering na</Label>
          <div className="flex">
            <Input
              type="number"
              value={localConfig.first_reminder_hours ?? 24}
              onChange={(e) => updateField('first_reminder_hours', parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-sm tabular-nums rounded-r-none border-r-0"
              disabled={!enabled}
              min={1}
            />
            <span className="inline-flex items-center bg-secondary border border-border rounded-r-button px-3 text-xs text-muted-foreground">uur</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm min-w-[200px]">2e herinnering (urgent) na</Label>
          <div className="flex">
            <Input
              type="number"
              value={localConfig.urgent_reminder_hours ?? 48}
              onChange={(e) => updateField('urgent_reminder_hours', parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-sm tabular-nums rounded-r-none border-r-0"
              disabled={!enabled}
              min={1}
            />
            <span className="inline-flex items-center bg-secondary border border-border rounded-r-button px-3 text-xs text-muted-foreground">uur</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm min-w-[200px]">Auto-markering 'geen reactie' na</Label>
          <div className="flex">
            <Input
              type="number"
              value={localConfig.no_response_days ?? 7}
              onChange={(e) => updateField('no_response_days', parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-sm tabular-nums rounded-r-none border-r-0"
              disabled={!enabled}
              min={1}
            />
            <span className="inline-flex items-center bg-secondary border border-border rounded-r-button px-3 text-xs text-muted-foreground">dagen</span>
          </div>
        </div>
      </div>
    </NestoCard>
  );
}
