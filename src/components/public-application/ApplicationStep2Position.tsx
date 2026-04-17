import { ApplicationFormData } from '@/pages/PublicApplicationPage';

interface Props {
  form: ApplicationFormData;
  setForm: (f: ApplicationFormData) => void;
  brandColor: string;
  positions: string[];
  showHours: boolean;
  showStartDate: boolean;
  onBack: () => void;
  onNext: () => void;
}

const HOUR_OPTIONS = ['Bijbaan (≤16u)', 'Parttime (16-32u)', 'Fulltime (32-40u)', 'Flexibel'];

export function ApplicationStep2Position({
  form,
  setForm,
  brandColor,
  positions,
  showHours,
  showStartDate,
  onBack,
  onNext,
}: Props) {
  const togglePos = (p: string) => {
    setForm({
      ...form,
      positions: form.positions.includes(p)
        ? form.positions.filter((x) => x !== p)
        : [...form.positions, p],
    });
  };
  const valid = form.positions.length > 0;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium text-gray-900">Wat zoek je?</h2>

      <div>
        <span className="text-sm text-gray-700 mb-2 block">Functie(s) *</span>
        <div className="flex flex-wrap gap-2">
          {positions.map((p) => {
            const sel = form.positions.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePos(p)}
                className="px-4 h-10 rounded-full border text-sm transition-all"
                style={{
                  backgroundColor: sel ? brandColor : 'white',
                  borderColor: sel ? brandColor : '#E5E7EB',
                  color: sel ? 'white' : '#374151',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {showHours && (
        <label className="block">
          <span className="text-sm text-gray-700 mb-1.5 block">Aantal uur per week</span>
          <select
            value={form.hours_preference}
            onChange={(e) => setForm({ ...form, hours_preference: e.target.value })}
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
            className="w-full h-12 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          >
            <option value="">— Kies —</option>
            {HOUR_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )}

      {showStartDate && (
        <label className="block">
          <span className="text-sm text-gray-700 mb-1.5 block">Wanneer kun je starten?</span>
          <input
            type="text"
            placeholder="Bijv. zo snel mogelijk, vanaf 1 mei…"
            value={form.availability_start}
            onChange={(e) => setForm({ ...form, availability_start: e.target.value })}
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
            className="w-full h-12 px-3 rounded-lg border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
        >
          Terug
        </button>
        <button
          disabled={!valid}
          onClick={onNext}
          className="flex-1 h-12 rounded-lg text-white font-medium disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
        >
          Volgende
        </button>
      </div>
    </div>
  );
}
