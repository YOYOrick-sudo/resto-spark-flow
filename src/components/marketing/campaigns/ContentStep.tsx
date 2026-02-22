import { NestoButton } from '@/components/polar/NestoButton';
import { EmailBlock, type EmailBlockData } from './EmailBlock';
import { EmailPreview } from './EmailPreview';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Type, Image, MousePointerClick, Minus, Sparkles } from 'lucide-react';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useUserContext } from '@/contexts/UserContext';

interface ContentStepProps {
  blocks: EmailBlockData[];
  onChange: (blocks: EmailBlockData[]) => void;
}

const ADD_BLOCK_TYPES = [
  { type: 'text' as const, icon: Type, label: 'Tekst' },
  { type: 'image' as const, icon: Image, label: 'Afbeelding' },
  { type: 'button' as const, icon: MousePointerClick, label: 'Button' },
  { type: 'divider' as const, icon: Minus, label: 'Divider' },
];

export function ContentStep({ blocks, onChange }: ContentStepProps) {
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();

  const addBlock = (type: EmailBlockData['type']) => {
    const newBlock: EmailBlockData = {
      id: crypto.randomUUID(),
      type,
      content: {},
    };
    // Insert before footer (last block)
    const footerIdx = blocks.findIndex((b) => b.type === 'footer');
    if (footerIdx > -1) {
      const newBlocks = [...blocks];
      newBlocks.splice(footerIdx, 0, newBlock);
      onChange(newBlocks);
    } else {
      onChange([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, updated: EmailBlockData) => {
    onChange(blocks.map((b) => (b.id === id ? updated : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inhoud bewerken</h2>
          <p className="text-sm text-muted-foreground mt-1">Voeg blokken toe en pas de inhoud aan.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <NestoButton variant="outline" size="sm" disabled leftIcon={<Sparkles className="h-4 w-4" />}>
                Pas aan met AI
              </NestoButton>
            </span>
          </TooltipTrigger>
          <TooltipContent>Binnenkort beschikbaar</TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {ADD_BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
              <NestoButton
                key={type}
                variant="outline"
                size="sm"
                onClick={() => addBlock(type)}
                leftIcon={<Icon className="h-3.5 w-3.5" />}
              >
                {label}
              </NestoButton>
            ))}
          </div>

          <div className="space-y-2">
            {blocks.map((block) => (
              <EmailBlock
                key={block.id}
                block={block}
                onChange={(updated) => updateBlock(block.id, updated)}
                onRemove={() => removeBlock(block.id)}
                isAutoBlock={block.type === 'header' || block.type === 'footer'}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
          <EmailPreview
            blocks={blocks}
            brandColor={brandKit?.primary_color ?? undefined}
            logoUrl={brandKit?.logo_url}
            locationName={currentLocation?.name ?? 'Restaurant'}
          />
        </div>
      </div>
    </div>
  );
}
