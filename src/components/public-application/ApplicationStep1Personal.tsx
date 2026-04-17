import { ApplicationFormData } from '@/pages/PublicApplicationPage';

interface Props {
  form: ApplicationFormData;
  setForm: (f: ApplicationFormData) => void;
  brandColor: string;
  onNext: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ApplicationStep1Personal({ form, setForm, brandColor, onNext }: Props) {
  const valid =
    form.first_name.trim().length >= 2 &&
    form.last_name.trim().length >= 2 &&
    EMAIL_REGEX.test(form.email.trim());

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Jouw gegevens</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Voornaam *"
          value={form.first_name}
          onChange={(v) => setForm({ ...form, first_name: v })}
        />
        <Field
          label="Achternaam *"
          value={form.last_name}
          onChange={(v) => setForm({ ...form, last_name: v })}
        />
      </div>
      <Field
        label="E-mail *"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />
      <Field
        label="Telefoon"
        type="tel"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />

      <button
        disabled={!valid}
        onClick={onNext}
        className="w-full mt-2 h-12 rounded-lg text-white font-medium disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: brandColor }}
      >
        Volgende
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
      />
    </label>
  );
}
