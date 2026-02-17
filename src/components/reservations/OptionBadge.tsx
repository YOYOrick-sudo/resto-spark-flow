import { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionBadgeProps {
  optionExpiresAt: string | null | undefined;
  className?: string;
}

function formatCountdown(expiresAt: string): { text: string; urgent: boolean; expired: boolean } {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { text: 'Verlopen', urgent: true, expired: true };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (totalHours >= 24) {
    return { text: `Verloopt over ${totalDays}d ${remainingHours}u`, urgent: false, expired: false };
  }
  if (totalHours >= 1) {
    return { text: `Verloopt over ${totalHours}u ${remainingMinutes}min`, urgent: false, expired: false };
  }
  return { text: `Verloopt over ${totalMinutes}min`, urgent: true, expired: false };
}

export function OptionBadge({ optionExpiresAt, className }: OptionBadgeProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!optionExpiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [optionExpiresAt]);

  const countdown = useMemo(() => {
    if (!optionExpiresAt) return null;
    return formatCountdown(optionExpiresAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionExpiresAt, now]);

  if (!countdown) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        countdown.expired
          ? 'bg-destructive/10 text-destructive border border-destructive/20'
          : countdown.urgent
            ? 'bg-warning/15 text-warning border border-warning/25'
            : 'bg-primary/10 text-primary border border-primary/20',
        className
      )}
    >
      {countdown.expired ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {countdown.text}
    </span>
  );
}
