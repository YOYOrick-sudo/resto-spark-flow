import { NestoButton } from '@/components/polar/NestoButton';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { Trash2, GripVertical, Type, Image, MousePointerClick, Minus, Heading, AlignLeft, UtensilsCrossed, CalendarDays, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeaturedReviews } from '@/hooks/useReviews';

export interface EmailBlockData {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'footer' | 'menu_item' | 'reserve_button' | 'review_quote';
  content: {
    text?: string;
    url?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
    menuItemName?: string;
    menuItemDescription?: string;
    menuItemPrice?: string;
    menuItemImageUrl?: string;
    reviewId?: string;
    reviewRating?: number;
    reviewText?: string;
    reviewAuthor?: string;
  };
}

interface EmailBlockProps {
  block: EmailBlockData;
  onChange: (block: EmailBlockData) => void;
  onRemove: () => void;
  isAutoBlock?: boolean;
}

function ReviewQuoteEditor({ block, onUpdate }: { block: EmailBlockData; onUpdate: (u: Partial<EmailBlockData['content']>) => void }) {
  const { data: reviews = [] } = useFeaturedReviews();
  if (block.type !== 'review_quote') return null;

  const options = reviews.map((r) => ({
    value: r.id,
    label: `${'★'.repeat(r.rating)} ${(r.review_text ?? '').slice(0, 40)}… — ${r.author_name}`,
  }));

  return (
    <div className="space-y-2">
      <NestoSelect
        value={block.content.reviewId ?? ''}
        onValueChange={(id) => {
          const rev = reviews.find((r) => r.id === id);
          if (rev) {
            onUpdate({
              reviewId: rev.id,
              reviewRating: rev.rating,
              reviewText: (rev.review_text ?? '').slice(0, 150),
              reviewAuthor: rev.author_name,
            });
          }
        }}
        options={options}
        placeholder="Kies een featured review..."
      />
      {block.content.reviewAuthor && (
        <div className="text-xs text-muted-foreground">
          {'★'.repeat(block.content.reviewRating ?? 0)} — {block.content.reviewAuthor}
        </div>
      )}
    </div>
  );
}

export function EmailBlock({ block, onChange, onRemove, isAutoBlock }: EmailBlockProps) {
  const updateContent = (updates: Partial<EmailBlockData['content']>) => {
    onChange({ ...block, content: { ...block.content, ...updates } });
  };

  const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    header: Heading,
    text: Type,
    image: Image,
    button: MousePointerClick,
    divider: Minus,
    footer: AlignLeft,
    menu_item: UtensilsCrossed,
    reserve_button: CalendarDays,
    review_quote: Star,
  };

  const Icon = BLOCK_ICONS[block.type] ?? Type;

  return (
    <div className={cn(
      'group flex items-start gap-2 p-3 rounded-card border border-border/50 bg-card transition-colors',
      isAutoBlock && 'opacity-70'
    )}>
      <div className="flex flex-col items-center gap-1 pt-1">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {block.type === 'header' && (
          <div className="text-xs text-muted-foreground italic">Header — automatisch gevuld met logo</div>
        )}

        {block.type === 'text' && (
          <textarea
            value={block.content.text ?? ''}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Typ je tekst hier..."
            className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:!border-primary min-h-[80px] resize-y"
          />
        )}

        {block.type === 'image' && (
          <div className="flex items-center justify-center h-24 rounded-button border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-sm">
            Afbeelding uploaden (binnenkort)
          </div>
        )}

        {block.type === 'button' && (
          <div className="space-y-2">
            <NestoInput
              placeholder="Knoptekst"
              value={block.content.buttonText ?? ''}
              onChange={(e) => updateContent({ buttonText: e.target.value })}
            />
            <NestoInput
              placeholder="URL (bijv. https://...)"
              value={block.content.buttonUrl ?? ''}
              onChange={(e) => updateContent({ buttonUrl: e.target.value })}
            />
          </div>
        )}

        {block.type === 'divider' && (
          <hr className="border-border" />
        )}

        {block.type === 'footer' && (
          <div className="text-xs text-muted-foreground italic">Footer — automatisch: locatie-info + uitschrijflink</div>
        )}

        {block.type === 'menu_item' && (
          <div className="space-y-2">
            <NestoInput
              placeholder="Naam gerecht"
              value={block.content.menuItemName ?? ''}
              onChange={(e) => updateContent({ menuItemName: e.target.value })}
            />
            <NestoInput
              placeholder="Beschrijving"
              value={block.content.menuItemDescription ?? ''}
              onChange={(e) => updateContent({ menuItemDescription: e.target.value })}
            />
            <NestoInput
              placeholder="Prijs (bijv. €14,50)"
              value={block.content.menuItemPrice ?? ''}
              onChange={(e) => updateContent({ menuItemPrice: e.target.value })}
            />
            <div className="flex items-center justify-center h-16 rounded-button border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs">
              Foto uploaden (binnenkort)
            </div>
          </div>
        )}

        {block.type === 'reserve_button' && (
          <div className="text-xs text-muted-foreground italic">Reserveerknop — automatisch link naar Guest Widget</div>
        )}

        <ReviewQuoteEditor block={block} onUpdate={updateContent} />
      </div>

      {!isAutoBlock && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
