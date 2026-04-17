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
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  positions: [],
  availability_start: '',
  hours_preference: '',
  motivation: '',
  website_url: '',
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
        if (prop) el.setAttribute('property', name);
        else el.setAttribute('name', name);
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
            <img
              src={data.branding.logo_url}
              alt={data.branding.location_name}
              className="h-12 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {data.settings.welcome_title}
          </h1>
          {data.settings.welcome_text && step !== 'success' && (
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
              {data.settings.welcome_text}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {step !== 'success' && <ApplicationProgress current={step} brandColor={brandColor} />}

          {step === 1 && (
            <ApplicationStep1Personal
              form={form}
              setForm={setForm}
              brandColor={brandColor}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ApplicationStep2Position
              form={form}
              setForm={setForm}
              brandColor={brandColor}
              positions={data.settings.available_positions}
              showHours={data.settings.show_hours}
              showStartDate={data.settings.show_start_date}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ApplicationStep3Motivation
              form={form}
              setForm={setForm}
              brandColor={brandColor}
              slug={slug!}
              onBack={() => setStep(2)}
              onSuccess={() => setStep('success')}
            />
          )}
          {step === 'success' && (
            <ApplicationStepSuccess
              message={data.settings.success_message}
              brandColor={brandColor}
            />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by Nesto</p>
      </div>
    </div>
  );
}
