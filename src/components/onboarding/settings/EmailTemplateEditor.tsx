import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NestoCard } from '@/components/polar/NestoCard';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface EmailTemplate {
  subject: string;
  body: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: 'Ontvangstbevestiging',
  rejection: 'Afwijzing',
  additional_questions: 'Aanvullende vragen',
  interview_invite: 'Uitnodiging gesprek',
  trial_day_invite: 'Uitnodiging meeloopdag',
  offer_and_form: 'Aanbod + formulieren',
  welcome: 'Welkom',
  internal_reminder: 'Herinnering (intern)',
  internal_reminder_urgent: 'Urgente herinnering (intern)',
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  confirmation: 'Nieuwe kandidaat',
  rejection: 'Kandidaat afgewezen',
  additional_questions: 'Fase 2: Screening',
  interview_invite: 'Fase 3: Uitnodiging gesprek',
  trial_day_invite: 'Fase 5: Meeloopdag',
  offer_and_form: 'Fase 8: Pre-boarding',
  welcome: 'Kandidaat aangenomen',
  internal_reminder: 'Taak te lang open',
  internal_reminder_urgent: 'Taak veel te lang open',
};

const VARIABLES = [
  { key: '[voornaam]', label: 'Voornaam' },
  { key: '[achternaam]', label: 'Achternaam' },
  { key: '[vestiging]', label: 'Vestiging' },
  { key: '[functie]', label: 'Functie' },
  { key: '[datum]', label: 'Datum' },
  { key: '[link]', label: 'Link' },
];

const PREVIEW_DATA: Record<string, string> = {
  '[voornaam]': 'Jan',
  '[achternaam]': 'Jansen',
  '[vestiging]': 'Restaurant De Kok',
  '[functie]': 'Kok',
  '[datum]': new Date().toLocaleDateString('nl-NL'),
  '[link]': 'https://nesto.app/onboarding/abc123',
};

interface EmailTemplateEditorProps {
  templateKey: string;
  template: EmailTemplate;
  onChange: (key: string, template: EmailTemplate) => void;
}

export function EmailTemplateEditor({ templateKey, template, onChange }: EmailTemplateEditorProps) {
  const [localSubject, setLocalSubject] = useState(template.subject);
  const [localBody, setLocalBody] = useState(template.body);
  const [showPreview, setShowPreview] = useState(false);

  const debouncedOnChange = useDebouncedCallback((subject: string, body: string) => {
    onChange(templateKey, { subject, body });
  }, 800);

  const handleSubjectChange = (value: string) => {
    setLocalSubject(value);
    debouncedOnChange(value, localBody);
  };

  const handleBodyChange = (value: string) => {
    setLocalBody(value);
    debouncedOnChange(localSubject, value);
  };

  const insertVariable = (variable: string) => {
    const newBody = localBody + variable;
    setLocalBody(newBody);
    debouncedOnChange(localSubject, newBody);
  };

  const renderPreview = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(PREVIEW_DATA)) {
      result = result.split(key).join(value);
    }
    return result;
  };

  return (
    <NestoCard className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{TEMPLATE_LABELS[templateKey] || templateKey}</h3>
          <p className="text-xs text-muted-foreground">{TEMPLATE_DESCRIPTIONS[templateKey] || templateKey}</p>
        </div>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{templateKey}</span>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs mb-1">Onderwerp</Label>
          <Input
            value={localSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            placeholder="Email onderwerp..."
            className="h-8 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs mb-1">Body</Label>
          <Textarea
            value={localBody}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Email body..."
            className="text-sm min-h-[160px] resize-y"
            rows={8}
          />
        </div>

        {/* Variable chips */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 self-center">Variabelen:</span>
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              onClick={() => insertVariable(v.key)}
              className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono"
            >
              {v.key}
            </button>
          ))}
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {showPreview ? 'Preview verbergen' : 'Preview tonen'}
        </button>

        {showPreview && (
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Onderwerp:</p>
            <p className="text-sm font-medium mb-2">{renderPreview(localSubject)}</p>
            <p className="text-xs text-muted-foreground mb-1">Body:</p>
            <div className="text-sm whitespace-pre-wrap">{renderPreview(localBody)}</div>
          </div>
        )}
      </div>
    </NestoCard>
  );
}
