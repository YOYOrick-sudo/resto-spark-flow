import { MousePointerClick, Code, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmbedMode = 'button' | 'inline' | 'link';

interface ModeOption {
  value: EmbedMode;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const modes: ModeOption[] = [
  { value: 'button', icon: <MousePointerClick className="h-4 w-4" />, title: 'Floating knop', description: 'Overlay popup' },
  { value: 'inline', icon: <Code className="h-4 w-4" />, title: 'Inline embed', description: 'Direct op pagina' },
  { value: 'link', icon: <LinkIcon className="h-4 w-4" />, title: 'Alleen link', description: 'Zelf linken' },
];

interface Props {
  value: EmbedMode;
  onChange: (mode: EmbedMode) => void;
}

export function EmbedModeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            'flex items-center gap-3 rounded-card-sm border-[1.5px] px-4 py-3 text-left transition-all duration-150 cursor-pointer',
            value === m.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40'
          )}
        >
          <div className={cn(
            'rounded-md p-1.5 shrink-0',
            value === m.value ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
          )}>
            {m.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{m.title}</p>
            <p className="text-xs text-muted-foreground">{m.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
