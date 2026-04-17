import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationFormData } from '@/pages/PublicApplicationPage';

interface Props {
  form: ApplicationFormData;
  setForm: (f: ApplicationFormData) => void;
  brandColor: string;
  slug: string;
  onBack: () => void;
  onSuccess: () => void;
}

const MAX = 1000;

export function ApplicationStep3Motivation({
  form,
  setForm,
  brandColor,
  slug,
  onBack,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke('submit-application', {
        body: {
          slug,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          positions: form.positions,
          availability_start: form.availability_start || undefined,
          hours_preference: form.hours_preference || undefined,
          motivation: form.motivation.trim() || undefined,
          source: 'website',
          website_url: form.website_url, // honeypot
        },
      });
      if (invErr) throw invErr;
      const errCode = (data as { error?: string })?.error;
      if (errCode) {
        setError(messageFor(errCode));
        return;
      }
      onSuccess();
    } catch (e) {
      setError('Er ging iets mis. Probeer het later opnieuw.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Vertel iets over jezelf</h2>

      {/* Honeypot — visueel verborgen */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        value={form.website_url}
        onChange={(e) => setForm({ ...form, website_url: e.target.value })}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />

      <label className="block">
        <span className="text-sm text-gray-700 mb-1.5 block">Motivatie (optioneel)</span>
        <textarea
          rows={6}
          maxLength={MAX}
          value={form.motivation}
          onChange={(e) => setForm({ ...form, motivation: e.target.value })}
          placeholder="Waarom wil je bij ons werken? Welke ervaring heb je?"
          className="w-full p-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
        />
        <div className="text-xs text-gray-400 mt-1 text-right">
          {form.motivation.length}/{MAX}
        </div>
      </label>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 h-12 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40"
        >
          Terug
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 h-12 rounded-lg text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          {submitting ? 'Versturen…' : 'Verstuur sollicitatie'}
        </button>
      </div>
    </div>
  );
}

function messageFor(code: string): string {
  switch (code) {
    case 'rate_limited':
      return 'Je hebt recent al gesolliciteerd. Probeer het later opnieuw.';
    case 'already_applied':
      return 'Er is al een sollicitatie met dit e-mailadres. We nemen contact op.';
    case 'invalid_email':
      return 'Vul een geldig e-mailadres in.';
    case 'name_required':
      return 'Vul je naam in.';
    case 'page_not_found':
      return 'Deze sollicitatiepagina is niet beschikbaar.';
    default:
      return 'Er ging iets mis. Probeer het later opnieuw.';
  }
}
