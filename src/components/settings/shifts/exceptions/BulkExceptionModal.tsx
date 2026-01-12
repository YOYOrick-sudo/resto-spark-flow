// ============================================
// FASE 4.3.D: Bulk Exception Modal
// Enterprise-grade bulk exception generator
// ============================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, addMonths, addYears } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

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
  
  // Fetch existing exceptions for conflict detection
  const dateRange = useMemo(() => {
    if (repeatMode === 'n-occurrences') {
      // For n-occurrences, estimate a large range
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
  // Build shift map
  // ============================================
  
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s) => map.set(s.id, s));
    return map;
  }, [shifts]);

  // ============================================
  // Generate pattern configuration
  // ============================================
  
  const generatorPattern = useMemo((): GeneratorPattern | null => {
    if (repeatMode === 'weekly') {
      return {
        mode: 'weekly',
        weekdays: selectedWeekdays,
      };
    }
    
    if (repeatMode === 'monthly') {
      if (monthlyType === 'day') {
        return {
          mode: 'monthly-day',
          dayOfMonth,
          everyNMonths: 1,
        };
      } else {
        return {
          mode: 'monthly-nth',
          nth,
          weekday: nthWeekday,
          everyNMonths: 1,
        };
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
    
    return detectConflicts(
      generatedDates,
      existingExceptions,
      shiftId,
      exceptionType
    );
  }, [generatedDates, existingExceptions, shiftId, exceptionType]);

  // ============================================
  // Count warning
  // ============================================
  
  const countWarning = useMemo(() => {
    return getCountWarning(generatedDates.length);
  }, [generatedDates.length]);

  // ============================================
  // Times validation (for modified type)
  // ============================================
  
  const timesValid = useMemo(() => {
    if (exceptionType !== 'modified') return true;
    return startTime < endTime;
  }, [exceptionType, startTime, endTime]);

  // ============================================
  // Can save?
  // ============================================
  
  const canSave = validation.valid && 
    generatedDates.length > 0 && 
    timesValid && 
    !bulkCreateMutation.isPending;

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
  // Toggle weekday
  // ============================================
  
  const toggleWeekday = useCallback((day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  }, []);

  // ============================================
  // Handle save
  // ============================================
  
  const handleSave = async () => {
    if (!canSave || !conflictResult) return;

    // Determine which dates to create
    const datesToCreate = conflictResolution === 'skip'
      ? conflictResult.newDates
      : [...conflictResult.newDates, ...conflictResult.exactConflicts.map((c) => ({
          date: new Date(c.date),
          formattedDate: c.date,
          displayDate: '',
          dayOfWeek: '',
        }))];

    // Build exception inputs
    const exceptions: CreateShiftExceptionInput[] = datesToCreate.map((d) => ({
      location_id: locationId,
      exception_date: d.formattedDate,
      exception_type: exceptionType,
      shift_id: shiftId,
      label: label || null,
      override_start_time: exceptionType === 'modified' ? `${startTime}:00` : null,
      override_end_time: exceptionType === 'modified' ? `${endTime}:00` : null,
    }));

    // Determine replace conflicts
    const replaceConflicts = conflictResolution === 'replace' && conflictResult.exactConflicts.length > 0
      ? {
          dates: conflictResult.exactConflicts.map((c) => c.date),
          shiftId,
        }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Meerdere uitzonderingen aanmaken
          </DialogTitle>
          <DialogDescription>
            Genereer meerdere uitzonderingen op basis van een herhalingspatroon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repeat Mode Selection */}
          <div className="space-y-3">
            <Label>Herhalingspatroon</Label>
            <RadioGroup
              value={repeatMode}
              onValueChange={(v) => setRepeatMode(v as typeof repeatMode)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="font-normal cursor-pointer">Wekelijks</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">Maandelijks</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="n-occurrences" id="n-occurrences" />
                <Label htmlFor="n-occurrences" className="font-normal cursor-pointer">Aantal keer</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Pattern Configuration */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            {/* Weekly: Weekday selection */}
            {(repeatMode === 'weekly' || (repeatMode === 'n-occurrences' && nOccBaseMode === 'weekly')) && (
              <div className="space-y-2">
                <Label>Weekdagen</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md border transition-colors",
                        selectedWeekdays.includes(day.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
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
                    <Label htmlFor="monthly-day" className="font-normal cursor-pointer flex items-center gap-2">
                      Op dag
                      <Select
                        value={dayOfMonth.toString()}
                        onValueChange={(v) => setDayOfMonth(parseInt(v))}
                        disabled={monthlyType !== 'day'}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_OF_MONTH_OPTIONS.map((d) => (
                            <SelectItem key={d} value={d.toString()}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      van de maand
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="nth" id="monthly-nth" />
                    <Label htmlFor="monthly-nth" className="font-normal cursor-pointer flex items-center gap-2">
                      Op de
                      <Select
                        value={nth.toString()}
                        onValueChange={(v) => setNth(v === 'last' ? 'last' : parseInt(v) as NthWeek)}
                        disabled={monthlyType !== 'nth'}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NTH_OPTIONS.map((n) => (
                            <SelectItem key={n.value.toString()} value={n.value.toString()}>
                              {n.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={nthWeekday.toString()}
                        onValueChange={(v) => setNthWeekday(parseInt(v))}
                        disabled={monthlyType !== 'nth'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAY_OPTIONS.map((w) => (
                            <SelectItem key={w.value} value={w.value.toString()}>
                              {w.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      van de maand
                    </Label>
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
                  <Label>Aantal:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={occurrenceCount}
                    onChange={(e) => setOccurrenceCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">keer</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Gebaseerd op:</Label>
                  <RadioGroup
                    value={nOccBaseMode}
                    onValueChange={(v) => setNOccBaseMode(v as typeof nOccBaseMode)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="weekly" id="nocc-weekly" />
                      <Label htmlFor="nocc-weekly" className="font-normal cursor-pointer">
                        Wekelijks (selecteer weekdagen hierboven)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="monthly-day" id="nocc-monthly-day" />
                      <Label htmlFor="nocc-monthly-day" className="font-normal cursor-pointer flex items-center gap-2">
                        Maandelijks: dag
                        <Select
                          value={dayOfMonth.toString()}
                          onValueChange={(v) => setDayOfMonth(parseInt(v))}
                          disabled={nOccBaseMode !== 'monthly-day'}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAY_OF_MONTH_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d.toString()}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="monthly-nth" id="nocc-monthly-nth" />
                      <Label htmlFor="nocc-monthly-nth" className="font-normal cursor-pointer flex items-center gap-2">
                        Maandelijks:
                        <Select
                          value={nth.toString()}
                          onValueChange={(v) => setNth(v === 'last' ? 'last' : parseInt(v) as NthWeek)}
                          disabled={nOccBaseMode !== 'monthly-nth'}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NTH_OPTIONS.map((n) => (
                              <SelectItem key={n.value.toString()} value={n.value.toString()}>
                                {n.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={nthWeekday.toString()}
                          onValueChange={(v) => setNthWeekday(parseInt(v))}
                          disabled={nOccBaseMode !== 'monthly-nth'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAY_OPTIONS.map((w) => (
                              <SelectItem key={w.value} value={w.value.toString()}>
                                {w.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{repeatMode === 'n-occurrences' ? 'Startdatum' : 'Van'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'd MMMM yyyy', { locale: nl })}
                  </Button>
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
                <Label>Tot</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, 'd MMMM yyyy', { locale: nl })}
                    </Button>
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

          {/* Exception Type */}
          <div className="space-y-3">
            <Label>Type uitzondering</Label>
            <RadioGroup
              value={exceptionType}
              onValueChange={(v) => setExceptionType(v as ShiftExceptionType)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="closed" id="type-closed" />
                <Label htmlFor="type-closed" className="font-normal cursor-pointer">Gesloten</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="modified" id="type-modified" />
                <Label htmlFor="type-modified" className="font-normal cursor-pointer">Aangepaste tijden</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="special" id="type-special" />
                <Label htmlFor="type-special" className="font-normal cursor-pointer">Speciaal</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Modified times */}
          {exceptionType === 'modified' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starttijd</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Eindtijd</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!timesValid && (
                <p className="col-span-2 text-sm text-destructive">
                  Eindtijd moet na starttijd liggen.
                </p>
              )}
            </div>
          )}

          {/* Scope */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={shiftId === null ? "all" : shiftId}
              onValueChange={(v) => setShiftId(v === "all" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle shifts (locatie-breed)</SelectItem>
                {shifts.filter((s) => s.is_active).map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label>Label (optioneel)</Label>
            <Input
              placeholder="bijv. Elke maandag gesloten"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

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
            <div className="rounded-lg border border-border bg-muted/30 p-3">
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkCreateMutation.isPending}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
          >
            {generatedDates.length > 0 
              ? `${generatedDates.length} uitzondering${generatedDates.length !== 1 ? 'en' : ''} aanmaken`
              : 'Aanmaken'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
