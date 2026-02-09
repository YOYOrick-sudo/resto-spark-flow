import { NestoBadge } from '@/components/polar/NestoBadge';

interface PhaseDurationBadgeProps {
  updatedAt: string;
}

export function PhaseDurationBadge({ updatedAt }: PhaseDurationBadgeProps) {
  const hours = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)
  );

  let variant: 'success' | 'warning' | 'error' = 'success';
  let label = '';

  if (hours < 1) {
    label = '<1u';
  } else if (hours < 24) {
    label = `${hours}u`;
  } else {
    const days = Math.floor(hours / 24);
    label = `${days}d`;
    if (hours >= 48) variant = 'error';
    else variant = 'warning';
  }

  return (
    <NestoBadge variant={variant} size="sm">
      {label}
    </NestoBadge>
  );
}
