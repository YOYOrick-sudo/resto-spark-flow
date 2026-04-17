import { Globe, QrCode, Instagram, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateSourceBadgeProps {
  source: string | null | undefined;
  className?: string;
}

const SOURCE_MAP: Record<string, { label: string; Icon: typeof Globe }> = {
  website: { label: 'Website', Icon: Globe },
  qr: { label: 'QR-code', Icon: QrCode },
  instagram: { label: 'Instagram', Icon: Instagram },
  manual: { label: 'Handmatig', Icon: UserPlus },
};

export function CandidateSourceBadge({ source, className }: CandidateSourceBadgeProps) {
  const key = (source ?? 'manual').toLowerCase();
  const { label, Icon } = SOURCE_MAP[key] ?? SOURCE_MAP.manual;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-5 px-1.5 rounded-md',
        'bg-muted/60 text-muted-foreground text-[10px] font-medium',
        'border border-border/40 whitespace-nowrap',
        className,
      )}
      title={`Bron: ${label}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </span>
  );
}
