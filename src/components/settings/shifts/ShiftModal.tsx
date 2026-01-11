import { useState, useEffect, useMemo } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { FormSection } from "@/components/polar/FormSection";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCreateShift, useUpdateShift, getNextShiftSortOrder, useAllShifts } from "@/hooks/useShifts";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { checkShiftOverlap, formatOverlapError } from "@/lib/shiftValidation";
import { ALL_WEEKDAYS, DAY_LABELS, ARRIVAL_INTERVALS, type Shift, type ArrivalInterval } from "@/types/shifts";

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
    const trimmedShortName = shortName.trim();

    if (!trimmedName) {
      setError("Naam is verplicht.");
      return;
    }
    if (trimmedName.length > 50) {
      setError("Naam mag maximaal 50 tekens zijn.");
      return;
    }
    if (!trimmedShortName) {
      setError("Korte naam is verplicht.");
      return;
    }
    if (trimmedShortName.length > 4) {
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
            short_name: trimmedShortName,
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
            short_name: trimmedShortName,
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name fields */}
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
            onChange={(e) => setShortName(e.target.value)}
            placeholder="LUN"
            maxLength={4}
          />
        </div>

        {/* Time fields */}
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

        {/* Days of week */}
        <FormSection title="Actieve dagen">
          <div className="flex flex-wrap gap-3">
            {ALL_WEEKDAYS.map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  checked={selectedDays.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <span className="text-sm">{DAY_LABELS[day]}</span>
              </label>
            ))}
          </div>
        </FormSection>

        {/* Settings row */}
        <div className="grid grid-cols-2 gap-4">
          <NestoSelect
            label="Aankomst interval"
            value={interval.toString()}
            onValueChange={(v) => setInterval(parseInt(v) as ArrivalInterval)}
            options={INTERVAL_OPTIONS}
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Kleur</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-9 rounded-md border border-input cursor-pointer"
            />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
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
