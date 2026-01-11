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
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Wanneer is deze shift actief?</h3>

      {/* Name + Times row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <NestoInput
            label="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Lunch, Diner"
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

      {/* Times row */}
      <div className="grid grid-cols-2 gap-3">
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
        <p className="text-sm text-destructive -mt-2">Eindtijd moet na starttijd liggen.</p>
      )}

      {/* Days row */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">Actieve dagen</span>
        <div className="flex gap-1.5">
          {ALL_WEEKDAYS.map((day) => {
            const isSelected = daysOfWeek.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "w-9 h-9 rounded-button text-sm font-medium transition-colors",
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

      {/* Interval + Color row */}
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="max-w-[180px]">
          <NestoSelect
            label="Aankomst interval"
            value={interval.toString()}
            onValueChange={(v) => setInterval(parseInt(v) as ArrivalInterval)}
            options={INTERVAL_OPTIONS}
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Kleur</span>
          <div className="flex gap-1.5">
            {SHIFT_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setColor(preset.value)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all flex items-center justify-center",
                  color === preset.value && "ring-2 ring-offset-1 ring-primary"
                )}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
              >
                {color === preset.value && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && <InfoAlert variant="error" title={error} />}
    </div>
  );
}
