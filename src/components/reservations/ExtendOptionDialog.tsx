import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NestoInput } from '@/components/polar/NestoInput';
import { useExtendOption } from '@/hooks/useExtendOption';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ExtendOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  locationId: string;
  currentExpiresAt: string | null | undefined;
}

export function ExtendOptionDialog({
  open,
  onOpenChange,
  reservationId,
  locationId,
  currentExpiresAt,
}: ExtendOptionDialogProps) {
  const [extraHours, setExtraHours] = useState(24);
  const extend = useExtendOption();

  const newExpiry = useMemo(() => {
    if (!currentExpiresAt) return null;
    const base = new Date(currentExpiresAt);
    base.setHours(base.getHours() + extraHours);
    return base;
  }, [currentExpiresAt, extraHours]);

  const handleConfirm = () => {
    extend.mutate(
      {
        reservation_id: reservationId,
        extra_hours: extraHours,
        location_id: locationId,
      },
      {
        onSuccess: () => {
          nestoToast.success('Optie verlengd');
          onOpenChange(false);
        },
        onError: (err) => {
          nestoToast.error(`Fout: ${err.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Optie verlengen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="max-w-[200px]">
            <NestoInput
              label="Verlengen met (uren)"
              type="number"
              min={1}
              max={168}
              step={1}
              value={extraHours}
              onChange={(e) => setExtraHours(parseInt(e.target.value) || 24)}
            />
          </div>

          {currentExpiresAt && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Huidig verval:{' '}
                <span className="text-foreground font-medium">
                  {format(new Date(currentExpiresAt), 'dd MMM yyyy HH:mm', { locale: nl })}
                </span>
              </p>
              {newExpiry && (
                <p className="text-muted-foreground">
                  Nieuw verval:{' '}
                  <span className="text-foreground font-medium">
                    {format(newExpiry, 'dd MMM yyyy HH:mm', { locale: nl })}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-button border border-input bg-background hover:bg-secondary transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleConfirm}
            disabled={extend.isPending}
            className="px-4 py-2 text-sm font-medium rounded-button bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Verlengen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
