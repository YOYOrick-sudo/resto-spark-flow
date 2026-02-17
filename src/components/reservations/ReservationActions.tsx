import { useState } from 'react';
import {
  Check, X, UserCheck, AlertOctagon, Clock, CreditCard,
  Send, ArrowRightLeft, RefreshCw, Ban, MoreHorizontal, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransitionStatus } from '@/hooks/useTransitionStatus';
import { useUserContext } from '@/contexts/UserContext';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { nestoToast } from '@/lib/nestoToast';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { STATUS_LABELS, ALLOWED_TRANSITIONS } from '@/types/reservation';
import { TableMoveDialog } from './TableMoveDialog';

interface ReservationActionsProps {
  reservation: Reservation;
  className?: string;
}

interface ActionButton {
  key: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'destructive' | 'primary';
  targetStatus?: ReservationStatus;
  disabled?: boolean;
  tooltip?: string;
  destructive?: boolean;
}

function getActionsForStatus(reservation: Reservation): ActionButton[] {
  const status = reservation.status;
  const actions: ActionButton[] = [];
  const riskScore = reservation.no_show_risk_score;

  switch (status) {
    case 'draft':
      actions.push(
        { key: 'confirm', label: 'Bevestigen', icon: Check, targetStatus: 'confirmed', variant: 'primary' },
        { key: 'option', label: 'Optie', icon: Clock, targetStatus: 'option' },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'payment_ph', label: 'Betaling aanvragen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
    case 'pending_payment':
      actions.push(
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'resend_ph', label: 'Betaallink opnieuw', icon: RefreshCw, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
    case 'option':
      actions.push(
        { key: 'confirm', label: 'Bevestigen', icon: Check, targetStatus: 'confirmed', variant: 'primary' },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'extend_ph', label: 'Optie verlengen', icon: Clock, disabled: true, tooltip: 'Beschikbaar na options (4.9)' },
      );
      break;
    case 'confirmed':
      actions.push(
        { key: 'checkin', label: 'Inchecken', icon: UserCheck, targetStatus: 'seated', variant: 'primary' },
        { key: 'noshow', label: 'No-show', icon: AlertOctagon, targetStatus: 'no_show', destructive: true },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'payment_ph', label: 'Betaling aanvragen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      if (riskScore !== null && riskScore >= 50) {
        actions.push(
          { key: 'confirm_send_ph', label: 'Bevestiging sturen', icon: Send, disabled: true, tooltip: 'Beschikbaar na messaging (4.14)' },
        );
      }
      break;
    case 'seated':
      actions.push(
        { key: 'complete', label: 'Afronden', icon: Check, targetStatus: 'completed', variant: 'primary' },
        { key: 'move_table', label: 'Tafel wijzigen', icon: ArrowRightLeft },
      );
      break;
    case 'no_show':
    case 'cancelled':
      actions.push(
        { key: 'refund_ph', label: 'Terugbetalen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
        { key: 'waive_ph', label: 'Kwijtschelden', icon: Ban, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
  }

  return actions;
}

export function ReservationActions({ reservation, className }: ReservationActionsProps) {
  const transition = useTransitionStatus();
  const { context } = useUserContext();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: ReservationStatus;
    destructive: boolean;
    label: string;
  } | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<ReservationStatus | null>(null);
  const [tableMoveOpen, setTableMoveOpen] = useState(false);
  const actions = getActionsForStatus(reservation);
  const canOverride = context?.role === 'owner' || context?.role === 'manager' || context?.is_platform_admin;
  const terminalStatuses: ReservationStatus[] = ['completed', 'no_show', 'cancelled'];
  const isTerminal = terminalStatuses.includes(reservation.status);

  const handleAction = (action: ActionButton) => {
    if (action.key === 'move_table') {
      setTableMoveOpen(true);
      return;
    }
    if (!action.targetStatus) return;

    if (action.destructive) {
      setConfirmDialog({
        open: true,
        targetStatus: action.targetStatus,
        destructive: true,
        label: STATUS_LABELS[action.targetStatus] || action.targetStatus,
      });
    } else {
      executeTransition(action.targetStatus);
    }
  };

  const executeTransition = (targetStatus: ReservationStatus, reason?: string, isOverride = false) => {
    transition.mutate({
      reservation_id: reservation.id,
      new_status: targetStatus,
      location_id: reservation.location_id,
      customer_id: reservation.customer_id,
      reason: reason || null,
      is_override: isOverride,
    }, {
      onSuccess: () => {
        nestoToast.success(`Status gewijzigd naar ${STATUS_LABELS[targetStatus] || targetStatus}`);
        setConfirmDialog(null);
        setOverrideOpen(false);
        setOverrideStatus(null);
      },
      onError: (err) => {
        nestoToast.error(`Fout: ${err.message}`);
      },
    });
  };

  // Override: available non-current, non-terminal-as-source statuses
  const allStatuses: ReservationStatus[] = ['draft', 'confirmed', 'option', 'pending_payment', 'seated', 'completed', 'no_show', 'cancelled'];
  const overrideTargets = allStatuses.filter(s => s !== reservation.status);

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {actions.map((action) => {
          if (action.disabled) {
            return (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border border-input bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{action.tooltip}</TooltipContent>
              </Tooltip>
            );
          }

          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={transition.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border transition-colors',
                action.variant === 'primary'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
                  : action.destructive
                    ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    : 'border-input bg-background hover:bg-secondary'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          );
        })}

        {/* Override link — only for manager/owner, not for terminal statuses */}
        {canOverride && !isTerminal && (
          <button
            onClick={() => setOverrideOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            Andere actie...
          </button>
        )}
      </div>

      {/* Destructive confirm dialog with reason field */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title={`${confirmDialog.label}?`}
          description={`Weet je zeker dat je deze reservering wilt wijzigen naar "${confirmDialog.label}"?`}
          confirmLabel={confirmDialog.label}
          variant="destructive"
          isLoading={transition.isPending}
          showReasonField
          reasonPlaceholder="Reden (optioneel)"
          onConfirm={() => executeTransition(confirmDialog.targetStatus)}
          onConfirmWithReason={(reason) => executeTransition(confirmDialog.targetStatus, reason)}
        />
      )}

      {/* Override dialog */}
      {overrideOpen && (
        <ConfirmDialog
          open={overrideOpen}
          onOpenChange={(open) => { if (!open) { setOverrideOpen(false); setOverrideStatus(null); } }}
          title="Operator Override"
          description={overrideStatus
            ? `Je staat op het punt de status te wijzigen naar "${STATUS_LABELS[overrideStatus] || overrideStatus}". Dit wijkt af van de standaard workflow en wordt gelogd.`
            : 'Selecteer een status hieronder en geef een verplichte reden op.'}
          confirmLabel={overrideStatus ? `Wijzig naar ${STATUS_LABELS[overrideStatus] || overrideStatus}` : 'Selecteer status'}
          variant="destructive"
          isLoading={transition.isPending}
          showReasonField
          reasonPlaceholder="Reden (verplicht)"
          reasonRequired
          onConfirm={() => {}}
          onConfirmWithReason={(reason) => {
            if (overrideStatus) {
              executeTransition(overrideStatus, reason, true);
            }
          }}
        >
          {/* Extra content: status selector - rendered via description for now */}
        </ConfirmDialog>
      )}

      {/* Simple override status selector when override is open but no status selected */}
      {overrideOpen && !overrideStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOverrideOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">Operator Override</h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p>Dit wijkt af van de standaard workflow en wordt gelogd.</p>
            </div>
            <div className="space-y-1.5">
              {overrideTargets.map((s) => (
                <button
                  key={s}
                  onClick={() => setOverrideStatus(s)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  {STATUS_LABELS[s] || s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOverrideOpen(false)}
              className="mt-4 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Table move dialog */}
      <TableMoveDialog
        open={tableMoveOpen}
        onOpenChange={setTableMoveOpen}
        reservationId={reservation.id}
        currentTableId={reservation.table_id}
        locationId={reservation.location_id}
      />
    </TooltipProvider>
  );
}
