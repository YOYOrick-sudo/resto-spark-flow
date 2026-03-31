import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';

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

const EU_ALLERGENS = [
  { key: 'gluten', label: 'Gluten' },
  { key: 'schaaldieren', label: 'Schaaldieren' },
  { key: 'eieren', label: 'Eieren' },
  { key: 'vis', label: 'Vis' },
  { key: 'pinda', label: "Pinda's" },
  { key: 'soja', label: 'Soja' },
  { key: 'lactose', label: 'Melk (lactose)' },
  { key: 'noten', label: 'Noten' },
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
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [manageToken]);

  const toggleAllergy = (key: string) => {
    setPrefs(p => ({
      ...p,
      allergies: p.allergies.includes(key)
        ? p.allergies.filter(a => a !== key)
        : [...p.allergies, key],
    }));
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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Allergieën & voorkeuren</h3>
      <p className="text-xs text-gray-500">
        Laat ons weten of je allergieën of dieetvoorkeuren hebt, dan houden we daar rekening mee.
      </p>

      {/* Allergens grid */}
      <div className="grid grid-cols-2 gap-2">
        {EU_ALLERGENS.map(a => {
          const selected = prefs.allergies.includes(a.key);
          return (
            <button
              key={a.key}
              onClick={() => toggleAllergy(a.key)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left"
              style={{
                borderColor: selected ? brandColor : '#e5e7eb',
                backgroundColor: selected ? brandColor + '10' : '#fff',
                color: selected ? brandColor : '#6b7280',
              }}
            >
              <div
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                style={{
                  borderColor: selected ? brandColor : '#d1d5db',
                  backgroundColor: selected ? brandColor : 'transparent',
                }}
              >
                {selected && <Check className="h-3 w-3 text-white" />}
              </div>
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Vegetarian / Vegan */}
      <div className="flex gap-2">
        {[
          { key: 'vegetarian' as const, label: 'Vegetarisch' },
          { key: 'vegan' as const, label: 'Vegan' },
        ].map(opt => {
          const selected = prefs[opt.key];
          return (
            <button
              key={opt.key}
              onClick={() => {
                setPrefs(p => ({ ...p, [opt.key]: !p[opt.key] }));
                setDirty(true);
                setSaved(false);
              }}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all justify-center"
              style={{
                borderColor: selected ? brandColor : '#e5e7eb',
                backgroundColor: selected ? brandColor + '10' : '#fff',
                color: selected ? brandColor : '#6b7280',
              }}
            >
              <div
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                style={{
                  borderColor: selected ? brandColor : '#d1d5db',
                  backgroundColor: selected ? brandColor : 'transparent',
                }}
              >
                {selected && <Check className="h-3 w-3 text-white" />}
              </div>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Other */}
      <textarea
        value={prefs.other}
        onChange={e => {
          setPrefs(p => ({ ...p, other: e.target.value }));
          setDirty(true);
          setSaved(false);
        }}
        placeholder="Overige voorkeuren of opmerkingen..."
        maxLength={500}
        rows={2}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
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
