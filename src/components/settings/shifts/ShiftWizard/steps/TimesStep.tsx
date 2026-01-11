import { useMemo } from "react";
import { Check } from "lucide-react";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { useShiftWizard } from "../ShiftWizardContext";
import { ALL_WEEKDAYS, DAY_LABELS, ARRIVAL_INTERVALS, type ArrivalInterval } from "@/types/shifts";
import { cn } from "@/lib/utils";

// Polar-muted standard colors - recognizable but desaturated
const SHIFT_COLORS = [
  { value: "#1d979e", label: "Teal" },       // Primary brand
  { value: "#C45C5C", label: "Rood" },       // Muted red
  { value: "#CC8544", label: "Oranje" },     // Muted orange
  { value: "#C4A94D", label: "Geel" },       // Muted gold
  { value: "#5A9E6B", label: "Groen" },      // Muted green
  { value: "#5B7FA6", label: "Blauw" },      // Muted blue
  { value: "#8B6B9E", label: "Paars" },      // Muted purple
  { value: "#B87A8E", label: "Roze" },       // Muted pink
];

// Generate time options (00:00 to 23:30 in 30-min steps)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return { value: `${hours}:${minutes}`, label: `${hours}:${minutes}` };
});

const INTERVAL_OPTIONS = ARRIVAL_INTERVALS.map((v) => ({
  value: v.toString(),
  label: v === 60 ? "1 uur" : `${v} min`,
}));

// Generate short name suggestion from full name
function generateShortName(name: string): string {
  const trimmed = name.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return trimmed;
  
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words.map(w => w[0]).join("").slice(0, 4);
  }
  return trimmed.slice(0, 3);
}

export function TimesStep() {
  const {
    name,
    setName,
    shortName,
    setShortName,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    daysOfWeek,
    toggleDay,
    interval,
    setInterval,
    color,
    setColor,
    error,
  } = useShiftWizard();

  const suggestedShortName = useMemo(() => generateShortName(name), [name]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Wanneer is deze shift actief?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Definieer de basisinstellingen voor deze shift. Deze bepalen wanneer gasten kunnen reserveren.
        </p>
      </div>

      {/* Name section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Naam en identificatie</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <NestoInput
              label="Naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Lunch, Diner, Brunch"
              maxLength={50}
            />
          </div>
          <NestoInput
            label="Korte naam"
            value={shortName}
            onChange={(e) => setShortName(e.target.value.toUpperCase())}
            placeholder={suggestedShortName || "LUN"}
            maxLength={4}
          />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Time section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Tijden</h4>
        <div className="grid grid-cols-2 gap-4">
          <NestoSelect
            label="Starttijd"
            value={startTime}
            onValueChange={setStartTime}
            options={TIME_OPTIONS}
          />
          <NestoSelect
            label="Eindtijd"
            value={endTime}
            onValueChange={setEndTime}
            options={TIME_OPTIONS}
          />
        </div>
        {startTime >= endTime && (
          <p className="text-sm text-destructive">Eindtijd moet na starttijd liggen.</p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Days section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Actieve dagen</h4>
        <div className="flex gap-1.5">
          {ALL_WEEKDAYS.map((day) => {
            const isSelected = daysOfWeek.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "w-10 h-10 rounded-button text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
        {daysOfWeek.length === 0 && (
          <p className="text-sm text-destructive">Selecteer minimaal één dag.</p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Interval section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Aankomst interval</h4>
        <div className="max-w-xs">
          <NestoSelect
            label="Interval"
            value={interval.toString()}
            onValueChange={(v) => setInterval(parseInt(v) as ArrivalInterval)}
            options={INTERVAL_OPTIONS}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Dit bepaalt met welke tussenpozen gasten kunnen aankomen (bijv. 12:00, 12:15, 12:30...).
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Color section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Kleur</h4>
        <div className="flex gap-2">
          {SHIFT_COLORS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setColor(preset.value)}
              className={cn(
                "w-9 h-9 rounded-full transition-all flex items-center justify-center",
                color === preset.value && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
            >
              {color === preset.value && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Deze kleur wordt gebruikt in het reserveringenoverzicht.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <InfoAlert variant="error" title={error} />
      )}
    </div>
  );
}
