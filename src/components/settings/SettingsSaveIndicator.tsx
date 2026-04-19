import * as React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SettingsSaveIndicator
 *
 * Universele save-feedback indicator voor alle settings-pagina's.
 * Vervangt losse `nestoToast.success("X opgeslagen")` calls voor autosave-
 * en click-to-save flows. Toast blijft alleen voor expliciete acties
 * (create, delete, bulk, send).
 *
 * Variants:
 *  - title-bar    → naast de pagina-titel in SettingsDetailLayout (default)
 *  - inline-card  → naast een card-header (binnen SettingsCardHeader)
 *  - inline-button → naast een Opslaan-knop bij click-to-save flows
 *
 * States:
 *  - idle    → toont niets (placeholder reserveert ruimte zodat layout niet shift)
 *  - saving  → "Opslaan…" met spinner, neutrale kleur
 *  - saved   → "✓ Opgeslagen" in success-color, fade out na 2s → terug naar idle
 *  - error   → "Niet opgeslagen" in destructive-color, blijft staan tot next attempt
 *
 * Alle kleuren via design-tokens. Dark-mode ready.
 */

export type SaveState = "idle" | "saving" | "saved" | "error";

export type SaveIndicatorVariant = "title-bar" | "inline-card" | "inline-button";

interface SettingsSaveIndicatorProps {
  state: SaveState;
  variant?: SaveIndicatorVariant;
  /** Auto-clear `saved` state after this many ms. Set 0 to disable. Default 2000. */
  autoFadeMs?: number;
  /** Called when the `saved` state auto-fades back to `idle`. Parent should reset its state. */
  onAutoFade?: () => void;
  /** Custom labels (default Dutch). */
  labels?: Partial<Record<SaveState, string>>;
  className?: string;
}

const DEFAULT_LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Opslaan…",
  saved: "Opgeslagen",
  error: "Niet opgeslagen",
};

const VARIANT_CLASSES: Record<SaveIndicatorVariant, string> = {
  "title-bar": "text-sm",
  "inline-card": "text-xs",
  "inline-button": "text-sm",
};

const ICON_SIZE: Record<SaveIndicatorVariant, string> = {
  "title-bar": "h-4 w-4",
  "inline-card": "h-3.5 w-3.5",
  "inline-button": "h-4 w-4",
};

export function SettingsSaveIndicator({
  state,
  variant = "title-bar",
  autoFadeMs = 2000,
  onAutoFade,
  labels,
  className,
}: SettingsSaveIndicatorProps) {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  // Auto-fade saved → idle
  React.useEffect(() => {
    if (state !== "saved" || autoFadeMs <= 0) return;
    const timer = window.setTimeout(() => {
      onAutoFade?.();
    }, autoFadeMs);
    return () => window.clearTimeout(timer);
  }, [state, autoFadeMs, onAutoFade]);

  const baseClasses = cn(
    "inline-flex items-center gap-1.5 tabular-nums transition-opacity duration-200",
    VARIANT_CLASSES[variant],
    className
  );

  // Reserve space when idle so layout never shifts.
  if (state === "idle") {
    return (
      <span
        className={cn(baseClasses, "opacity-0 pointer-events-none select-none")}
        aria-hidden="true"
      >
        <Check className={ICON_SIZE[variant]} />
        <span>{resolvedLabels.saved}</span>
      </span>
    );
  }

  if (state === "saving") {
    return (
      <span
        className={cn(baseClasses, "text-muted-foreground")}
        role="status"
        aria-live="polite"
      >
        <Loader2 className={cn(ICON_SIZE[variant], "animate-spin")} />
        <span>{resolvedLabels.saving}</span>
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span
        className={cn(baseClasses, "text-success animate-in fade-in duration-200")}
        role="status"
        aria-live="polite"
      >
        <Check className={ICON_SIZE[variant]} strokeWidth={2.5} />
        <span>{resolvedLabels.saved}</span>
      </span>
    );
  }

  // error
  return (
    <span
      className={cn(baseClasses, "text-destructive")}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className={ICON_SIZE[variant]} />
      <span>{resolvedLabels.error}</span>
    </span>
  );
}
