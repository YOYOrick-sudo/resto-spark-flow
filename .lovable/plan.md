

# Sprint 1 / Deel 1.2 — Publieke pagina `/werken-bij/:slug`

## Doel
Publieke multi-step sollicitatiepagina, **buiten** AppLayout, met branding via `get_public_branding` RPC en submission via `submit-application` Edge Function.

## Bestanden

```
src/
├── pages/
│   └── PublicApplicationPage.tsx          (NEW — orchestrator + branding fetch)
├── components/public-application/
│   ├── ApplicationProgress.tsx            (NEW — 3 dots)
│   ├── ApplicationStep1Personal.tsx       (NEW — naam/email/tel)
│   ├── ApplicationStep2Position.tsx       (NEW — functies/uren/startdatum)
│   ├── ApplicationStep3Motivation.tsx     (NEW — motivatie + honeypot + submit)
│   ├── ApplicationStepSuccess.tsx         (NEW — bevestiging)
│   └── PublicApplicationNotFound.tsx      (NEW — branded 404)
├── hooks/
│   └── usePublicApplicationData.ts        (NEW — settings + branding fetch)
└── App.tsx                                (EDIT — route buiten AppLayout)
```

## Code

### 1. `src/hooks/usePublicApplicationData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicApplicationData {
  settings: {
    location_id: string;
    slug: string;
    welcome_title: string;
    welcome_text: string | null;
    available_positions: string[];
    show_hours: boolean;
    show_start_date: boolean;
    success_message: string;
  };
  branding: {
    location_name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
}

export function usePublicApplicationData(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-application-data', slug],
    queryFn: async (): Promise<PublicApplicationData | null> => {
      if (!slug) return null;
      const { data: settings, error: sErr } = await supabase
        .from('public_application_settings')
        .select('location_id, slug, welcome_title, welcome_text, available_positions, show_hours, show_start_date, success_message')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!settings) return null;

      const { data: branding } = await supabase.rpc('get_public_branding', { _slug: slug });
      const b = Array.isArray(branding) ? branding[0] : branding;

      return {
        settings: {
          ...settings,
          available_positions: (settings.available_positions as string[]) ?? [],
        },
        branding: b ?? null,
      };
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
```

### 2. `src/pages/PublicApplicationPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicApplicationData } from '@/hooks/usePublicApplicationData';
import { ApplicationProgress } from '@/components/public-application/ApplicationProgress';
import { ApplicationStep1Personal } from '@/components/public-application/ApplicationStep1Personal';
import { ApplicationStep2Position } from '@/components/public-application/ApplicationStep2Position';
import { ApplicationStep3Motivation } from '@/components/public-application/ApplicationStep3Motivation';
import { ApplicationStepSuccess } from '@/components/public-application/ApplicationStepSuccess';
import { PublicApplicationNotFound } from '@/components/public-application/PublicApplicationNotFound';

export interface ApplicationFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  positions: string[];
  availability_start: string;
  hours_preference: string;
  motivation: string;
  website_url: string; // honeypot
}

const initialForm: ApplicationFormData = {
  first_name: '', last_name: '', email: '', phone: '',
  positions: [], availability_start: '', hours_preference: '',
  motivation: '', website_url: '',
};

