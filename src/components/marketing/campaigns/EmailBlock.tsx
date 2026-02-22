import { NestoButton } from '@/components/polar/NestoButton';
import { NestoInput } from '@/components/polar/NestoInput';
import { Trash2, GripVertical, Type, Image, MousePointerClick, Minus, Heading, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailBlockData {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'footer';
  content: {
    text?: string;
    url?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
  };
}

interface EmailBlockProps {
  block: EmailBlockData;
  onChange: (block: EmailBlockData) => void;
  onRemove: () => void;
  isAutoBlock?: boolean;
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
