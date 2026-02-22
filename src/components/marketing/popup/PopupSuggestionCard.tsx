import { useState } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Sparkles, Lightbulb } from 'lucide-react';
import { nestoToast } from '@/lib/nestoToast';
import { useAcceptPopupSuggestion, type PopupSuggestion } from '@/hooks/usePopupSuggestion';
import { DismissReasonModal } from './DismissReasonModal';

const TYPE_LABELS: Record<string, string> = {
  reservation: 'Ervaring',
  newsletter: 'Nieuwsbrief',
  custom: 'Custom',
};

interface Props {
  suggestion: PopupSuggestion;
}

export function PopupSuggestionCard({ suggestion }: Props) {
  const [showDismiss, setShowDismiss] = useState(false);
  const accept = useAcceptPopupSuggestion();

  const handleAccept = () => {
    accept.mutate(suggestion, {
      onSuccess: () => nestoToast.success('Popup bijgewerkt', 'AI suggestie toegepast.'),
      onError: () => nestoToast.error('Fout', 'Kon suggestie niet toepassen.'),
    });
  };

  return (
    <>
      <NestoCard className="p-5 border-primary/20 bg-primary/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Suggestie</span>
        </div>

        <h3 className="text-base font-bold text-foreground mb-1">{suggestion.headline}</h3>
        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <NestoBadge variant="default">{TYPE_LABELS[suggestion.popup_type] ?? suggestion.popup_type}</NestoBadge>
          {suggestion.tickets?.name && (
            <NestoBadge variant="outline" className="gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: suggestion.tickets.color }} />
              {suggestion.tickets.name}
            </NestoBadge>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50 mb-4">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground">{suggestion.reasoning}</p>
        </div>

        <div className="flex gap-2">
          <NestoButton onClick={handleAccept} isLoading={accept.isPending} size="sm">
            Toepassen
          </NestoButton>
          <NestoButton variant="secondary" onClick={() => setShowDismiss(true)} size="sm">
            Afwijzen
          </NestoButton>
        </div>
      </NestoCard>

      <DismissReasonModal
        open={showDismiss}
        onClose={() => setShowDismiss(false)}
        suggestionId={suggestion.id}
      />
    </>
  );
}
