import { useState } from 'react';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoButton } from '@/components/polar/NestoButton';
import { Textarea } from '@/components/ui/textarea';
import { nestoToast } from '@/lib/nestoToast';
import { useDismissPopupSuggestion } from '@/hooks/usePopupSuggestion';

const REASONS = [
  'Past niet bij ons restaurant',
  'Timing klopt niet',
  'We willen geen popup wijzigen',
];

interface Props {
  open: boolean;
  onClose: () => void;
  suggestionId: string;
}

export function DismissReasonModal({ open, onClose, suggestionId }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [showOther, setShowOther] = useState(false);
  const dismiss = useDismissPopupSuggestion();

  const toggleReason = (r: string) => {
    setSelected(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleSubmit = () => {
    const reasons = [...selected];
    if (showOther && otherText.trim()) reasons.push(otherText.trim());
    if (reasons.length === 0) return;

    dismiss.mutate(
      { suggestionId, reason: JSON.stringify(reasons) },
      {
        onSuccess: () => {
          nestoToast.info('Suggestie afgewezen', 'We leren ervan.');
          onClose();
          setSelected([]);
          setOtherText('');
          setShowOther(false);
        },
        onError: () => nestoToast.error('Fout', 'Kon suggestie niet afwijzen.'),
      }
    );
  };

  const hasSelection = selected.length > 0 || (showOther && otherText.trim().length > 0);

  return (
    <NestoModal open={open} onOpenChange={(v) => !v && onClose()} title="Waarom past dit niet?">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleReason(r)}
              className={`px-3 py-1.5 rounded-button text-sm font-medium transition-all duration-200 ${
                selected.includes(r)
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowOther(!showOther)}
            className={`px-3 py-1.5 rounded-button text-sm font-medium transition-all duration-200 ${
              showOther
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
            }`}
          >
            Anders
          </button>
        </div>

        {showOther && (
          <Textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Vertel ons waarom..."
            rows={2}
          />
        )}

        <div className="flex gap-2 justify-end pt-2">
          <NestoButton variant="ghost" onClick={onClose} size="sm">
            Annuleer
          </NestoButton>
          <NestoButton onClick={handleSubmit} disabled={!hasSelection} isLoading={dismiss.isPending} size="sm">
            Bevestig
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}
