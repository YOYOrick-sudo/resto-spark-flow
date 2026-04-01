import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { DietaryPreferences } from '@/contexts/BookingContext';

const COMMON_OPTIONS = [
  { key: 'gluten', label: 'Glutenvrij' },
  { key: 'lactose', label: 'Lactosevrij' },
  { key: 'noten', label: 'Notenallergie' },
];

const DIET_OPTIONS = [
  { key: 'vegetarian' as const, label: 'Vegetarisch' },
  { key: 'vegan' as const, label: 'Vegan' },
];

const ALL_EU_ALLERGENS = [
  { key: 'schaaldieren', label: 'Schaaldieren' },
  { key: 'eieren', label: 'Eieren' },
  { key: 'vis', label: 'Vis' },
  { key: 'pinda', label: "Pinda's" },
  { key: 'soja', label: 'Soja' },
  { key: 'selderij', label: 'Selderij' },
  { key: 'mosterd', label: 'Mosterd' },
  { key: 'sesam', label: 'Sesamzaad' },
  { key: 'sulfieten', label: 'Sulfieten' },
  { key: 'lupine', label: 'Lupine' },
  { key: 'weekdieren', label: 'Weekdieren' },
];

interface DietarySelectorProps {
  value: DietaryPreferences;
  onChange: (prefs: DietaryPreferences) => void;
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-2xl text-sm border transition-all duration-200 flex items-center gap-1.5 ${
        selected
          ? 'text-white border-transparent'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5'
      }`}
      style={selected ? { backgroundColor: 'var(--widget-primary)', borderColor: 'var(--widget-primary)' } : undefined}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

export function DietarySelector({ value, onChange }: DietarySelectorProps) {
  const [hasDietary, setHasDietary] = useState<boolean | null>(
    value.allergies.length > 0 || value.vegetarian || value.vegan || value.other ? true : null
  );
  const [showMore, setShowMore] = useState(false);

  const toggleAllergy = (key: string) => {
    const next = value.allergies.includes(key)
      ? value.allergies.filter(a => a !== key)
      : [...value.allergies, key];
    onChange({ ...value, allergies: next });
  };

  const toggleDiet = (key: 'vegetarian' | 'vegan') => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-gray-700 block">
        Heb je allergieën of dieetwensen?
      </label>
      <div className="flex gap-2">
        <ToggleChip label="Ja" selected={hasDietary === true} onClick={() => setHasDietary(true)} />
        <ToggleChip
          label="Nee"
          selected={hasDietary === false}
          onClick={() => {
            setHasDietary(false);
            onChange({ allergies: [], vegetarian: false, vegan: false, other: '' });
          }}
        />
      </div>

      {hasDietary === true && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Common + diet options */}
          <div className="flex flex-wrap gap-2">
            {COMMON_OPTIONS.map(opt => (
              <ToggleChip
                key={opt.key}
                label={opt.label}
                selected={value.allergies.includes(opt.key)}
                onClick={() => toggleAllergy(opt.key)}
              />
            ))}
            {DIET_OPTIONS.map(opt => (
              <ToggleChip
                key={opt.key}
                label={opt.label}
                selected={value[opt.key]}
                onClick={() => toggleDiet(opt.key)}
              />
            ))}
          </div>

          {/* Show more EU allergens */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Minder tonen' : 'Alle 14 EU-allergenen tonen'}
          </button>

          {showMore && (
            <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
              {ALL_EU_ALLERGENS.map(opt => (
                <ToggleChip
                  key={opt.key}
                  label={opt.label}
                  selected={value.allergies.includes(opt.key)}
                  onClick={() => toggleAllergy(opt.key)}
                />
              ))}
            </div>
          )}

          {/* Custom text */}
          <input
            type="text"
            value={value.other}
            onChange={e => onChange({ ...value, other: e.target.value })}
            placeholder="Bijv. geen koriander"
            className="w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
            onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--widget-primary) 12%, transparent)`}
            onBlur={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
          />
        </div>
      )}
    </div>
  );
}
