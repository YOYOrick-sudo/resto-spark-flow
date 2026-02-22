import { useMarketingTemplates } from '@/hooks/useMarketingTemplates';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { cn } from '@/lib/utils';
import { FileText, Gift, Heart, RotateCcw, Megaphone, CalendarDays, Snowflake, File } from 'lucide-react';
import { useState } from 'react';

const CATEGORIES = [
  { value: 'all', label: 'Alle' },
  { value: 'welcome', label: 'Welkom' },
  { value: 'birthday', label: 'Verjaardag' },
  { value: 'winback', label: 'Win-back' },
  { value: 'promotion', label: 'Promotie' },
  { value: 'event', label: 'Evenement' },
  { value: 'seasonal', label: 'Seizoen' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: Gift,
  birthday: Heart,
  winback: RotateCcw,
  promotion: Megaphone,
  event: CalendarDays,
  seasonal: Snowflake,
  custom: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-success/10 text-success',
  birthday: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  winback: 'bg-warning/10 text-warning',
  promotion: 'bg-primary/10 text-primary',
  event: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  seasonal: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  custom: 'bg-muted text-muted-foreground',
};

interface TemplateStepProps {
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null, html: string | null) => void;
}

export function TemplateStep({ selectedTemplateId, onSelect }: TemplateStepProps) {
  const [category, setCategory] = useState('all');
  const { data: templates = [], isLoading } = useMarketingTemplates(category === 'all' ? undefined : category);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Kies een template</h2>
        <p className="text-sm text-muted-foreground mt-1">Selecteer een basis voor je campagne of start blanco.</p>
      </div>

      <NestoOutlineButtonGroup
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
        size="sm"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Blanco option */}
        <button
          type="button"
          onClick={() => onSelect(null, null)}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-6 rounded-card border-2 transition-all duration-200 min-h-[160px]',
            selectedTemplateId === null
              ? 'border-primary bg-primary/5'
              : 'border-border/50 bg-card hover:border-border hover:bg-accent/30'
          )}
        >
          <File className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Blanco</span>
          <span className="text-xs text-muted-foreground">Start vanaf nul</span>
        </button>

        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[160px] bg-muted rounded-card animate-pulse" />
            ))
          : templates.map((t) => {
              const Icon = CATEGORY_ICONS[t.category] ?? FileText;
              const colorClass = CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.custom;
              const isSelected = selectedTemplateId === t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id, null)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 p-6 rounded-card border-2 transition-all duration-200 min-h-[160px]',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 bg-card hover:border-border hover:bg-accent/30'
                  )}
                >
                  <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl', colorClass)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground line-clamp-2 text-center">{t.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
                </button>
              );
            })}
      </div>
    </div>
  );
}
