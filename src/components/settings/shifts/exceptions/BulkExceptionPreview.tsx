// ============================================
// FASE 4.3.D: Bulk Exception Preview
// Preview component showing generated dates and conflicts
// ============================================

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedDate } from "@/lib/bulkExceptionGenerator";
import type { ShiftException, ShiftExceptionType, Shift } from "@/types/shifts";

// ============================================
// Types
// ============================================

export interface ExactConflict {
  date: string;
  existingException: ShiftException;
}

export interface FunctionalWarning {
  date: string;
  type: 'location-wide-overrides' | 'shift-specific-becomes-irrelevant';
  message: string;
  existingException: ShiftException;
}

export interface ConflictCheckResult {
  exactConflicts: ExactConflict[];
  warnings: FunctionalWarning[];
  newDates: GeneratedDate[];
  totalGenerated: number;
}

export type ConflictResolution = 'skip' | 'replace';

// ============================================
// Conflict Detection
// ============================================

export function detectConflicts(
  generatedDates: GeneratedDate[],
  existingExceptions: ShiftException[],
  targetShiftId: string | null,
  exceptionType: ShiftExceptionType
): ConflictCheckResult {
  const exactConflicts: ExactConflict[] = [];
  const warnings: FunctionalWarning[] = [];
  const newDates: GeneratedDate[] = [];

  for (const genDate of generatedDates) {
    // Find existing exceptions on this date
    const existingOnDate = existingExceptions.filter(
      (ex) => ex.exception_date === genDate.formattedDate
    );

    if (existingOnDate.length === 0) {
      newDates.push(genDate);
      continue;
    }

    // Check for exact scope match (same shift_id including null)
    const exactMatch = existingOnDate.find((ex) => {
      if (targetShiftId === null) {
        return ex.shift_id === null;
      }
      return ex.shift_id === targetShiftId;
    });

    if (exactMatch) {
      exactConflicts.push({
        date: genDate.formattedDate,
        existingException: exactMatch,
      });
    } else {
      // No exact match, but there are other exceptions
      // Check for functional warnings
      if (targetShiftId === null && exceptionType === 'closed') {
        // Creating location-wide closed, but shift-specific exists
        const shiftSpecific = existingOnDate.filter((ex) => ex.shift_id !== null);
        if (shiftSpecific.length > 0) {
          warnings.push({
            date: genDate.formattedDate,
            type: 'location-wide-overrides',
            message: `Er ${shiftSpecific.length === 1 ? 'bestaat' : 'bestaan'} al ${shiftSpecific.length} shift-specifieke uitzondering${shiftSpecific.length === 1 ? '' : 'en'}`,
            existingException: shiftSpecific[0],
          });
        }
      } else if (targetShiftId !== null) {
        // Creating shift-specific, check if location-wide closed exists
        const locationClosed = existingOnDate.find(
          (ex) => ex.shift_id === null && ex.exception_type === 'closed'
        );
        if (locationClosed) {
          warnings.push({
            date: genDate.formattedDate,
            type: 'shift-specific-becomes-irrelevant',
            message: 'De locatie is al gesloten op deze dag',
            existingException: locationClosed,
          });
        }
      }
      
      newDates.push(genDate);
    }
  }

  return {
    exactConflicts,
    warnings,
    newDates,
    totalGenerated: generatedDates.length,
  };
}

// ============================================
// Component Props
// ============================================

interface BulkExceptionPreviewProps {
  generatedDates: GeneratedDate[];
  conflictResult: ConflictCheckResult | null;
  exceptionType: ShiftExceptionType;
  shiftsMap: Map<string, Shift>;
  conflictResolution: ConflictResolution;
  onConflictResolutionChange: (resolution: ConflictResolution) => void;
  countWarning?: string;
  maxPreviewItems?: number;
}

// ============================================
// Component
// ============================================

