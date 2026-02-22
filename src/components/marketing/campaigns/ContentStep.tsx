import { useState } from 'react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoModal } from '@/components/polar/NestoModal';
import { EmailBlock, type EmailBlockData } from './EmailBlock';
import { EmailPreview } from './EmailPreview';
import { Type, Image, MousePointerClick, Minus, Sparkles, UtensilsCrossed, CalendarDays, Star } from 'lucide-react';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useGenerateEmailContent } from '@/hooks/useGenerateContent';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

interface ContentStepProps {
  blocks: EmailBlockData[];
  onChange: (blocks: EmailBlockData[]) => void;
}

const ADD_BLOCK_TYPES = [
  { type: 'text' as const, icon: Type, label: 'Tekst' },
  { type: 'image' as const, icon: Image, label: 'Afbeelding' },
  { type: 'button' as const, icon: MousePointerClick, label: 'Button' },
  { type: 'divider' as const, icon: Minus, label: 'Divider' },
  { type: 'menu_item' as const, icon: UtensilsCrossed, label: 'Menu Item' },
  { type: 'reserve_button' as const, icon: CalendarDays, label: 'Reserveerknop' },
  { type: 'review_quote' as const, icon: Star, label: 'Review Quote' },
];

export function ContentStep({ blocks, onChange }: ContentStepProps) {
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();
  const generateEmail = useGenerateEmailContent();

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');

  const addBlock = (type: EmailBlockData['type']) => {
    const newBlock: EmailBlockData = {
      id: crypto.randomUUID(),
      type,
      content: {},
    };
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

  // Extract current email body text from text blocks
  const currentEmailBody = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.content.text ?? '')
    .join('\n\n');

  async function handleAIAdjust() {
    if (!aiInstruction.trim()) return;

    try {
      const result = await generateEmail.mutateAsync({
        email_body: currentEmailBody,
        instruction: aiInstruction,
      });

      // Update text blocks with AI result
      const updatedBody = result.updated_body;
      const textBlocks = blocks.filter((b) => b.type === 'text');

      if (textBlocks.length === 1) {
        // Single text block: replace its content
        onChange(
          blocks.map((b) =>
            b.type === 'text' ? { ...b, content: { ...b.content, text: updatedBody } } : b
          )
        );
      } else if (textBlocks.length > 1) {
        // Multiple text blocks: put all content in the first, clear the rest
        let firstFound = false;
        onChange(
          blocks.map((b) => {
            if (b.type !== 'text') return b;
            if (!firstFound) {
              firstFound = true;
              return { ...b, content: { ...b.content, text: updatedBody } };
            }
            return { ...b, content: { ...b.content, text: '' } };
          })
        );
      } else {
        // No text blocks: insert one before footer
        const newBlock: EmailBlockData = {
          id: crypto.randomUUID(),
          type: 'text',
          content: { text: updatedBody },
        };
        const footerIdx = blocks.findIndex((b) => b.type === 'footer');
        if (footerIdx > -1) {
          const newBlocks = [...blocks];
          newBlocks.splice(footerIdx, 0, newBlock);
          onChange(newBlocks);
        } else {
          onChange([...blocks, newBlock]);
        }
      }

      nestoToast.success('Email aangepast door AI');
      setAiModalOpen(false);
      setAiInstruction('');
    } catch {
      // Error handled by hook
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inhoud bewerken</h2>
          <p className="text-sm text-muted-foreground mt-1">Voeg blokken toe en pas de inhoud aan.</p>
        </div>
        <NestoButton
          variant="outline"
          size="sm"
          onClick={() => setAiModalOpen(true)}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          Pas aan met AI
        </NestoButton>
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

      {/* AI Adjust Modal */}
      <NestoModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        title="Pas aan met AI"
        description="Beschrijf wat je wilt aanpassen en AI past de e-mailtekst aan."
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <NestoButton variant="outline" onClick={() => setAiModalOpen(false)}>
              Annuleren
            </NestoButton>
            <NestoButton
              onClick={handleAIAdjust}
              disabled={generateEmail.isPending || !aiInstruction.trim()}
            >
              {generateEmail.isPending ? 'Aanpassen...' : 'Aanpassen'}
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="text-sm font-medium">Wat wil je aanpassen?</label>
          <textarea
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Bijv. maak de tekst korter, voeg een CTA toe, maak het persoonlijker..."
          />
        </div>
      </NestoModal>
    </div>
  );
}
