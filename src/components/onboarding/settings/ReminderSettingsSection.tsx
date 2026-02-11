import { useState, useEffect } from 'react';
import { useOnboardingSettings, useUpdateOnboardingSettings } from '@/hooks/useOnboardingSettings';
import { NestoCard } from '@/components/polar/NestoCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { TitleHelp } from '@/components/polar/TitleHelp';
import { NestoBadge } from '@/components/polar/NestoBadge';
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
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold">Automatische herinneringen</h3>
            <TitleHelp title="Naar wie gaan reminders?">
              <p className="text-muted-foreground">Reminders worden verstuurd naar de verantwoordelijke van elke fase.</p>
              <p className="text-muted-foreground">Stel verantwoordelijken in via het tabblad 'Team'.</p>
            </TitleHelp>
          </div>
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
        {/* Grid-aligned rows */}
        <div className="grid grid-cols-[1fr_80px_auto] items-center gap-4">
          <Label className="text-sm">1e herinnering na</Label>
          <Input
            type="number"
            value={localConfig.first_reminder_hours ?? 24}
            onChange={(e) => updateField('first_reminder_hours', parseInt(e.target.value) || 0)}
            className="w-20 h-8 text-sm tabular-nums text-right"
            disabled={!enabled}
            min={1}
          />
          <span className="text-xs text-muted-foreground w-12">uur</span>
        </div>

        <div className="grid grid-cols-[1fr_80px_auto] items-center gap-4">
          <Label className="text-sm">2e herinnering (urgent) na</Label>
          <Input
            type="number"
            value={localConfig.urgent_reminder_hours ?? 48}
            onChange={(e) => updateField('urgent_reminder_hours', parseInt(e.target.value) || 0)}
            className="w-20 h-8 text-sm tabular-nums text-right"
            disabled={!enabled}
            min={1}
          />
          <span className="text-xs text-muted-foreground w-12">uur</span>
        </div>

        <div className="grid grid-cols-[1fr_80px_auto] items-center gap-4">
          <Label className="text-sm">Auto-markering 'geen reactie' na</Label>
          <Input
            type="number"
            value={localConfig.no_response_days ?? 7}
            onChange={(e) => updateField('no_response_days', parseInt(e.target.value) || 0)}
            className="w-20 h-8 text-sm tabular-nums text-right"
            disabled={!enabled}
            min={1}
          />
          <span className="text-xs text-muted-foreground w-12">dagen</span>
        </div>

        {/* Notification channels */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Notificatiekanalen</p>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Email</Label>
            <NestoBadge variant="primary" size="sm" dot>Altijd aan</NestoBadge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm">WhatsApp</Label>
              <NestoBadge variant="outline" size="sm">Binnenkort</NestoBadge>
            </div>
            <Switch checked={false} disabled />
          </div>
        </div>
      </div>

    </NestoCard>
  );
}
