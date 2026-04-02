import { useState, useEffect } from 'react';
import { Loader2, Check, ChevronDown, X } from 'lucide-react';

interface GuestPreferencesProps {
  manageToken: string;
  brandColor: string;
  summaryMode?: boolean;
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

const ALL_OPTIONS = [...COMMON_OPTIONS, ...MORE_ALLERGENS];

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function GuestPreferences({ manageToken, brandColor, summaryMode = false }: GuestPreferencesProps) {
  const [prefs, setPrefs] = useState<DietaryPreferences>({
    allergies: [], vegetarian: false, vegan: false, other: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      // Close editor after save in summary mode
      if (summaryMode) {
        setTimeout(() => setIsEditing(false), 800);
      }
    } catch {}
    finally { setSaving(false); }
  };

  // Build summary pills
  const summaryItems: string[] = [];
  if (prefs.vegetarian) summaryItems.push('Vegetarisch');
  if (prefs.vegan) summaryItems.push('Vegan');
  prefs.allergies.forEach(a => {
    const opt = ALL_OPTIONS.find(o => o.key === a);
    if (opt) summaryItems.push(opt.label);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#D1D5DB' }} />
      </div>
    );
  }

  // Summary mode (collapsed)
  if (summaryMode && !isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#6B7280' }}>
            Allergieën & dieetwensen
          </p>
        </div>
        {summaryItems.length === 0 && !prefs.other ? (
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#9CA3AF' }}>Geen opgegeven</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: brandColor }}
            >
              Toevoegen →
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {summaryItems.map(item => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: brandColor + '15', color: brandColor, border: `1px solid ${brandColor}30` }}
                >
                  {item}
                </span>
              ))}
              {prefs.other && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  {prefs.other.length > 30 ? prefs.other.slice(0, 30) + '…' : prefs.other}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: brandColor }}
            >
              Wijzig →
            </button>
          </div>
        )}
      </div>
    );
  }

  const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150"
      style={{
        borderColor: selected ? brandColor : '#E5E7EB',
        backgroundColor: selected ? brandColor + '15' : 'transparent',
        color: selected ? brandColor : '#6B7280',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#6B7280' }}>
          Allergieën & dieetwensen
        </p>
        {summaryMode && (
          <button
            onClick={() => { setIsEditing(false); setDirty(false); }}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
          </button>
        )}
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-70"
          style={{ color: '#9CA3AF' }}
        >
          <span>Meer allergenen</span>
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
          className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          style={{ borderColor: '#E5E7EB' }}
        />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || (!dirty && !saved)}
          className="w-full py-2.5 rounded-2xl text-sm font-medium text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: dirty ? brandColor : saved ? '#16a34a' : '#9CA3AF' }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Opgeslagen
            </>
          ) : (
            'Opslaan'
          )}
        </button>
      </div>
    </div>
  );
}
