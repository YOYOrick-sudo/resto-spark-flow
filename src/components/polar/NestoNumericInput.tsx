import * as React from "react";
import { NestoInput, type NestoInputProps } from "./NestoInput";

/**
 * NestoNumericInput — numeric input that allows the user to fully clear
 * the field while typing. Validation/clamping happens on blur.
 *
 * Solves the app-wide cursor-bug where `if (v === "") return` in onChange
 * blocked the user from clearing a field to type a new value.
 *
 * Behaviour:
 * - During typing: any string is allowed (empty included).
 * - On blur:
 *   - If the field is empty:
 *     - `allowEmpty` (default true) → emit `null`.
 *     - `allowEmpty=false` → emit `fallback` (default 0, or `min` if higher).
 *   - If the field parses to a number: clamp against `min`/`max`, then emit.
 *   - If the field is non-numeric junk: revert to last valid value.
 * - External value changes are synced into local text when the input is not focused.
 */
export interface NestoNumericInputProps
  extends Omit<NestoInputProps, "value" | "onChange" | "type" | "defaultValue"> {
  value: number | null | undefined;
  onValueChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  /** Used when allowEmpty is false and the field is empty/invalid on blur. */
  fallback?: number;
  /** If true, parses with parseInt and rejects decimals. */
  integer?: boolean;
}

const formatValue = (v: number | null | undefined): string =>
  v === null || v === undefined || Number.isNaN(v) ? "" : String(v);

export const NestoNumericInput = React.forwardRef<HTMLInputElement, NestoNumericInputProps>(
  (
    {
      value,
      onValueChange,
      min,
      max,
      step,
      allowEmpty = true,
      fallback,
      integer = false,
      onBlur,
      onFocus,
      ...rest
    },
    ref,
  ) => {
    const [text, setText] = React.useState<string>(() => formatValue(value));
    const focusedRef = React.useRef(false);

    // Sync external value into text when not focused — prevents wiping user input mid-typing.
    React.useEffect(() => {
      if (!focusedRef.current) {
        setText(formatValue(value));
      }
    }, [value]);

    const commit = React.useCallback(() => {
      const trimmed = text.trim();

      if (trimmed === "") {
        if (allowEmpty) {
          if (value !== null && value !== undefined) onValueChange(null);
          return;
        }
        const fb = fallback ?? (min ?? 0);
        setText(String(fb));
        if (value !== fb) onValueChange(fb);
        return;
      }

      const parsed = integer ? parseInt(trimmed, 10) : Number(trimmed);
      if (!Number.isFinite(parsed)) {
        // Non-numeric junk → revert
        setText(formatValue(value));
        return;
      }

      let clamped = parsed;
      if (typeof min === "number" && clamped < min) clamped = min;
      if (typeof max === "number" && clamped > max) clamped = max;

      // Reflect clamped value back in field
      if (String(clamped) !== trimmed) setText(String(clamped));
      if (clamped !== value) onValueChange(clamped);
    }, [text, allowEmpty, fallback, min, max, integer, value, onValueChange]);

    return (
      <NestoInput
        {...rest}
        ref={ref}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          focusedRef.current = true;
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit();
          onBlur?.(e);
        }}
      />
    );
  },
);
NestoNumericInput.displayName = "NestoNumericInput";
