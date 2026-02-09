import { useState } from 'react';
import { Trophy, XCircle } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';

interface CandidateActionsProps {
  status: string;
  candidateName: string;
  allCurrentTasksDone: boolean;
  isLastPhase: boolean;
  onReject: () => void;
  onAdvance: () => void;
  isRejecting?: boolean;
}

export function CandidateActions({
  status,
  candidateName,
  allCurrentTasksDone,
  isLastPhase,
  onReject,
  onAdvance,
  isRejecting,
}: CandidateActionsProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  return (
    <div className="sticky bottom-0 border-t border-border/50 bg-background p-4 flex justify-between items-center">
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
            onClick={onAdvance}
            disabled={!allCurrentTasksDone}
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
