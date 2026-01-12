// ============================================
// FASE 4.3.D: Bulk Exception Modal
// Enterprise-grade bulk exception generator
// Using NestoModal for consistent Polar styling
// ============================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, addYears } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Repeat } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NestoButton, NestoInput, NestoSelect, NestoModal } from "@/components/polar";
import { useShiftExceptions, useBulkCreateShiftExceptions } from "@/hooks/useShiftExceptions";
import {
  generateDates,
  validateGeneratorConfig,
  getCountWarning,
  NTH_OPTIONS,
  WEEKDAY_OPTIONS,
  type RepeatMode,
  type GeneratorPattern,
  type NthWeek,
  type GeneratedDate,
} from "@/lib/bulkExceptionGenerator";
import {
  BulkExceptionPreview,
  detectConflicts,
  type ConflictResolution,
  type ConflictCheckResult,
} from "./BulkExceptionPreview";
import type { Shift, ShiftExceptionType, CreateShiftExceptionInput } from "@/types/shifts";
import { cn } from "@/lib/utils";

// ============================================
// Props
// ============================================

interface BulkExceptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  shifts: Shift[];
}

// ============================================
// Constants
// ============================================

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const value = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  return { value, label: value };
});

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString(),
}));

const NTH_SELECT_OPTIONS = NTH_OPTIONS.map((n) => ({
  value: n.value.toString(),
  label: n.label,
}));

const WEEKDAY_SELECT_OPTIONS = WEEKDAY_OPTIONS.map((w) => ({
  value: w.value.toString(),
  label: w.label,
}));

const EXCEPTION_TYPE_OPTIONS = [
  { value: "closed", label: "Gesloten" },
  { value: "modified", label: "Aangepaste tijden" },
  { value: "special", label: "Speciaal" },
];

// ============================================
// Component
// ============================================

