import { useState } from 'react';
import { Star } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EvaluationFormProps {
  onSave: (evaluation: { rating: number; notes: string; recommendation: string }) => void;
  isLoading?: boolean;
}

const RECOMMENDATIONS = [
  { value: 'strongly_recommend', label: 'Sterk aanbevolen' },
  { value: 'recommend', label: 'Aanbevolen' },
  { value: 'neutral', label: 'Neutraal' },
  { value: 'not_recommend', label: 'Niet aanbevolen' },
];

export function EvaluationForm({ onSave, isLoading }: EvaluationFormProps) {
  const [rating, setRating] = useState(0);
  const [recommendation, setRecommendation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!rating || !recommendation) return;
    onSave({ rating, notes, recommendation });
    setRating(0);
    setRecommendation('');
    setNotes('');
  };

  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-3 mt-4">
      <h4 className="text-sm font-medium text-foreground">Evaluatie</h4>

      {/* Star rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setRating(s)} className="p-0.5">
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                s <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>

      {/* Recommendation */}
      <NestoSelect
        label="Aanbeveling"
        value={recommendation}
        onValueChange={setRecommendation}
        options={RECOMMENDATIONS}
        placeholder="Selecteer..."
      />

      {/* Notes */}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observaties, sterke punten, aandachtspunten..."
        rows={3}
        className="resize-none"
      />

      <NestoButton
        size="sm"
        onClick={handleSave}
        disabled={!rating || !recommendation}
        isLoading={isLoading}
      >
        Evaluatie opslaan
      </NestoButton>
    </div>
  );
}
