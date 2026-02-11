import {
  UserPlus, ArrowRight, CheckCircle, SkipForward, Trophy,
  XCircle, UserMinus, Mail, Bell, Star, MessageSquare, Sparkles,
} from 'lucide-react';
import { formatDateTimeCompact } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface OnboardingEvent {
  id: string;
  event_type: string;
  event_data: Json | null;
  triggered_by: string;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string }> = {
  candidate_created: { icon: UserPlus, label: 'Kandidaat aangemeld', bg: 'bg-primary/10 text-primary' },
  phase_advanced: { icon: ArrowRight, label: 'Door naar volgende fase', bg: 'bg-primary/10 text-primary' },
  task_completed: { icon: CheckCircle, label: 'Taak afgerond', bg: 'bg-success-light text-success' },
  task_skipped: { icon: SkipForward, label: 'Taak overgeslagen', bg: 'bg-muted text-muted-foreground' },
  hired: { icon: Trophy, label: 'Aangenomen!', bg: 'bg-success-light text-success' },
  rejected: { icon: XCircle, label: 'Afgewezen', bg: 'bg-error-light text-error' },
  withdrawn: { icon: UserMinus, label: 'Teruggetrokken', bg: 'bg-warning-light text-warning' },
  email_sent: { icon: Mail, label: 'E-mail verstuurd', bg: 'bg-primary/10 text-primary' },
  reminder_sent: { icon: Bell, label: 'Herinnering verstuurd', bg: 'bg-warning-light text-warning' },
  evaluation_saved: { icon: Star, label: 'Evaluatie opgeslagen', bg: 'bg-primary/10 text-primary' },
  note_added: { icon: MessageSquare, label: 'Notitie toegevoegd', bg: 'bg-muted text-muted-foreground' },
};

function getEventLabel(event: OnboardingEvent): string {
  const config = EVENT_CONFIG[event.event_type];
  const data = event.event_data as Record<string, unknown> | null;

  if (event.event_type === 'phase_advanced' && data?.to_phase_name) {
    return `Door naar ${data.to_phase_name}`;
  }
  return config?.label ?? event.event_type;
}

interface CandidateTimelineProps {
  events: OnboardingEvent[];
}

export function CandidateTimeline({ events }: CandidateTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Geen events</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const config = EVENT_CONFIG[event.event_type] ?? {
          icon: MessageSquare,
          label: event.event_type,
          bg: 'bg-muted text-muted-foreground',
        };
        const Icon = config.icon;

        return (
          <div key={event.id} className="flex gap-3 items-start">
            <div className={cn('flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full', config.bg)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{getEventLabel(event)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeCompact(event.created_at)}
                {event.triggered_by === 'system' && ' • Systeem'}
                {event.triggered_by === 'cron' && ' • Systeem'}
                {event.triggered_by === 'agent' && (
                  <span className="inline-flex items-center gap-0.5 ml-1">
                    • <Sparkles className="h-3 w-3 text-primary inline" /> Assistent
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
