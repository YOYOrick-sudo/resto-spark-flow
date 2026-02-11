import { useState } from 'react';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

interface ComposeMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onSend: (data: { subject: string; bodyHtml: string; bodyText: string }) => void;
  isSending: boolean;
}

export function ComposeMessageModal({
  open,
  onOpenChange,
  candidateName,
  onSend,
  isSending,
}: ComposeMessageModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    // Wrap plain text in simple HTML paragraphs
    const bodyHtml = body
      .split('\n')
      .map((line) => (line.trim() ? `<p>${line}</p>` : '<br/>'))
      .join('');

    onSend({ subject: subject.trim(), bodyHtml, bodyText: body.trim() });
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setSubject('');
      setBody('');
    }
    onOpenChange(val);
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={handleOpenChange}
      icon={<Mail className="h-5 w-5 text-primary" />}
      title="Nieuw bericht"
      description={`Verstuur een bericht naar ${candidateName}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <NestoButton
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSending}
          >
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSend}
            disabled={!canSend || isSending}
            isLoading={isSending}
          >
            Versturen
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Onderwerp
          </label>
          <NestoInput
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Bijv. Uitnodiging kennismakingsgesprek"
            disabled={isSending}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Bericht
          </label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Schrijf je bericht..."
            rows={8}
            disabled={isSending}
          />
        </div>
      </div>
    </NestoModal>
  );
}
