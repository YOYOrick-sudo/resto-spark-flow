import { useState, useEffect } from 'react';
import { Loader2, Check, ChevronDown } from 'lucide-react';

interface GuestPreferencesProps {
  manageToken: string;
  brandColor: string;
}

interface DietaryPreferences {
  allergies: string[];
  vegetarian: boolean;
  vegan: boolean;
  other: string;
}

const COMMON_OPTIONS = [
  { key: 'gluten', label: 'Glutenvrij' },
  { key: 'lactose', label: 'Lactosevrij' },
  { key: 'noten', label: 'Noten' },
  { key: 'vegetarian', label: 'Vegetarisch', type: 'diet' as const },
  { key: 'vegan', label: 'Vegan', type: 'diet' as const },
];

const MORE_ALLERGENS = [
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

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function GuestPreferences({ manageToken, brandColor }: GuestPreferencesProps) {
  const [prefs, setPrefs] = useState<DietaryPreferences>({
    allergies: [], vegetarian: false, vegan: false, other: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/webchat-preferences?token=${encodeURIComponent(manageToken)}`, {
      headers: { 'apikey': API_KEY },
    })
      .then(r => r.json())
      .then(d => {
        if (d.preferences) {
          setPrefs({
            allergies: d.preferences.allergies || [],
            vegetarian: !!d.preferences.vegetarian,
            vegan: !!d.preferences.vegan,
            other: d.preferences.other || '',
          });
          // Auto-show "more" if user has selected any of the extended allergens
          if ((d.preferences.allergies || []).some((a: string) => MORE_ALLERGENS.some(m => m.key === a))) {
            setShowMore(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [manageToken]);

  const isSelected = (key: string, type?: 'diet') => {
    if (type === 'diet') return prefs[key as 'vegetarian' | 'vegan'];
    return prefs.allergies.includes(key);
  };

  const toggle = (key: string, type?: 'diet') => {
    if (type === 'diet') {
      setPrefs(p => ({ ...p, [key]: !p[key as 'vegetarian' | 'vegan'] }));
    } else {
      setPrefs(p => ({
        ...p,
        allergies: p.allergies.includes(key)
          ? p.allergies.filter(a => a !== key)
          : [...p.allergies, key],
      }));
    }
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/webchat-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({ manage_token: manageToken, preferences: prefs }),
      });
      setSaved(true);
      setDirty(false);
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150"
      style={{
        borderColor: selected ? brandColor : '#e5e7eb',
        backgroundColor: selected ? brandColor + '15' : 'transparent',
        color: selected ? brandColor : '#6b7280',
      }}
    >
      {label}
    </button>
  );

  const activeCount = prefs.allergies.length + (prefs.vegetarian ? 1 : 0) + (prefs.vegan ? 1 : 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Laat ons weten of je allergieën of dieetwensen hebt.
      </p>

      {/* Common options */}
      <div className="flex flex-wrap gap-2">
        {COMMON_OPTIONS.map(opt => (
          <Chip
            key={opt.key}
            label={opt.label}
            selected={isSelected(opt.key, opt.type)}
            onClick={() => toggle(opt.key, opt.type)}
          />
        ))}
      </div>

      {/* Show more toggle */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>Alle allergenen</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
      </button>

      {/* Extended allergens */}
      {showMore && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {MORE_ALLERGENS.map(a => (
            <Chip
              key={a.key}
              label={a.label}
              selected={prefs.allergies.includes(a.key)}
              onClick={() => toggle(a.key)}
            />
          ))}
        </div>
      )}

      {/* Other */}
      <textarea
        value={prefs.other}
        onChange={e => {
          setPrefs(p => ({ ...p, other: e.target.value }));
          setDirty(true);
          setSaved(false);
        }}
        placeholder="Overige wensen..."
        maxLength={500}
        rows={2}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
      />

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || (!dirty && !saved)}
        className="w-full py-2.5 rounded-2xl text-sm font-medium text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{ backgroundColor: dirty ? brandColor : saved ? '#16a34a' : '#9ca3af' }}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="h-4 w-4" />
            Opgeslagen
          </>
        ) : (
          'Voorkeuren opslaan'
        )}
      </button>
    </div>
  );
}
