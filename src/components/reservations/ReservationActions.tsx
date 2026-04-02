import { useState } from 'react';
import {
  Check, X, LogIn, LogOut, AlertOctagon, Clock, CreditCard,
  Send, RefreshCw, Ban, MoreHorizontal, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NestoButton } from '@/components/polar/NestoButton';
import { useTransitionStatus } from '@/hooks/useTransitionStatus';
import { useUserContext } from '@/contexts/UserContext';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { nestoToast } from '@/lib/nestoToast';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { STATUS_LABELS, ALLOWED_TRANSITIONS } from '@/types/reservation';
import { ExtendOptionDialog } from './ExtendOptionDialog';

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

function getActionsForStatus(reservation: Reservation): {
  primary: ActionButton | null;
  secondary: ActionButton[];
  overflow: ActionButton[];
} {
  const status = reservation.status;
  const all: ActionButton[] = [];

  switch (status) {
    case 'draft':
      all.push(
        { key: 'confirm', label: 'Bevestigen', icon: Check, targetStatus: 'confirmed', variant: 'primary' },
        { key: 'option', label: 'Optie', icon: Clock, targetStatus: 'option' },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'payment_ph', label: 'Betaling aanvragen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
    case 'pending_payment':
      all.push(
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'resend_ph', label: 'Betaallink opnieuw', icon: RefreshCw, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
    case 'option':
      all.push(
        { key: 'confirm', label: 'Bevestigen', icon: Check, targetStatus: 'confirmed', variant: 'primary' },
        { key: 'extend', label: 'Optie verlengen', icon: Clock },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
      );
      break;
    case 'confirmed':
      all.push(
        { key: 'checkin', label: 'Inchecken', icon: LogIn, targetStatus: 'seated', variant: 'primary' },
        { key: 'noshow', label: 'No-show', icon: AlertOctagon, targetStatus: 'no_show', destructive: true },
        { key: 'cancel', label: 'Annuleren', icon: X, targetStatus: 'cancelled', destructive: true },
        { key: 'payment_ph', label: 'Betaling aanvragen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
    case 'seated':
      all.push(
        { key: 'complete', label: 'Uitchecken', icon: LogOut, targetStatus: 'completed', variant: 'primary' },
      );
      break;
    case 'no_show':
    case 'cancelled':
      all.push(
        { key: 'refund_ph', label: 'Terugbetalen', icon: CreditCard, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
        { key: 'waive_ph', label: 'Kwijtschelden', icon: Ban, disabled: true, tooltip: 'Beschikbaar na Stripe (4.13)' },
      );
      break;
  }

  const primary = all.find(a => a.variant === 'primary') || null;
  const rest = all.filter(a => a !== primary);
  const secondary = rest.slice(0, 2);
  const overflow = rest.slice(2);

  return { primary, secondary, overflow };
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
  const [extendOpen, setExtendOpen] = useState(false);

  const { primary, secondary, overflow } = getActionsForStatus(reservation);
  const canOverride = context?.role === 'owner' || context?.role === 'manager' || context?.is_platform_admin;
  const terminalStatuses: ReservationStatus[] = ['completed', 'no_show', 'cancelled'];
  const isTerminal = terminalStatuses.includes(reservation.status);

  const handleAction = (action: ActionButton) => {
    if (action.key === 'extend') {
      setExtendOpen(true);
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

  const allStatuses: ReservationStatus[] = ['draft', 'confirmed', 'option', 'pending_payment', 'seated', 'completed', 'no_show', 'cancelled'];
  const overrideTargets = allStatuses.filter(s => s !== reservation.status);

  const renderActionButton = (action: ActionButton, fullWidth = false) => {
    if (action.disabled) {
      return (
        <Tooltip key={action.key}>
          <TooltipTrigger asChild>
            <span className={fullWidth ? 'w-full' : ''}>
              <NestoButton
                variant="outline"
                size="sm"
                disabled
                className={fullWidth ? 'w-full' : ''}
                leftIcon={<action.icon className="h-3.5 w-3.5" />}
              >
                {action.label}
              </NestoButton>
            </span>
          </TooltipTrigger>
          <TooltipContent>{action.tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NestoButton
        key={action.key}
        variant={
          action.variant === 'primary' ? 'primary' :
          action.destructive ? 'danger' : 'outline'
        }
        size="sm"
        className={fullWidth ? 'w-full' : ''}
        onClick={() => handleAction(action)}
        disabled={transition.isPending}
        leftIcon={<action.icon className="h-3.5 w-3.5" />}
      >
        {action.label}
      </NestoButton>
    );
  };

  const hasOverflowItems = overflow.length > 0 || (canOverride && !isTerminal);

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* Primary action — full width */}
        {primary && renderActionButton(primary, true)}

        {/* Secondary actions + overflow dropdown */}
        {(secondary.length > 0 || hasOverflowItems) && (
          <div className="flex gap-2">
            {secondary.map(action => (
              <div key={action.key} className="flex-1">
                {renderActionButton(action)}
              </div>
            ))}

            {hasOverflowItems && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-control border border-input bg-background flex items-center justify-center hover:bg-secondary transition-colors flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  {overflow.map(action => (
                    <DropdownMenuItem
                      key={action.key}
                      disabled={action.disabled}
                      onClick={() => !action.disabled && handleAction(action)}
                      className={cn(action.destructive && 'text-destructive focus:text-destructive')}
                    >
                      <action.icon className="h-3.5 w-3.5 mr-2" />
                      {action.label}
                      {action.disabled && action.tooltip && (
                        <span className="ml-auto text-[10px] text-muted-foreground">Binnenkort</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  {canOverride && !isTerminal && (
                    <>
                      {overflow.length > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setOverrideOpen(true)} className="text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                        Operator override
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Destructive confirm dialog */}
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

      {/* Override status selector */}
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

      {/* Override confirm dialog */}
      {overrideOpen && overrideStatus && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => { if (!open) { setOverrideOpen(false); setOverrideStatus(null); } }}
          title="Operator Override"
          description={`Je staat op het punt de status te wijzigen naar "${STATUS_LABELS[overrideStatus] || overrideStatus}". Dit wijkt af van de standaard workflow en wordt gelogd.`}
          confirmLabel={`Wijzig naar ${STATUS_LABELS[overrideStatus] || overrideStatus}`}
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
        />
      )}

      {/* Extend option dialog */}
      <ExtendOptionDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        reservationId={reservation.id}
        locationId={reservation.location_id}
        currentExpiresAt={reservation.option_expires_at}
      />
    </TooltipProvider>
  );
}
