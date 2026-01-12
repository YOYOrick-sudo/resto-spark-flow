import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { cn } from "@/lib/utils";
import {
  useCreateShiftException,
  useUpdateShiftException,
} from "@/hooks/useShiftExceptions";
import type { Shift, ShiftException, ShiftExceptionType } from "@/types/shifts";

interface ShiftExceptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  shifts: Shift[];
  editingException?: ShiftException | null;
  defaultDate?: Date;
  defaultType?: ShiftExceptionType;
}

// Generate time options in 15-min intervals
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4).toString().padStart(2, "0");
  const mins = ((i % 4) * 15).toString().padStart(2, "0");
  return { value: `${hours}:${mins}`, label: `${hours}:${mins}` };
});

export function ShiftExceptionModal({
  open,
  onOpenChange,
  locationId,
  shifts,
  editingException,
  defaultDate,
  defaultType,
}: ShiftExceptionModalProps) {
  const createMutation = useCreateShiftException();
  const updateMutation = useUpdateShiftException();
  const isEditing = !!editingException;

  // Form state
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [type, setType] = useState<ShiftExceptionType>(defaultType || "closed");
  const [shiftId, setShiftId] = useState<string>("all");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("22:00");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Reset form when modal opens or editingException changes
  useEffect(() => {
    if (open) {
      if (editingException) {
        setDate(new Date(editingException.exception_date));
        setType(editingException.exception_type);
        setShiftId(editingException.shift_id || "all");
        setStartTime(editingException.override_start_time?.slice(0, 5) || "12:00");
        setEndTime(editingException.override_end_time?.slice(0, 5) || "22:00");
        setLabel(editingException.label || "");
        setNotes(editingException.notes || "");
      } else {
        setDate(defaultDate);
        setType(defaultType || "closed");
        setShiftId("all");
        setStartTime("12:00");
        setEndTime("22:00");
        setLabel("");
        setNotes("");
      }
    }
  }, [open, editingException, defaultDate, defaultType]);

  // Validation
  const isLocationWideClosed = type === "closed" && shiftId === "all";
  const timesValid = useMemo(() => {
    if (type !== "modified") return true;
    return startTime < endTime;
  }, [type, startTime, endTime]);
  const canSave = date && timesValid;

  const handleSave = async () => {
    if (!date || !canSave) return;

    const exceptionDate = format(date, "yyyy-MM-dd");

    if (isEditing && editingException) {
      await updateMutation.mutateAsync({
        id: editingException.id,
        exception_type: type,
        override_start_time: type === "modified" ? `${startTime}:00` : null,
        override_end_time: type === "modified" ? `${endTime}:00` : null,
        label: label || null,
        notes: notes || null,
      });
    } else {
      await createMutation.mutateAsync({
        location_id: locationId,
        exception_date: exceptionDate,
        exception_type: type,
        shift_id: shiftId === "all" ? null : shiftId,
        override_start_time: type === "modified" ? `${startTime}:00` : null,
        override_end_time: type === "modified" ? `${endTime}:00` : null,
        label: label || null,
        notes: notes || null,
      });
    }

    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Build scope options
  const scopeOptions = [
    { value: "all", label: "Alle shifts" },
    ...shifts.filter((s) => s.is_active).map((shift) => ({
      value: shift.id,
      label: shift.name,
    })),
  ];

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Uitzondering bewerken" : "Nieuwe uitzondering"}
      description="Dit zijn reserveringstijden, niet openingstijden."
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuleren
          </NestoButton>
          <NestoButton onClick={handleSave} disabled={!canSave || isPending}>
            {isPending ? "Opslaan..." : isEditing ? "Opslaan" : "Toevoegen"}
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Datum</label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <NestoButton
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={isEditing}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "d MMMM yyyy", { locale: nl }) : "Kies een datum"}
              </NestoButton>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDatePickerOpen(false);
                }}
                locale={nl}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Type selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Type uitzondering</label>
          <RadioGroup
            value={type}
            onValueChange={(v) => setType(v as ShiftExceptionType)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="closed" id="type-closed" />
              <label htmlFor="type-closed" className="text-sm font-normal cursor-pointer">
                Gesloten (hele dag geen reserveringen)
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="modified" id="type-modified" />
              <label htmlFor="type-modified" className="text-sm font-normal cursor-pointer">
                Aangepaste tijden
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="special" id="type-special" />
              <label htmlFor="type-special" className="text-sm font-normal cursor-pointer">
                Speciaal (markering zonder wijziging)
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Scope selection */}
        {!isEditing && (
          <NestoSelect
            label="Scope"
            value={shiftId}
            onValueChange={setShiftId}
            options={scopeOptions}
          />
        )}

        {/* Location-wide closed warning */}
        {isLocationWideClosed && (
          <InfoAlert
            variant="warning"
            title="Let op"
            description="Dit sluit alle reserveringsmogelijkheden voor de hele dag."
          />
        )}

        {/* Time selection for modified type */}
        {type === "modified" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Reserveringstijden</label>
            <div className="flex items-center gap-3">
              <NestoSelect
                value={startTime}
                onValueChange={setStartTime}
                options={TIME_OPTIONS}
                className="w-[120px]"
              />
              <span className="text-muted-foreground text-sm">tot</span>
              <NestoSelect
                value={endTime}
                onValueChange={setEndTime}
                options={TIME_OPTIONS}
                className="w-[120px]"
              />
            </div>
            {!timesValid && (
              <p className="text-sm text-destructive">
                Eindtijd moet na starttijd liggen.
              </p>
            )}
          </div>
        )}

        {/* Label */}
        <NestoInput
          label="Label (optioneel)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="bijv. Kerst, Verbouwing, Privé-event"
        />

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Notities (optioneel)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Extra informatie..."
            rows={2}
          />
        </div>
      </div>
    </NestoModal>
  );
}
