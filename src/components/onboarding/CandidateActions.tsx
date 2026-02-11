import { useState } from 'react';
import { Trophy, XCircle } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';

interface CandidateActionsProps {
  status: string;
  candidateName: string;
  allCurrentTasksDone: boolean;
  isLastPhase: boolean;
  currentPhaseName?: string;
  nextPhaseName?: string;
  onReject: () => void;
  onAdvance: () => void;
  isRejecting?: boolean;
  isAdvancing?: boolean;
}

export function CandidateActions({
  status,
  candidateName,
  allCurrentTasksDone,
  isLastPhase,
  currentPhaseName,
  nextPhaseName,
  onReject,
  onAdvance,
  isRejecting,
  isAdvancing,
}: CandidateActionsProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);

  const advanceTitle = isLastPhase ? 'Kandidaat aannemen' : 'Doorgaan naar volgende fase';
  const advanceDescription = isLastPhase
    ? `Alle taken in "${currentPhaseName ?? 'huidige fase'}" zijn afgerond. Wil je ${candidateName} aannemen?`
    : `Alle taken in "${currentPhaseName ?? 'huidige fase'}" zijn afgerond. Wil je doorgaan naar "${nextPhaseName ?? 'volgende fase'}"?`;

  return (
    <div className="sticky bottom-0 border-t border-border/50 bg-background p-4 flex justify-end items-center gap-3">
      {status === 'active' && (
        <>
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => setShowRejectConfirm(true)}
            className="text-destructive hover:text-destructive"
          >
            Afwijzen
          </NestoButton>

          <NestoButton
            variant="primary"
            size="sm"
            onClick={() => setShowAdvanceConfirm(true)}
            disabled={!allCurrentTasksDone || isAdvancing}
          >
            {isLastPhase ? 'Aannemen' : 'Doorgaan'}
          </NestoButton>

          <ConfirmDialog
            open={showRejectConfirm}
            onOpenChange={setShowRejectConfirm}
            title="Kandidaat afwijzen"
            description={`Weet je zeker dat je ${candidateName} wilt afwijzen? Alle openstaande taken worden overgeslagen.`}
            confirmLabel="Afwijzen"
            variant="destructive"
            isLoading={isRejecting}
            onConfirm={() => {
              onReject();
              setShowRejectConfirm(false);
            }}
          />

          <ConfirmDialog
            open={showAdvanceConfirm}
            onOpenChange={setShowAdvanceConfirm}
            title={advanceTitle}
            description={advanceDescription}
            confirmLabel={isLastPhase ? 'Aannemen' : 'Doorgaan'}
            variant="default"
            isLoading={isAdvancing}
            onConfirm={() => {
              onAdvance();
              setShowAdvanceConfirm(false);
            }}
          />
        </>
      )}
      {status === 'hired' && (
        <p className="text-sm text-success flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Aangenomen
        </p>
      )}
      {status === 'rejected' && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4" /> Afgewezen
        </p>
      )}
    </div>
  );
}
