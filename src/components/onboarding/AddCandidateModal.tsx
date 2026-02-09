import { useState } from 'react';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoButton } from '@/components/polar/NestoButton';
import { useCreateCandidate } from '@/hooks/useCreateCandidate';

const positionOptions = [
  { value: 'bediening', label: 'Bediening' },
  { value: 'keuken', label: 'Keuken' },
  { value: 'bar', label: 'Bar' },
  { value: 'afwas', label: 'Afwas' },
  { value: 'management', label: 'Management' },
  { value: 'anders', label: 'Anders' },
];

const sourceOptions = [
  { value: 'website', label: 'Website' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'social-media', label: 'Social media' },
  { value: 'anders', label: 'Anders' },
];

interface AddCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

export function AddCandidateModal({ open, onOpenChange, locationId }: AddCandidateModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const createCandidate = useCreateCandidate();

  const isValid = firstName.trim() && lastName.trim() && email.trim();

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPosition('');
    setSource('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const noteParts: string[] = [];
    if (position) noteParts.push(`Functie: ${positionOptions.find(o => o.value === position)?.label ?? position}`);
    if (source) noteParts.push(`Bron: ${sourceOptions.find(o => o.value === source)?.label ?? source}`);
    if (notes.trim()) noteParts.push(notes.trim());

    createCandidate.mutate(
      {
        location_id: locationId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nieuwe kandidaat"
      description="Voeg een kandidaat toe aan de onboarding pipeline."
      footer={
        <div className="flex justify-end gap-3 w-full">
          <NestoButton variant="secondary" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || createCandidate.isPending}
          >
            {createCandidate.isPending ? 'Toevoegen...' : 'Toevoegen'}
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NestoInput
            label="Voornaam"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jan"
            required
          />
          <NestoInput
            label="Achternaam"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Jansen"
            required
          />
        </div>
        <NestoInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jan@voorbeeld.nl"
          required
        />
        <NestoInput
          label="Telefoon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12345678"
        />

        <div className="border-t border-border/50 pt-4 mt-4" />

        <div className="grid grid-cols-2 gap-3">
          <NestoSelect
            label="Functie-interesse"
            placeholder="Selecteer..."
            value={position}
            onValueChange={setPosition}
            options={positionOptions}
          />
          <NestoSelect
            label="Bron"
            placeholder="Selecteer..."
            value={source}
            onValueChange={setSource}
            options={sourceOptions}
          />
        </div>
        <div className="w-full">
          <label className="mb-2 block text-label text-muted-foreground">
            Notities
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuele opmerkingen..."
            rows={3}
            className="flex w-full rounded-button border-[1.5px] border-border bg-card px-3 py-2.5 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground focus:!border-primary focus:outline-none focus:ring-0 resize-none"
          />
        </div>
      </div>
    </NestoModal>
  );
}
