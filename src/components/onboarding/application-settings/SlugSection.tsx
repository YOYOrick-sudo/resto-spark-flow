import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { NestoInput } from '@/components/polar/NestoInput';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { useApplicationSlugAvailability } from '@/hooks/useApplicationSlugAvailability';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
  originalSlug: string;
  isLive: boolean;
}

export function SlugSection({ draft, setDraft, originalSlug, isLive }: Props) {
  const status = useApplicationSlugAvailability(draft.slug, draft.id);
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}/werken-bij/${draft.slug}`;

  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const sanitize = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const handleChange = (raw: string) => {
    const next = sanitize(raw);
    if (isLive && next !== originalSlug && next.length > 0) {
      // buffer locally, ask for confirmation before mutating draft
      setPendingSlug(next);
      return;
    }
    setDraft({ ...draft, slug: next });
  };

  const confirmChange = () => {
    if (pendingSlug !== null) setDraft({ ...draft, slug: pendingSlug });
    setPendingSlug(null);
  };

  return (
    <section>
      <h2 className="text-base font-medium mb-1">URL</h2>
      <p className="text-sm text-muted-foreground mb-4">
        De unieke link naar je sollicitatiepagina. Gebruik alleen kleine letters, cijfers en streepjes (3–50 tekens).
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">{baseUrl}/werken-bij/</span>
          <div className="flex-1">
            <NestoInput
              value={pendingSlug ?? draft.slug}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="restaurant-naam"
              rightIcon={
                status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                status === 'available' ? <Check className="h-4 w-4 text-success" /> :
                (status === 'taken' || status === 'invalid') ? <X className="h-4 w-4 text-destructive" /> :
                null
              }
            />
          </div>
        </div>
        {status === 'taken' && <p className="text-xs text-destructive">Deze URL is al in gebruik.</p>}
        {status === 'invalid' && <p className="text-xs text-destructive">Min. 3 tekens; alleen a–z, 0–9 en -.</p>}
        {status === 'available' && (
          <a href={fullUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-primary hover:underline inline-block">{fullUrl} ↗</a>
        )}
      </div>

      <ConfirmDialog
        open={pendingSlug !== null}
        onOpenChange={(o) => { if (!o) setPendingSlug(null); }}
        title="URL wijzigen?"
        description={`Je sollicitatiepagina is live. Als je de URL wijzigt naar "${pendingSlug ?? ''}" werken bestaande gedeelde links en QR-codes niet meer. Weet je het zeker?`}
        confirmLabel="Ja, wijzig URL"
        cancelLabel="Annuleren"
        variant="destructive"
        onConfirm={confirmChange}
      />
    </section>
  );
}