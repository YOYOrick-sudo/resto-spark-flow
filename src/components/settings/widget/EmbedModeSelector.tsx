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
  { value: 'button', icon: <MousePointerClick className="h-5 w-5" />, title: 'Floating knop', description: 'Overlay popup' },
  { value: 'inline', icon: <Code className="h-5 w-5" />, title: 'Inline embed', description: 'Direct op pagina' },
  { value: 'link', icon: <LinkIcon className="h-5 w-5" />, title: 'Alleen link', description: 'Zelf linken' },
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
            'flex flex-col items-center gap-2 rounded-card-sm border-[1.5px] p-4 text-center transition-all duration-150 cursor-pointer',
            value === m.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40'
          )}
        >
          <div className={cn(
            'rounded-full p-2',
            value === m.value ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
          )}>
            {m.icon}
          </div>
          <div>
            <p className="text-sm font-medium">{m.title}</p>
            <p className="text-xs text-muted-foreground">{m.description}</p>
          </div>
          <div className={cn(
            'h-4 w-4 rounded-full border-2 transition-colors',
            value === m.value ? 'border-primary bg-primary' : 'border-border'
          )}>
            {value === m.value && (
              <div className="h-full w-full flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
