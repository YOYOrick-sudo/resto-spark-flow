import { useOnboardingSettings, useUpdateOnboardingSettings } from '@/hooks/useOnboardingSettings';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { Json } from '@/integrations/supabase/types';

interface EmailTemplate {
  subject: string;
  body: string;
}

const TEMPLATE_ORDER = [
  'confirmation',
  'rejection',
  'additional_questions',
  'interview_invite',
  'trial_day_invite',
  'offer_and_form',
  'welcome',
  'internal_reminder',
  'internal_reminder_urgent',
];

export function EmailTemplatesSection() {
  const { data: settings, isLoading } = useOnboardingSettings();
  const updateSettings = useUpdateOnboardingSettings();

  if (isLoading) return <><CardSkeleton lines={4} /><CardSkeleton lines={4} /><CardSkeleton lines={4} /></>;
  if (!settings) return <EmptyState title="Geen instellingen" description="Onboarding instellingen zijn nog niet geconfigureerd." />;

  const templates = (settings.email_templates as unknown as Record<string, EmailTemplate>) || {};

  const handleTemplateChange = (key: string, template: EmailTemplate) => {
    const updatedTemplates = { ...templates, [key]: template };
    updateSettings.mutate({ email_templates: updatedTemplates as unknown as Json });
  };

  return (
    <div className="space-y-3">
      {TEMPLATE_ORDER.map((key) => {
        const template = templates[key] || { subject: '', body: '' };
        return (
          <EmailTemplateEditor
            key={key}
            templateKey={key}
            template={template}
            onChange={handleTemplateChange}
          />
        );
      })}
    </div>
  );
}
