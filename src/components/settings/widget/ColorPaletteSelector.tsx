import { useState, useEffect, useRef } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { NestoInput } from '@/components/polar/NestoInput';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);

interface PaletteOption {
  primary: string;
  accent: string;
  name: string;
  reasoning?: string;
}

interface ColorPaletteSelectorProps {
  primaryColor: string;
  accentColor: string;
  onPrimaryChange: (color: string) => void;
  onAccentChange: (color: string) => void;
  onPaletteChange?: (primary: string, accent: string) => void;
}

const CURATED_PALETTES: PaletteOption[] = [
  { name: 'Emerald & Teal', primary: '#10B981', accent: '#14B8A6' },
  { name: 'Ocean Blue', primary: '#0EA5E9', accent: '#6366F1' },
  { name: 'Purple Night', primary: '#8B5CF6', accent: '#1F2937' },
  { name: 'Warm Sunset', primary: '#F97316', accent: '#F59E0B' },
  { name: 'Rose & Berry', primary: '#EC4899', accent: '#F43F5E' },
];

const SWATCH_COLORS = [
  '#10B981', '#059669', '#0EA5E9', '#6366F1',
  '#8B5CF6', '#EC4899', '#F43F5E', '#EF4444',
  '#F97316', '#F59E0B', '#84CC16', '#14B8A6',
  '#06B6D4', '#3B82F6', '#A855F7', '#1F2937',
];

function SwatchGrid({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [localHex, setLocalHex] = useState(value);

  useEffect(() => {
    setLocalHex(value);
  }, [value]);

  return (
    <div className="flex-1 min-w-0">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground mb-3">{sublabel}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {SWATCH_COLORS.map(color => {
          const isActive = value.toUpperCase() === color.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`h-6 w-6 rounded-full border transition-shadow flex items-center justify-center ${
                isActive
                  ? 'ring-2 ring-primary ring-offset-2 border-transparent'
                  : 'border-border hover:ring-2 hover:ring-primary/30 hover:ring-offset-1'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            >
              {isActive && <Check className="h-3 w-3 text-white drop-shadow-sm" />}
            </button>
          );
        })}
      </div>
      <NestoInput
        value={localHex}
        onChange={e => {
          const v = e.target.value;
          setLocalHex(v);
          if (isValidHex(v)) onChange(v);
        }}
        className="w-[120px]"
        placeholder="#10B981"
        maxLength={7}
        error={localHex && !isValidHex(localHex) ? 'Ongeldige hex kleur' : undefined}
      />
    </div>
  );
}

export function ColorPaletteSelector({
  primaryColor,
  accentColor,
  onPrimaryChange,
  onAccentChange,
  onPaletteChange,
}: ColorPaletteSelectorProps) {
  const [suggestions, setSuggestions] = useState<PaletteOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-widget-colors', {
        body: { primary: primaryColor, accent: accentColor },
      });
      if (error) throw error;
      const items: PaletteOption[] = (data?.suggestions ?? []).map((s: any) => ({
        primary: s.primary,
        accent: s.accent,
        name: s.name,
        reasoning: s.reasoning,
      }));
      if (items.length > 0) setSuggestions(items);
    } catch (e) {
      console.error('AI palette fetch error:', e);
      // keep fallback (curated)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchSuggestions();
    }
  }, []);

  const displayPalettes = suggestions ?? CURATED_PALETTES;

  const activePalette = displayPalettes.find(
    p =>
      p.primary.toUpperCase() === primaryColor.toUpperCase() &&
      p.accent.toUpperCase() === accentColor.toUpperCase()
  );

  const applyPalette = (primary: string, accent: string) => {
    if (onPaletteChange) {
      onPaletteChange(primary, accent);
    } else {
      onPrimaryChange(primary);
      onAccentChange(accent);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Palette chips */}
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Kleurenpalet</label>
          <div className="flex flex-wrap gap-2">
            {displayPalettes.map(palette => {
              const isActive =
                palette.primary.toUpperCase() === primaryColor.toUpperCase() &&
                palette.accent.toUpperCase() === accentColor.toUpperCase();

              const chip = (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => applyPalette(palette.primary, palette.accent)}
                  className={`inline-flex items-center gap-2 px-3 py-2 border rounded-button text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="flex gap-0.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-border/50"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-border/50"
                      style={{ backgroundColor: palette.accent }}
                    />
                  </span>
                  {palette.name}
                </button>
              );

              if (palette.reasoning) {
                return (
                  <Tooltip key={palette.name}>
                    <TooltipTrigger asChild>{chip}</TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {palette.reasoning}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return chip;
            })}

            {/* Custom chip */}
            {!activePalette && (
              <span className="inline-flex items-center gap-2 px-3 py-2 border border-primary bg-primary/5 text-primary rounded-button text-xs font-medium">
                <span className="flex gap-0.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-border/50"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-border/50"
                    style={{ backgroundColor: accentColor }}
                  />
                </span>
                Custom
              </span>
            )}
          </div>

          {/* Refresh link */}
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isLoading ? 'Laden...' : 'Nieuwe suggesties'}
          </button>
        </div>

        {/* Dual swatch grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SwatchGrid
            label="Hoofdkleur"
            sublabel="Knoppen & CTA's"
            value={primaryColor}
            onChange={onPrimaryChange}
          />
          <SwatchGrid
            label="Accentkleur"
            sublabel="Badges & highlights"
            value={accentColor}
            onChange={onAccentChange}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
