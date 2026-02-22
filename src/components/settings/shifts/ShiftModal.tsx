import { useState, useEffect, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { useCreateShift, useUpdateShift, getNextShiftSortOrder, useAllShifts } from "@/hooks/useShifts";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { checkShiftOverlap, formatOverlapError } from "@/lib/shiftValidation";
import { ALL_WEEKDAYS, DAY_LABELS, ARRIVAL_INTERVALS, type Shift, type ArrivalInterval } from "@/types/shifts";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  editingShift: Shift | null;
}

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

const DEFAULT_COLOR = "#1d979e";

// Preset colors for shift selection
const PRESET_COLORS = [
  { value: "#1d979e", label: "Teal" },
  { value: "#3B82F6", label: "Blauw" },
  { value: "#8B5CF6", label: "Paars" },
  { value: "#EC4899", label: "Roze" },
  { value: "#F97316", label: "Oranje" },
  { value: "#EAB308", label: "Geel" },
  { value: "#22C55E", label: "Groen" },
];

// Generate short name suggestion from full name
function generateShortName(name: string): string {
  const trimmed = name.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return trimmed;
  
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    // Multiple words: take first letter of each (max 4)
    return words.map(w => w[0]).join("").slice(0, 4);
  }
  // Single word: take first 3 characters
  return trimmed.slice(0, 3);
}

export function ShiftModal({ open, onOpenChange, locationId, editingShift }: ShiftModalProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("15:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [interval, setInterval] = useState<ArrivalInterval>(15);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState("");

  const { data: allShifts = [] } = useAllShifts(locationId);
  const { mutate: createShift, isPending: isCreating } = useCreateShift();
  const { mutate: updateShift, isPending: isUpdating } = useUpdateShift();

  const isEditing = !!editingShift;
  const isPending = isCreating || isUpdating;

  // Auto-suggest short name based on name input
  const suggestedShortName = useMemo(() => generateShortName(name), [name]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editingShift) {
        setName(editingShift.name);
        setShortName(editingShift.short_name);
        // Convert HH:MM:SS to HH:MM for selects
        setStartTime(editingShift.start_time.slice(0, 5));
        setEndTime(editingShift.end_time.slice(0, 5));
        setSelectedDays([...editingShift.days_of_week]);
        setInterval(editingShift.arrival_interval_minutes);
        setColor(editingShift.color);
      } else {
        setName("");
        setShortName("");
        setStartTime("12:00");
        setEndTime("15:00");
        setSelectedDays([1, 2, 3, 4, 5]);
        setInterval(15);
        setColor(DEFAULT_COLOR);
      }
      setError("");
    }
  }, [open, editingShift]);

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    const trimmedName = name.trim();
    // Use manual input or fall back to suggestion
    const finalShortName = shortName.trim() || suggestedShortName;

    if (!trimmedName) {
      setError("Naam is verplicht.");
      return;
    }
    if (trimmedName.length > 50) {
      setError("Naam mag maximaal 50 tekens zijn.");
      return;
    }
    if (!finalShortName) {
      setError("Korte naam is verplicht.");
      return;
    }
    if (finalShortName.length > 4) {
      setError("Korte naam mag maximaal 4 tekens zijn.");
      return;
    }

    // Validate times
    if (startTime >= endTime) {
      setError("Eindtijd moet na starttijd liggen.");
      return;
    }

    // Validate days
    if (selectedDays.length === 0) {
      setError("Selecteer minimaal één dag.");
      return;
    }

    // CHECK OVERLAP - BLOCKS SAVE
    const overlapResult = checkShiftOverlap(
      { start_time: startTime, end_time: endTime, days_of_week: selectedDays },
      allShifts,
      editingShift?.id
    );

    if (overlapResult.hasOverlap) {
      setError(formatOverlapError(overlapResult.conflicts));
      return; // BLOCK SAVE
    }

    try {
      if (isEditing) {
        updateShift(
          {
            id: editingShift.id,
            name: trimmedName,
            short_name: finalShortName,
            start_time: startTime,
            end_time: endTime,
            days_of_week: selectedDays,
            arrival_interval_minutes: interval,
            color,
          },
          {
            onSuccess: () => onOpenChange(false),
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
            },
          }
        );
      } else {
        const sortOrder = await getNextShiftSortOrder(locationId);
        createShift(
          {
            location_id: locationId,
            name: trimmedName,
            short_name: finalShortName,
            start_time: startTime,
            end_time: endTime,
            days_of_week: selectedDays,
            arrival_interval_minutes: interval,
            color,
            sort_order: sortOrder,
          },
          {
            onSuccess: () => onOpenChange(false),
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
            },
          }
        );
      }
    } catch (err) {
      const parsed = parseSupabaseError(err);
      setError(parsed.message);
    }
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Shift bewerken" : "Nieuwe shift"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Naam en identificatie */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Naam en identificatie</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <NestoInput
                label="Naam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Lunch"
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

        {/* Section: Tijden */}
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
        </div>

        <div className="border-t border-border" />

        {/* Section: Actieve dagen - Toggle buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Actieve dagen</h4>
          <div className="flex gap-2">
            {ALL_WEEKDAYS.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-3 py-1.5 rounded-control text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {DAY_LABELS[day]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Section: Instellingen */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Instellingen</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <NestoSelect
              label="Aankomst interval"
              value={interval.toString()}
              onValueChange={(v) => setInterval(parseInt(v) as ArrivalInterval)}
              options={INTERVAL_OPTIONS}
            />
            
            {/* Preset color picker */}
            <div className="space-y-1.5">
              <label className="text-caption uppercase text-muted-foreground">
                Kleur
              </label>
              <div className="flex gap-2 pt-1">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all flex items-center justify-center",
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
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <NestoButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending}>
            {isPending ? "Opslaan..." : isEditing ? "Opslaan" : "Aanmaken"}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
