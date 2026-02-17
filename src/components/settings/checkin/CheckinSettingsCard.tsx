import { useState, useEffect } from "react";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { useReservationSettings, useUpsertReservationSettings, defaultReservationSettings } from "@/hooks/useReservationSettings";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface CheckinSettingsCardProps {
  locationId: string | undefined;
}

export function CheckinSettingsCard({ locationId }: CheckinSettingsCardProps) {
  const { data: settings, isLoading } = useReservationSettings(locationId);
  const { mutate: upsertSettings, isPending } = useUpsertReservationSettings();

  const [localSettings, setLocalSettings] = useState({
    checkin_window_minutes: defaultReservationSettings.checkin_window_minutes,
    auto_no_show_enabled: defaultReservationSettings.auto_no_show_enabled,
    no_show_after_minutes: defaultReservationSettings.no_show_after_minutes,
    move_to_now_on_checkin: defaultReservationSettings.move_to_now_on_checkin,
  });

  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        checkin_window_minutes: settings.checkin_window_minutes,
        auto_no_show_enabled: settings.auto_no_show_enabled,
        no_show_after_minutes: settings.no_show_after_minutes,
        move_to_now_on_checkin: settings.move_to_now_on_checkin,
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

  const handleToggle = (field: 'auto_no_show_enabled' | 'move_to_now_on_checkin', value: boolean) => {
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

  const handleNumberChange = (
    field: 'checkin_window_minutes' | 'no_show_after_minutes',
    value: number
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
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
          <h3 className="text-lg font-medium">Check-in & No-show</h3>
          <p className="text-sm text-muted-foreground">
            Regels voor inchecken en automatische no-show markering.
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
        {/* Check-in window */}
        <div className="max-w-xs">
          <NestoInput
            label="Check-in window (minuten)"
            type="number"
            min={0}
            max={120}
            step={5}
            value={localSettings.checkin_window_minutes}
            onChange={(e) =>
              handleNumberChange("checkin_window_minutes", parseInt(e.target.value) || 15)
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            Gasten kunnen dit aantal minuten voor hun reserveringstijd inchecken.
          </p>
        </div>

        <div className="border-t" />

        {/* Auto no-show toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto_no_show" className="text-sm font-medium">
              Automatisch no-show markeren
            </Label>
            <p className="text-xs text-muted-foreground">
              Markeer gasten automatisch als no-show na de ingestelde tijd.
            </p>
          </div>
          <Switch
            id="auto_no_show"
            checked={localSettings.auto_no_show_enabled}
            onCheckedChange={(checked) => handleToggle("auto_no_show_enabled", checked)}
          />
        </div>

        {/* No-show after minutes — conditioneel */}
        {localSettings.auto_no_show_enabled && (
          <div className="max-w-xs pl-0">
            <NestoInput
              label="No-show na (minuten)"
              type="number"
              min={5}
              max={120}
              step={5}
              value={localSettings.no_show_after_minutes}
              onChange={(e) =>
                handleNumberChange("no_show_after_minutes", parseInt(e.target.value) || 15)
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markeer als no-show dit aantal minuten na de reserveringstijd.
            </p>
          </div>
        )}

        <div className="border-t" />

        {/* Move to now toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="move_to_now" className="text-sm font-medium">
              Verplaats starttijd naar nu
            </Label>
            <p className="text-xs text-muted-foreground">
              Zet de starttijd op het moment van inchecken.
            </p>
          </div>
          <Switch
            id="move_to_now"
            checked={localSettings.move_to_now_on_checkin}
            onCheckedChange={(checked) => handleToggle("move_to_now_on_checkin", checked)}
          />
        </div>
      </div>
    </NestoCard>
  );
}
