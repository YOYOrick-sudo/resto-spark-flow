import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Code, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { cn } from '@/lib/utils';

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

const ASSISTANT_TEMPLATES = new Set([
  'confirmation', 'additional_questions', 'interview_invite',
  'trial_day_invite', 'offer_and_form', 'welcome',
  'internal_reminder', 'internal_reminder_urgent',
]);

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
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isConfigured = (template.subject ?? '').trim() !== '' && (template.body ?? '').trim() !== '';

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
    <NestoCard className="p-0 overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-accent/40 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 rounded-card outline-none"
      >
        <div className="flex items-start gap-2 min-w-0">
          {expanded
            ? <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-sm font-semibold truncate",
                !isConfigured && "text-muted-foreground"
              )}>
                {TEMPLATE_LABELS[templateKey] || templateKey}
              </h3>
              {isConfigured && (
                <Check className="h-4 w-4 text-success flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{TEMPLATE_DESCRIPTIONS[templateKey] || templateKey}</p>
              {ASSISTANT_TEMPLATES.has(templateKey) && (
                <NestoBadge variant="primary" size="sm">
                  <AssistentIcon size={12} className="mr-0.5" />
                  Assistent
                </NestoBadge>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
          {templateKey}
        </span>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3">
          {/* Form grouping block */}
          <div className="bg-secondary/50 rounded-card p-4 space-y-3">
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
          </div>

          {/* Variable chips */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 self-center inline-flex items-center gap-1">
                <Code className="h-3 w-3" />
                Variabelen:
              </span>
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="text-xs px-2 py-1 rounded-control bg-secondary border border-border/40 text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors duration-150 font-mono focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 outline-none"
                >
                  {v.key}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Klik op een variabele om deze in te voegen op de cursorpositie</p>
          </div>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs px-2 py-1 rounded-button bg-secondary/80 hover:bg-secondary border border-border/40 transition-colors duration-150 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 outline-none"
          >
            {showPreview ? 'Preview verbergen' : 'Preview tonen'}
            {showPreview ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {showPreview && (
            <div className="bg-secondary/50 rounded-card p-4 border border-border/40 space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Onderwerp</p>
              <p className="text-sm font-semibold mb-3">{renderPreview(localSubject)}</p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Body</p>
              <div className="text-sm whitespace-pre-wrap tabular-nums">{renderPreview(localBody)}</div>
            </div>
          )}
        </div>
      )}
    </NestoCard>
  );
}
