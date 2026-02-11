import { useState } from 'react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoInput } from '@/components/polar/NestoInput';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface AddPhaseModalProps {
  onAdd: (data: { name: string; description?: string }) => void;
  isLoading?: boolean;
}

export function AddPhaseModal({ onAdd, isLoading }: AddPhaseModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), description: description.trim() || undefined });
    setName('');
    setDescription('');
    setOpen(false);
  };

  return (
    <>
      <NestoButton variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Fase toevoegen
      </NestoButton>

      <NestoModal
        open={open}
        onOpenChange={setOpen}
        title="Nieuwe fase toevoegen"
        description="Voeg een fase toe aan de onboarding pipeline."
        footer={
          <div className="flex justify-end gap-2">
            <NestoButton variant="outline" onClick={() => setOpen(false)}>Annuleren</NestoButton>
            <NestoButton onClick={handleSubmit} disabled={!name.trim() || isLoading}>
              Toevoegen
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5">Naam</Label>
            <NestoInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Proefdag"
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Beschrijving (optioneel)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte beschrijving van deze fase..."
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </div>
        </div>
      </NestoModal>
    </>
  );
}
