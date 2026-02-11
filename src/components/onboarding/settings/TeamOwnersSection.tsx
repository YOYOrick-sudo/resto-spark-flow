import { useState } from 'react';
import { useAllOnboardingPhases } from '@/hooks/useAllOnboardingPhases';
import { useLocationTeamMembers, TeamMember } from '@/hooks/useLocationTeamMembers';
import { useUpdatePhaseOwner } from '@/hooks/useUpdatePhaseOwner';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoModal } from '@/components/polar/NestoModal';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Pencil } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  service: 'Service',
  kitchen: 'Kitchen',
};

export function TeamOwnersSection() {
  const { data: phases, isLoading: phasesLoading } = useAllOnboardingPhases();
  const { data: teamMembers, isLoading: teamLoading } = useLocationTeamMembers();
  const updateOwner = useUpdatePhaseOwner();

  const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
  const [mode, setMode] = useState<'team' | 'manual'>('team');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  if (phasesLoading || teamLoading) return <CardSkeleton lines={6} />;

  const activePhases = (phases || []).filter((p) => p.is_active);
  const editPhase = activePhases.find((p) => p.id === editPhaseId);

  const handleSave = () => {
    if (!editPhaseId) return;

    if (mode === 'team' && selectedUserId) {
      const member = teamMembers?.find((m) => m.user_id === selectedUserId);
      if (member) {
        updateOwner.mutate({
          phaseId: editPhaseId,
          phase_owner_id: member.user_id,
          phase_owner_name: member.name || member.email,
          phase_owner_email: member.email,
        });
      }
    } else if (mode === 'manual' && manualName.trim()) {
      updateOwner.mutate({
        phaseId: editPhaseId,
        phase_owner_id: null,
        phase_owner_name: manualName.trim(),
        phase_owner_email: manualEmail.trim() || null,
      });
    }

    setEditPhaseId(null);
    resetForm();
  };

  const handleClear = () => {
    if (!editPhaseId) return;
    updateOwner.mutate({
      phaseId: editPhaseId,
      phase_owner_id: null,
      phase_owner_name: null,
      phase_owner_email: null,
    });
    setEditPhaseId(null);
    resetForm();
  };

  const resetForm = () => {
    setSelectedUserId('');
    setManualName('');
    setManualEmail('');
    setMode('team');
  };

  const openEdit = (phaseId: string) => {
    const phase = activePhases.find((p) => p.id === phaseId) as any;
    if (phase?.phase_owner_id) {
      setMode('team');
      setSelectedUserId(phase.phase_owner_id);
    } else if (phase?.phase_owner_name) {
      setMode('manual');
      setManualName(phase.phase_owner_name || '');
      setManualEmail(phase.phase_owner_email || '');
    } else {
      resetForm();
    }
    setEditPhaseId(phaseId);
  };

  return (
    <div className="space-y-4">
      <NestoCard className="p-0 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-secondary/50 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="w-6">#</span>
          <span>Fase</span>
          <span>Verantwoordelijke</span>
          <span className="w-20 text-center">Assistent</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {activePhases.map((phase, index) => {
            const p = phase as any;
            const ownerName = p.phase_owner_name;
            const ownerEmail = p.phase_owner_email;
            const assistantEnabled = p.assistant_enabled ?? false;

            return (
              <div
                key={phase.id}
                className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-accent/40 transition-colors duration-150 cursor-pointer group"
                onClick={() => openEdit(phase.id)}
              >
                <span className="text-sm text-muted-foreground tabular-nums w-6">{index + 1}</span>
                <span className="text-sm font-medium truncate">{phase.name}</span>
                <div className="flex items-center gap-2 min-w-0">
                  {ownerName ? (
                    <div className="min-w-0">
                      <p className="text-sm truncate">{ownerName}</p>
                      {ownerEmail && <p className="text-xs text-muted-foreground truncate">{ownerEmail}</p>}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Niet ingesteld</span>
                  )}
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <div className="w-20 flex justify-center">
                  {assistantEnabled ? (
                    <NestoBadge variant="primary" size="sm" dot>Aan</NestoBadge>
                  ) : (
                    <NestoBadge variant="outline" size="sm">Uit</NestoBadge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </NestoCard>

      <InfoAlert variant="info" title="Wie ontvangt reminders?">
        Verantwoordelijken ontvangen herinneringen wanneer taken in hun fase te lang openstaan. Zonder verantwoordelijke gaan reminders naar de locatie-eigenaar.
      </InfoAlert>

      {/* Edit modal */}
      <NestoModal
        open={!!editPhaseId}
        onOpenChange={(open) => { if (!open) { setEditPhaseId(null); resetForm(); } }}
        title={`Verantwoordelijke — ${editPhase?.name || ''}`}
        description="Kies een teamlid of voer handmatig een naam en email in."
        footer={
          <div className="flex justify-between w-full">
            <NestoButton variant="ghost" size="sm" onClick={handleClear}>Verwijderen</NestoButton>
            <div className="flex gap-2">
              <NestoButton variant="outline" onClick={() => { setEditPhaseId(null); resetForm(); }}>Annuleren</NestoButton>
              <NestoButton onClick={handleSave} disabled={updateOwner.isPending}>Opslaan</NestoButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <NestoButton
              variant={mode === 'team' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMode('team')}
            >
              Kies teamlid
            </NestoButton>
            <NestoButton
              variant={mode === 'manual' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setMode('manual')}
            >
              Handmatig invoeren
            </NestoButton>
          </div>

          {mode === 'team' ? (
            <div>
              <Label className="text-xs mb-1.5">Teamlid</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Kies teamlid..." />
                </SelectTrigger>
                <SelectContent>
                  {(teamMembers || []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.name || m.email} — {ROLE_LABELS[m.role] || m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5">Naam</Label>
                <NestoInput value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Naam..." />
              </div>
              <div>
                <Label className="text-xs mb-1.5">Email</Label>
                <NestoInput type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
              </div>
            </div>
          )}
        </div>
      </NestoModal>
    </div>
  );
}
