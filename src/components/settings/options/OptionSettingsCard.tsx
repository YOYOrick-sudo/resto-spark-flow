import { useState, useEffect } from "react";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useReservationSettings, useUpsertReservationSettings, defaultReservationSettings } from "@/hooks/useReservationSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { SettingsCardHeader, SettingsSaveIndicator } from "@/components/settings";

interface OptionSettingsCardProps {
  locationId: string | undefined;
}

export function OptionSettingsCard({ locationId }: OptionSettingsCardProps) {
  const { data: settings, isLoading } = useReservationSettings(locationId);
  const { mutate: upsertSettings, isPending } = useUpsertReservationSettings();

  const [localSettings, setLocalSettings] = useState({
    options_enabled: defaultReservationSettings.options_enabled,
    option_default_expiry_hours: defaultReservationSettings.option_default_expiry_hours,
    option_auto_release: defaultReservationSettings.option_auto_release,
  });

  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        options_enabled: settings.options_enabled,
        option_default_expiry_hours: settings.option_default_expiry_hours,
        option_auto_release: settings.option_auto_release,
      });
    }
  }, [settings]);

  const debouncedSave = useDebouncedCallback(
    (updates: Partial<typeof localSettings>) => {
      if (!locationId) return;
      upsertSettings(
        { location_id: locationId, ...updates },
        {
          onSuccess: () => {
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
          },
        }
      );
    },
    500
  );

  const handleToggle = (field: 'options_enabled' | 'option_auto_release', value: boolean) => {
    if (!locationId) return;
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
    upsertSettings(
      { location_id: locationId, [field]: value },
      {
        onSuccess: () => {
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        },
      }
    );
  };

  const handleNumberChange = (value: number) => {
    setLocalSettings((prev) => ({ ...prev, option_default_expiry_hours: value }));
    debouncedSave({ option_default_expiry_hours: value });
  };

  if (isLoading) {
    return (
      <NestoCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </NestoCard>
    );
  }

  return (
    <NestoCard className="p-6">
      <SettingsCardHeader
        title="Optie-reserveringen"
        description="Maak het mogelijk om reserveringen als optie aan te maken met een vervaldatum."
        helpText={
          <FieldHelp>
            <p className="text-muted-foreground">Sta toe dat reserveringen als optie (voorlopig) worden aangemaakt met een automatische vervaldatum.</p>
          </FieldHelp>
        }
        saveIndicator={
          <SettingsSaveIndicator
            state={isPending ? "saving" : showSaved ? "saved" : "idle"}
            variant="title-bar"
          />
        }
      />

      <div className="space-y-6">
        {/* Options enabled toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="options_enabled" className="text-sm font-medium">
              Opties inschakelen
            </Label>
            <p className="text-xs text-muted-foreground">
              Maak het mogelijk om reserveringen als optie aan te maken.
            </p>
          </div>
          <Switch
            id="options_enabled"
            checked={localSettings.options_enabled}
            onCheckedChange={(checked) => handleToggle("options_enabled", checked)}
          />
        </div>

        {localSettings.options_enabled && (
          <>
            <div className="border-t" />

            {/* Default expiry hours */}
            <div className="max-w-xs">
              <NestoInput
                label="Standaard vervaltijd (uren)"
                type="number"
                min={1}
                max={168}
                step={1}
                value={localSettings.option_default_expiry_hours}
                onChange={(e) =>
                  { const v = e.target.value; if (v === "") return; handleNumberChange(parseInt(v, 10) || 24); }
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Na hoeveel uur vervalt een optie automatisch.
              </p>
            </div>

            <div className="border-t" />

            {/* Auto release toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="option_auto_release" className="text-sm font-medium">
                  Automatisch vrijgeven
                </Label>
                <p className="text-xs text-muted-foreground">
                  Annuleer optie automatisch bij verval.
                </p>
              </div>
              <Switch
                id="option_auto_release"
                checked={localSettings.option_auto_release}
                onCheckedChange={(checked) => handleToggle("option_auto_release", checked)}
              />
            </div>
          </>
        )}
      </div>
    </NestoCard>
  );
}
