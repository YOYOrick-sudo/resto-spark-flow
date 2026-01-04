import { useState, useEffect } from "react";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { useReservationSettings, useUpsertReservationSettings, defaultReservationSettings } from "@/hooks/useReservationSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface LocationSettingsCardProps {
  locationId: string | undefined;
}

export function LocationSettingsCard({ locationId }: LocationSettingsCardProps) {
  const { data: settings, isLoading } = useReservationSettings(locationId);
  const { mutate: upsertSettings, isPending } = useUpsertReservationSettings();
  
  // Local state for immediate UI feedback
  const [localSettings, setLocalSettings] = useState({
    allow_multi_table: defaultReservationSettings.allow_multi_table,
    auto_assign: defaultReservationSettings.auto_assign,
    default_duration_minutes: defaultReservationSettings.default_duration_minutes,
    booking_cutoff_minutes: defaultReservationSettings.booking_cutoff_minutes,
    default_buffer_minutes: defaultReservationSettings.default_buffer_minutes,
  });
  
  // Saved indicator state
  const [showSaved, setShowSaved] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        allow_multi_table: settings.allow_multi_table,
        auto_assign: settings.auto_assign,
        default_duration_minutes: settings.default_duration_minutes,
        booking_cutoff_minutes: settings.booking_cutoff_minutes,
        default_buffer_minutes: settings.default_buffer_minutes,
      });
    }
  }, [settings]);

  // Debounced save for number inputs (500ms)
  const debouncedSave = useDebouncedCallback(
    (updates: Partial<typeof localSettings>) => {
      if (!locationId) return;
      upsertSettings(
        { location_id: locationId, ...updates },
        {
          onSuccess: () => {
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
          }
        }
      );
    },
    500
  );

  // Toggle handler (immediate save)
  const handleToggle = (field: 'allow_multi_table' | 'auto_assign', value: boolean) => {
    if (!locationId) return;
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    upsertSettings(
      { location_id: locationId, [field]: value },
      {
        onSuccess: () => {
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }
      }
    );
  };

  // Number input handler (debounced save)
  const handleNumberChange = (
    field: 'default_duration_minutes' | 'booking_cutoff_minutes' | 'default_buffer_minutes',
    value: number
  ) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    debouncedSave({ [field]: value });
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Locatie Instellingen</h3>
          <p className="text-sm text-muted-foreground">
            Algemene reserveringsinstellingen voor deze locatie.
          </p>
        </div>
        <div className="h-5 min-w-20 flex items-center justify-end">
          {isPending ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Opslaan...
            </span>
          ) : showSaved ? (
            <span className="text-xs text-success flex items-center gap-1">
              <Check className="h-3 w-3" />
              Opgeslagen
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_multi_table" className="text-sm font-medium">
                Multi-tafel reserveringen toestaan
              </Label>
              <p className="text-xs text-muted-foreground">
                Gasten kunnen meerdere tafels in één reservering boeken.
              </p>
            </div>
            <Switch
              id="allow_multi_table"
              checked={localSettings.allow_multi_table}
              onCheckedChange={(checked) => handleToggle('allow_multi_table', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_assign" className="text-sm font-medium">
                Automatisch tafels toewijzen
              </Label>
              <p className="text-xs text-muted-foreground">
                Systeem wijst automatisch de beste tafel toe bij nieuwe reserveringen.
              </p>
            </div>
            <Switch
              id="auto_assign"
              checked={localSettings.auto_assign}
              onCheckedChange={(checked) => handleToggle('auto_assign', checked)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Number inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <NestoInput
              label="Standaard reserveringsduur (min)"
              type="number"
              min={15}
              max={480}
              step={15}
              value={localSettings.default_duration_minutes}
              onChange={(e) => handleNumberChange('default_duration_minutes', parseInt(e.target.value) || 120)}
            />
          </div>
          <div>
            <NestoInput
              label="Min. boekingstijd vooraf (min)"
              type="number"
              min={0}
              max={1440}
              step={15}
              value={localSettings.booking_cutoff_minutes}
              onChange={(e) => handleNumberChange('booking_cutoff_minutes', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <NestoInput
              label="Buffer tussen reserveringen (min)"
              type="number"
              min={0}
              max={120}
              step={5}
              value={localSettings.default_buffer_minutes}
              onChange={(e) => handleNumberChange('default_buffer_minutes', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    </NestoCard>
  );
}