export function BulkExceptionPreview({
  generatedDates,
  conflictResult,
  exceptionType,
  shiftsMap,
  conflictResolution,
  onConflictResolutionChange,
  countWarning,
  maxPreviewItems = 5,
}: BulkExceptionPreviewProps) {
  const typeLabels: Record<ShiftExceptionType, string> = {
    closed: 'Gesloten',
    modified: 'Aangepast',
    special: 'Speciaal',
  };

  const previewDates = useMemo(() => {
    return generatedDates.slice(0, maxPreviewItems);
  }, [generatedDates, maxPreviewItems]);

  const remainingCount = generatedDates.length - maxPreviewItems;
  const hasConflicts = conflictResult && conflictResult.exactConflicts.length > 0;
  const hasWarnings = conflictResult && conflictResult.warnings.length > 0;

  // Calculate what will actually be created
  const createCount = useMemo(() => {
    if (!conflictResult) return generatedDates.length;
    
    if (conflictResolution === 'skip') {
      return conflictResult.newDates.length;
    } else {
      return conflictResult.newDates.length + conflictResult.exactConflicts.length;
    }
  }, [conflictResult, conflictResolution, generatedDates.length]);

  if (generatedDates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Geen datums om weer te geven. Pas de instellingen aan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main preview box */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-3">
          Preview: Dit maakt {createCount} uitzondering{createCount !== 1 ? 'en' : ''}
        </p>

        <ul className="space-y-1.5">
          {previewDates.map((date) => (
            <li
              key={date.formattedDate}
              className="text-sm text-muted-foreground flex items-center gap-2"
            >
              <span className="text-foreground">{date.displayDate}</span>
              <span className="text-muted-foreground">({date.dayOfWeek})</span>
              <span>-</span>
              <span>{typeLabels[exceptionType]}</span>
            </li>
          ))}
        </ul>

        {remainingCount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            ... en {remainingCount} meer
          </p>
        )}
      </div>

      {/* Count warning */}
      {countWarning && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning-foreground">{countWarning}</p>
        </div>
      )}

      {/* Exact conflicts - require user choice */}
      {hasConflicts && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {conflictResult.exactConflicts.length} datum{conflictResult.exactConflicts.length !== 1 ? 's hebben' : ' heeft'} al een uitzondering met dezelfde scope:
              </p>
              <ul className="mt-2 space-y-1">
                {conflictResult.exactConflicts.slice(0, 3).map((conflict) => (
                  <li key={conflict.date} className="text-sm text-muted-foreground">
                    • {conflict.date} - "{conflict.existingException.label || typeLabels[conflict.existingException.exception_type]}"
                  </li>
                ))}
                {conflictResult.exactConflicts.length > 3 && (
                  <li className="text-sm text-muted-foreground">
                    ... en {conflictResult.exactConflicts.length - 3} meer
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-2 ml-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict-resolution"
                checked={conflictResolution === 'skip'}
                onChange={() => onConflictResolutionChange('skip')}
                className="accent-primary"
              />
              <span className="text-sm">
                Overslaan ({conflictResult.newDates.length} aanmaken)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict-resolution"
                checked={conflictResolution === 'replace'}
                onChange={() => onConflictResolutionChange('replace')}
                className="accent-primary"
              />
              <span className="text-sm">
                Vervangen ({conflictResult.newDates.length + conflictResult.exactConflicts.length} aanmaken, {conflictResult.exactConflicts.length} overschrijven)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Functional warnings - informational only */}
      {hasWarnings && (
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Let op: Op {conflictResult.warnings.length} datum{conflictResult.warnings.length !== 1 ? 's' : ''} bestaan al uitzonderingen met een andere scope.
            </p>
            {conflictResult.warnings[0]?.type === 'location-wide-overrides' && (
              <p className="text-xs text-muted-foreground mt-1">
                Deze worden functioneel overschreven door jouw locatie-brede sluiting.
              </p>
            )}
            {conflictResult.warnings[0]?.type === 'shift-specific-becomes-irrelevant' && (
              <p className="text-xs text-muted-foreground mt-1">
                De locatie is al gesloten op deze dagen, dus jouw shift-specifieke uitzondering heeft daar geen effect.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
