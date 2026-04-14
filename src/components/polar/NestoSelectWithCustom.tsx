import * as React from "react";
import { NestoSelect } from "./NestoSelect";
import { NestoInput } from "./NestoInput";
import type { SelectOption } from "./NestoSelect";

const CUSTOM_SENTINEL = "__custom__";

interface NestoSelectWithCustomProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  suggestions?: string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function NestoSelectWithCustom({
  label,
  value,
  onValueChange,
  options,
  suggestions = [],
  placeholder,
  error,
  disabled,
  className,
}: NestoSelectWithCustomProps) {
  const isStandard = options.some((o) => o.value === value);
  const [showCustom, setShowCustom] = React.useState(!isStandard && value !== "");
  const [customValue, setCustomValue] = React.useState(!isStandard ? value : "");

  React.useEffect(() => {
    const std = options.some((o) => o.value === value);
    if (std) {
      setShowCustom(false);
      setCustomValue("");
    } else if (value) {
      setShowCustom(true);
      setCustomValue(value);
    }
  }, [value, options]);

  const allOptions: SelectOption[] = [
    ...options,
    { value: CUSTOM_SENTINEL, label: "Anders..." },
  ];

  const selectValue = showCustom ? CUSTOM_SENTINEL : value;

  const handleSelectChange = (v: string) => {
    if (v === CUSTOM_SENTINEL) {
      setShowCustom(true);
      setCustomValue("");
    } else {
      setShowCustom(false);
      setCustomValue("");
      onValueChange(v);
    }
  };

  const handleCustomChange = (v: string) => {
    setCustomValue(v);
    onValueChange(v);
  };

  const filteredSuggestions = suggestions.filter(
    (s) => !options.some((o) => o.value === s)
  );

  return (
    <div className="space-y-2">
      <NestoSelect
        label={label}
        value={selectValue}
        onValueChange={handleSelectChange}
        options={allOptions}
        placeholder={placeholder}
        error={!showCustom ? error : undefined}
        disabled={disabled}
        className={className}
      />

      {showCustom && (
        <div className="space-y-1.5">
          <NestoInput
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="bijv. zwarte bak, emmer..."
            autoFocus
            className="h-10"
            list="custom-eenheid-suggestions"
          />
          {filteredSuggestions.length > 0 && (
            <datalist id="custom-eenheid-suggestions">
              {filteredSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          {filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleCustomChange(s)}
                  className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-small text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