export default function PublicApplicationPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = usePublicApplicationData(slug);
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);
  const [form, setForm] = useState<ApplicationFormData>(initialForm);

  // SEO/OG tags
  useEffect(() => {
    if (!data) return;
    const title = `Werken bij ${data.branding?.location_name ?? ''}`.trim();
    document.title = title;
    const setMeta = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement('meta');
        if (prop) el.setAttribute('property', name); else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', data.settings.welcome_text ?? 'Solliciteer direct online.');
    setMeta('og:title', title, true);
    setMeta('og:description', data.settings.welcome_text ?? '', true);
    if (data.branding?.logo_url) setMeta('og:image', data.branding.logo_url, true);
  }, [data]);

  const brandColor = data?.branding?.brand_color ?? '#0F172A';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-sm text-gray-500">Laden…</div>
      </div>
    );
  }
  if (error || !data) return <PublicApplicationNotFound />;

  return (
    <div
      className="min-h-screen bg-[#FAFAFA] font-[Inter,sans-serif]"
      style={{ ['--brand' as string]: brandColor }}
    >
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          {data.branding?.logo_url && (
            <img src={data.branding.logo_url} alt={data.branding.location_name} className="h-12 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{data.settings.welcome_title}</h1>
          {data.settings.welcome_text && step !== 'success' && (
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{data.settings.welcome_text}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {step !== 'success' && <ApplicationProgress current={step} brandColor={brandColor} />}

          {step === 1 && (
            <ApplicationStep1Personal
              form={form} setForm={setForm} brandColor={brandColor}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ApplicationStep2Position
              form={form} setForm={setForm} brandColor={brandColor}
              positions={data.settings.available_positions}
              showHours={data.settings.show_hours}
              showStartDate={data.settings.show_start_date}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ApplicationStep3Motivation
              form={form} setForm={setForm} brandColor={brandColor}
              slug={slug!}
              onBack={() => setStep(2)}
              onSuccess={() => setStep('success')}
            />
          )}
          {step === 'success' && (
            <ApplicationStepSuccess message={data.settings.success_message} brandColor={brandColor} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by Nesto</p>
      </div>
    </div>
  );
}
```

### 3. `src/components/public-application/ApplicationProgress.tsx`

```typescript
interface Props { current: 1 | 2 | 3; brandColor: string; }
export function ApplicationProgress({ current, brandColor }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: n === current ? 32 : 16,
            backgroundColor: n <= current ? brandColor : '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
}
```

### 4. `src/components/public-application/ApplicationStep1Personal.tsx`

```typescript
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
        <Field label="Voornaam *" value={form.first_name}
          onChange={v => setForm({ ...form, first_name: v })} />
        <Field label="Achternaam *" value={form.last_name}
          onChange={v => setForm({ ...form, last_name: v })} />
      </div>
      <Field label="E-mail *" type="email" value={form.email}
        onChange={v => setForm({ ...form, email: v })} />
      <Field label="Telefoon" type="tel" value={form.phone}
        onChange={v => setForm({ ...form, phone: v })} />

      <button
        disabled={!valid} onClick={onNext}
        className="w-full mt-2 h-12 rounded-lg text-white font-medium disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: brandColor }}
      >
        Volgende
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700 mb-1.5 block">{label}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
      />
    </label>
  );
}
```

### 5. `src/components/public-application/ApplicationStep2Position.tsx`

```typescript
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

export function ApplicationStep2Position({ form, setForm, brandColor, positions, showHours, showStartDate, onBack, onNext }: Props) {
  const togglePos = (p: string) => {
    setForm({
      ...form,
      positions: form.positions.includes(p)
        ? form.positions.filter(x => x !== p)
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
          {positions.map(p => {
            const sel = form.positions.includes(p);
            return (
              <button key={p} type="button" onClick={() => togglePos(p)}
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
          <select value={form.hours_preference}
            onChange={e => setForm({ ...form, hours_preference: e.target.value })}
            className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
            <option value="">— Kies —</option>
            {HOUR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      )}

      {showStartDate && (
        <label className="block">
          <span className="text-sm text-gray-700 mb-1.5 block">Wanneer kun je starten?</span>
          <input type="text" placeholder="Bijv. zo snel mogelijk, vanaf 1 mei…"
            value={form.availability_start}
            onChange={e => setForm({ ...form, availability_start: e.target.value })}
            className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900" />
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 h-12 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">Terug</button>
        <button disabled={!valid} onClick={onNext}
          className="flex-1 h-12 rounded-lg text-white font-medium disabled:opacity-40"
          style={{ backgroundColor: brandColor }}>
          Volgende
        </button>
      </div>
    </div>
  );
}
```

### 6. `src/components/public-application/ApplicationStep3Motivation.tsx`

```typescript
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

export function ApplicationStep3Motivation({ form, setForm, brandColor, slug, onBack, onSuccess }: Props) {
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
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off"
        value={form.website_url}
        onChange={e => setForm({ ...form, website_url: e.target.value })}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        aria-hidden="true" />

      <label className="block">
        <span className="text-sm text-gray-700 mb-1.5 block">Motivatie (optioneel)</span>
        <textarea rows={6} maxLength={MAX} value={form.motivation}
          onChange={e => setForm({ ...form, motivation: e.target.value })}
          placeholder="Waarom wil je bij ons werken? Welke ervaring heb je?"
          className="w-full p-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none" />
        <div className="text-xs text-gray-400 mt-1 text-right">{form.motivation.length}/{MAX}</div>
      </label>

      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} disabled={submitting}
          className="flex-1 h-12 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40">
          Terug
        </button>
        <button onClick={submit} disabled={submitting}
          className="flex-1 h-12 rounded-lg text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: brandColor }}>
          {submitting ? 'Versturen…' : 'Verstuur sollicitatie'}
        </button>
      </div>
    </div>
  );
}

function messageFor(code: string): string {
  switch (code) {
    case 'rate_limited': return 'Je hebt recent al gesolliciteerd. Probeer het later opnieuw.';
    case 'already_applied': return 'Er is al een sollicitatie met dit e-mailadres. We nemen contact op.';
    case 'invalid_email': return 'Vul een geldig e-mailadres in.';
    case 'name_required': return 'Vul je naam in.';
    case 'page_not_found': return 'Deze sollicitatiepagina is niet beschikbaar.';
    default: return 'Er ging iets mis. Probeer het later opnieuw.';
  }
}
```

### 7. `src/components/public-application/ApplicationStepSuccess.tsx`

```typescript
import { CheckCircle2 } from 'lucide-react';

interface Props { message: string; brandColor: string; }

export function ApplicationStepSuccess({ message, brandColor }: Props) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
        style={{ backgroundColor: `${brandColor}15` }}>
        <CheckCircle2 className="w-8 h-8" style={{ color: brandColor }} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Bedankt!</h2>
      <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>
    </div>
  );
}
```

### 8. `src/components/public-application/PublicApplicationNotFound.tsx`

```typescript
export function PublicApplicationNotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 font-[Inter,sans-serif]">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Pagina niet gevonden</h1>
        <p className="text-sm text-gray-600">Deze sollicitatiepagina bestaat niet of is niet meer actief.</p>
      </div>
    </div>
  );
}
```

### 9. `src/App.tsx` — route registreren **buiten** AppLayout

Toevoegen vóór de `<AppLayout>`-wrapped routes:

```typescript
import PublicApplicationPage from '@/pages/PublicApplicationPage';

// In de Routes:
<Route path="/werken-bij/:slug" element={<PublicApplicationPage />} />
```

## Reviewpunten

1. **Branding fallback** — bij geen brand_color gebruik ik `#0F172A` (slate-900). Akkoord?
2. **Available_positions** komt uit settings (jsonb array). Standaard seed = `["Bediening","Keuken","Bar","Afwas"]`. Akkoord met deze defaults?
3. **`hours_preference` opties** zijn hardcoded in Step2 (Bijbaan/Parttime/Fulltime/Flexibel). Akkoord, of moet dit ook configureerbaar via settings?
4. **Honeypot veld `website_url`** — match exact wat de Edge Function checkt. ✓
5. **Geen react-helmet** — gebruik native `document.title` + `<meta>` injection in `useEffect`. Lichtgewicht, geen extra dependency.
6. **Route-positie in App.tsx** — controleer ik bij implementatie dat hij vóór de catch-all `*` staat en buiten `<AppLayout>` zit (geen sidebar/header).

Bij akkoord: "ga bouwen 1.2" → ik schrijf alle 9 bestanden.