export function BulkExceptionModal({
  open,
  onOpenChange,
  locationId,
  shifts,
}: BulkExceptionModalProps) {
  // ============================================
  // State
  // ============================================
  
  // Pattern selection
  const [repeatMode, setRepeatMode] = useState<'weekly' | 'monthly' | 'n-occurrences'>('weekly');
  const [monthlyType, setMonthlyType] = useState<'day' | 'nth'>('day');
  
  // Weekly pattern
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  
  // Monthly: Day
  const [dayOfMonth, setDayOfMonth] = useState(1);
  
  // Monthly: Nth
  const [nth, setNth] = useState<NthWeek>(1);
  const [nthWeekday, setNthWeekday] = useState(1);
  
  // N-occurrences
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [nOccBaseMode, setNOccBaseMode] = useState<'weekly' | 'monthly-day' | 'monthly-nth'>('weekly');
  
  // Date range
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addYears(new Date(), 1));
  
  // Exception data
  const [exceptionType, setExceptionType] = useState<ShiftExceptionType>('closed');
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('22:00');
  
  // Conflict handling
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  
  // Progress
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // ============================================
  // Queries and Mutations
  // ============================================
  
  const dateRange = useMemo(() => {
    if (repeatMode === 'n-occurrences') {
      return {
        from: format(startDate, 'yyyy-MM-dd'),
        to: format(addYears(startDate, 3), 'yyyy-MM-dd'),
      };
    }
    return {
      from: format(startDate, 'yyyy-MM-dd'),
      to: format(endDate, 'yyyy-MM-dd'),
    };
  }, [startDate, endDate, repeatMode]);

  const { data: existingExceptions = [] } = useShiftExceptions(locationId, dateRange);
  const bulkCreateMutation = useBulkCreateShiftExceptions();

  // ============================================
  // Build shift map and scope options
  // ============================================
  
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s) => map.set(s.id, s));
    return map;
  }, [shifts]);

  const scopeOptions = useMemo(() => [
    { value: "all", label: "Alle shifts (locatie-breed)" },
    ...shifts.filter((s) => s.is_active).map((shift) => ({
      value: shift.id,
      label: shift.name,
    })),
  ], [shifts]);

  // ============================================
  // Generate pattern configuration
  // ============================================
  
  const generatorPattern = useMemo((): GeneratorPattern | null => {
    if (repeatMode === 'weekly') {
      return { mode: 'weekly', weekdays: selectedWeekdays };
    }
    
    if (repeatMode === 'monthly') {
      if (monthlyType === 'day') {
        return { mode: 'monthly-day', dayOfMonth, everyNMonths: 1 };
      } else {
        return { mode: 'monthly-nth', nth, weekday: nthWeekday, everyNMonths: 1 };
      }
    }
    
    if (repeatMode === 'n-occurrences') {
      if (nOccBaseMode === 'weekly') {
        return {
          mode: 'n-occurrences',
          count: occurrenceCount,
          baseMode: 'weekly',
          basePattern: { weekdays: selectedWeekdays },
        };
      } else if (nOccBaseMode === 'monthly-day') {
        return {
          mode: 'n-occurrences',
          count: occurrenceCount,
          baseMode: 'monthly-day',
          basePattern: { dayOfMonth, everyNMonths: 1 },
        };
      } else {
        return {
          mode: 'n-occurrences',
          count: occurrenceCount,
          baseMode: 'monthly-nth',
          basePattern: { nth, weekday: nthWeekday, everyNMonths: 1 },
        };
      }
    }
    
    return null;
  }, [repeatMode, monthlyType, selectedWeekdays, dayOfMonth, nth, nthWeekday, occurrenceCount, nOccBaseMode]);

  // ============================================
  // Validation
  // ============================================
  
  const validation = useMemo(() => {
    if (!generatorPattern) return { valid: false, error: 'Selecteer een patroon' };
    return validateGeneratorConfig({
      pattern: generatorPattern,
      startDate,
      endDate: repeatMode === 'n-occurrences' ? undefined : endDate,
    });
  }, [generatorPattern, startDate, endDate, repeatMode]);

  // ============================================
  // Generate dates
  // ============================================
  
  const generatedDates = useMemo((): GeneratedDate[] => {
    if (!generatorPattern || !validation.valid) return [];
    return generateDates({
      pattern: generatorPattern,
      startDate,
      endDate: repeatMode === 'n-occurrences' ? undefined : endDate,
    });
  }, [generatorPattern, startDate, endDate, repeatMode, validation.valid]);

  // ============================================
  // Detect conflicts
  // ============================================
  
  const conflictResult = useMemo((): ConflictCheckResult | null => {
    if (generatedDates.length === 0) return null;
    return detectConflicts(generatedDates, existingExceptions, shiftId, exceptionType);
  }, [generatedDates, existingExceptions, shiftId, exceptionType]);

  const countWarning = useMemo(() => getCountWarning(generatedDates.length), [generatedDates.length]);

  const timesValid = useMemo(() => {
    if (exceptionType !== 'modified') return true;
    return startTime < endTime;
  }, [exceptionType, startTime, endTime]);

  const canSave = validation.valid && generatedDates.length > 0 && timesValid && !bulkCreateMutation.isPending;

  // ============================================
  // Reset form on close
  // ============================================
  
  useEffect(() => {
    if (!open) {
      setRepeatMode('weekly');
      setMonthlyType('day');
      setSelectedWeekdays([]);
      setDayOfMonth(1);
      setNth(1);
      setNthWeekday(1);
      setOccurrenceCount(12);
      setNOccBaseMode('weekly');
      setStartDate(new Date());
      setEndDate(addYears(new Date(), 1));
      setExceptionType('closed');
      setShiftId(null);
      setLabel('');
      setStartTime('12:00');
      setEndTime('22:00');
      setConflictResolution('skip');
      setProgress(null);
    }
  }, [open]);

  // ============================================
  // Handlers
  // ============================================
  
  const toggleWeekday = useCallback((day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  }, []);

  const handleSave = async () => {
    if (!canSave || !conflictResult) return;

    const datesToCreate = conflictResolution === 'skip'
      ? conflictResult.newDates
      : [...conflictResult.newDates, ...conflictResult.exactConflicts.map((c) => ({
          date: new Date(c.date),
          formattedDate: c.date,
          displayDate: '',
          dayOfWeek: '',
        }))];

    const exceptions: CreateShiftExceptionInput[] = datesToCreate.map((d) => ({
      location_id: locationId,
      exception_date: d.formattedDate,
      exception_type: exceptionType,
      shift_id: shiftId,
      label: label || null,
      override_start_time: exceptionType === 'modified' ? `${startTime}:00` : null,
      override_end_time: exceptionType === 'modified' ? `${endTime}:00` : null,
    }));

    const replaceConflicts = conflictResolution === 'replace' && conflictResult.exactConflicts.length > 0
      ? { dates: conflictResult.exactConflicts.map((c) => c.date), shiftId }
      : undefined;

    await bulkCreateMutation.mutateAsync({
      locationId,
      exceptions,
      replaceConflicts,
      onProgress: (current, total) => setProgress({ current, total }),
    });

    onOpenChange(false);
  };

  // ============================================
  // Render
  // ============================================
  
  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<Repeat className="h-5 w-5 text-primary" />}
      title="Meerdere uitzonderingen aanmaken"
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <NestoButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkCreateMutation.isPending}
          >
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!canSave}
            isLoading={bulkCreateMutation.isPending}
          >
            {generatedDates.length > 0 
              ? `${generatedDates.length} uitzondering${generatedDates.length !== 1 ? 'en' : ''} aanmaken`
              : 'Aanmaken'
            }
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        
        {/* Repeat Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Herhalingspatroon</label>
          <RadioGroup
            value={repeatMode}
            onValueChange={(v) => setRepeatMode(v as typeof repeatMode)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <label htmlFor="weekly" className="text-sm cursor-pointer">Wekelijks</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <label htmlFor="monthly" className="text-sm cursor-pointer">Maandelijks</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="n-occurrences" id="n-occurrences" />
              <label htmlFor="n-occurrences" className="text-sm cursor-pointer">Aantal keer</label>
            </div>
          </RadioGroup>
        </div>

        {/* Pattern Configuration Block */}
        <div className="bg-secondary/50 rounded-card p-4 space-y-4">
          
          {/* Weekly: Weekday selection */}
          {(repeatMode === 'weekly' || (repeatMode === 'n-occurrences' && nOccBaseMode === 'weekly')) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Weekdagen</label>
              <div className="flex gap-1.5">
                {WEEKDAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={cn(
                      "w-9 h-9 rounded-button text-sm font-medium transition-colors",
                      selectedWeekdays.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {day.label.charAt(0).toUpperCase() + day.label.slice(1, 2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly type selection */}
          {repeatMode === 'monthly' && (
            <div className="space-y-3">
              <RadioGroup
                value={monthlyType}
                onValueChange={(v) => setMonthlyType(v as typeof monthlyType)}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="day" id="monthly-day" />
                  <label htmlFor="monthly-day" className="text-sm cursor-pointer flex items-center gap-2">
                    Op dag
                    <div className="w-20">
                      <NestoSelect
                        value={dayOfMonth.toString()}
                        onValueChange={(v) => setDayOfMonth(parseInt(v))}
                        options={DAY_OF_MONTH_OPTIONS}
                        disabled={monthlyType !== 'day'}
                      />
                    </div>
                    van de maand
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="nth" id="monthly-nth" />
                  <label htmlFor="monthly-nth" className="text-sm cursor-pointer flex items-center gap-2">
                    Op de
                    <div className="w-24">
                      <NestoSelect
                        value={nth.toString()}
                        onValueChange={(v) => setNth(v === 'last' ? 'last' : parseInt(v) as NthWeek)}
                        options={NTH_SELECT_OPTIONS}
                        disabled={monthlyType !== 'nth'}
                      />
                    </div>
                    <div className="w-32">
                      <NestoSelect
                        value={nthWeekday.toString()}
                        onValueChange={(v) => setNthWeekday(parseInt(v))}
                        options={WEEKDAY_SELECT_OPTIONS}
                        disabled={monthlyType !== 'nth'}
                      />
                    </div>
                    van de maand
                  </label>
                </div>
              </RadioGroup>
              {monthlyType === 'day' && dayOfMonth > 28 && (
                <p className="text-xs text-muted-foreground">
                  Tip: Als dag {dayOfMonth} niet bestaat (bijv. 31 februari), wordt die maand overgeslagen.
                </p>
              )}
            </div>
          )}

          {/* N-occurrences configuration */}
          {repeatMode === 'n-occurrences' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground">Aantal:</label>
                <div className="w-24">
                  <NestoInput
                    type="number"
                    min={1}
                    max={500}
                    value={occurrenceCount}
                    onChange={(e) => setOccurrenceCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                </div>
                <span className="text-sm text-muted-foreground">keer</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Gebaseerd op:</label>
                <RadioGroup
                  value={nOccBaseMode}
                  onValueChange={(v) => setNOccBaseMode(v as typeof nOccBaseMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="weekly" id="nocc-weekly" />
                    <label htmlFor="nocc-weekly" className="text-sm cursor-pointer">
                      Wekelijks (selecteer weekdagen hierboven)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="monthly-day" id="nocc-monthly-day" />
                    <label htmlFor="nocc-monthly-day" className="text-sm cursor-pointer flex items-center gap-2">
                      Maandelijks: dag
                      <div className="w-20">
                        <NestoSelect
                          value={dayOfMonth.toString()}
                          onValueChange={(v) => setDayOfMonth(parseInt(v))}
                          options={DAY_OF_MONTH_OPTIONS}
                          disabled={nOccBaseMode !== 'monthly-day'}
                        />
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="monthly-nth" id="nocc-monthly-nth" />
                    <label htmlFor="nocc-monthly-nth" className="text-sm cursor-pointer flex items-center gap-2">
                      Maandelijks:
                      <div className="w-24">
                        <NestoSelect
                          value={nth.toString()}
                          onValueChange={(v) => setNth(v === 'last' ? 'last' : parseInt(v) as NthWeek)}
                          options={NTH_SELECT_OPTIONS}
                          disabled={nOccBaseMode !== 'monthly-nth'}
                        />
                      </div>
                      <div className="w-32">
                        <NestoSelect
                          value={nthWeekday.toString()}
                          onValueChange={(v) => setNthWeekday(parseInt(v))}
                          options={WEEKDAY_SELECT_OPTIONS}
                          disabled={nOccBaseMode !== 'monthly-nth'}
                        />
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {repeatMode === 'n-occurrences' ? 'Startdatum' : 'Van'}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <NestoButton
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'd MMMM yyyy', { locale: nl })}
                </NestoButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={nl}
                />
              </PopoverContent>
            </Popover>
          </div>

          {repeatMode !== 'n-occurrences' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tot</label>
              <Popover>
                <PopoverTrigger asChild>
                  <NestoButton
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'd MMMM yyyy', { locale: nl })}
                  </NestoButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={nl}
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Exception Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Type uitzondering</label>
            <NestoSelect
              value={exceptionType}
              onValueChange={(v) => setExceptionType(v as ShiftExceptionType)}
              options={EXCEPTION_TYPE_OPTIONS}
            />
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Scope</label>
            <NestoSelect
              value={shiftId === null ? "all" : shiftId}
              onValueChange={(v) => setShiftId(v === "all" ? null : v)}
              options={scopeOptions}
            />
          </div>
        </div>

        {/* Modified times */}
        {exceptionType === 'modified' && (
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
            {!timesValid && (
              <p className="col-span-2 text-sm text-destructive">
                Eindtijd moet na starttijd liggen.
              </p>
            )}
          </div>
        )}

        {/* Label */}
        <NestoInput
          label="Label (optioneel)"
          placeholder="bijv. Elke maandag gesloten"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        {/* Validation error */}
        {!validation.valid && validation.error && (
          <p className="text-sm text-destructive">{validation.error}</p>
        )}

        {/* Preview */}
        {validation.valid && generatedDates.length > 0 && (
          <BulkExceptionPreview
            generatedDates={generatedDates}
            conflictResult={conflictResult}
            exceptionType={exceptionType}
            shiftsMap={shiftsMap}
            conflictResolution={conflictResolution}
            onConflictResolutionChange={setConflictResolution}
            countWarning={countWarning}
          />
        )}

        {/* Progress indicator */}
        {progress && (
          <div className="rounded-card bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              Bezig met aanmaken... {progress.current}/{progress.total}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </NestoModal>
  );
}
