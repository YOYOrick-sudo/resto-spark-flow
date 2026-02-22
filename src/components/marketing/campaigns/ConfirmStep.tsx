import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Send, CalendarDays, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useState } from 'react';

interface ConfirmStepProps {
  subject: string;
  sendNow: boolean;
  scheduledDate: Date | null;
  scheduledTime: string;
  segmentId: string | null;
  segmentLabel: string;
  audienceCount: number | string;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function ConfirmStep({
  subject, sendNow, scheduledDate, scheduledTime,
  segmentLabel, audienceCount, isSubmitting, onConfirm,
}: ConfirmStepProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const sendLabel = sendNow
    ? 'Nu'
    : scheduledDate
      ? `${format(scheduledDate, 'd MMMM yyyy', { locale: nl })} om ${scheduledTime}`
      : 'Niet ingesteld';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Bevestigen</h2>
        <p className="text-sm text-muted-foreground mt-1">Controleer de details en verstuur of plan in.</p>
      </div>

      <div className="space-y-4 p-5 rounded-card border border-border bg-secondary">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Onderwerp</p>
            <p className="text-sm font-medium text-foreground">{subject || '(geen onderwerp)'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Doelgroep</p>
            <p className="text-sm font-medium text-foreground">{segmentLabel}</p>
          </div>
          <NestoBadge variant="primary" size="sm">{audienceCount} gasten</NestoBadge>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Verzendmoment</p>
            <p className="text-sm font-medium text-foreground">{sendLabel}</p>
          </div>
        </div>
      </div>

      <NestoButton
        onClick={() => setShowConfirm(true)}
        leftIcon={<Send className="h-4 w-4" />}
        isLoading={isSubmitting}
      >
        {sendNow ? 'Campagne versturen' : 'Campagne inplannen'}
      </NestoButton>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={sendNow ? 'Campagne versturen' : 'Campagne inplannen'}
        description={`Weet je zeker dat je deze campagne naar ${audienceCount} gasten wilt versturen?`}
        confirmLabel={sendNow ? 'Versturen' : 'Inplannen'}
        onConfirm={onConfirm}
        isLoading={isSubmitting}
      />
    </div>
  );
}
