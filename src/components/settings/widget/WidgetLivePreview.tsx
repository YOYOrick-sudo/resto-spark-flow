import { ExternalLink } from 'lucide-react';
import type { EmbedMode } from './EmbedModeSelector';

interface WidgetLivePreviewProps {
  mode: EmbedMode;
  slug: string;
  color: string;
  buttonLabel: string;
  buttonPosition: string;
  baseUrl: string;
}

function BrowserChrome({ url, onOpen }: { url: string; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border rounded-t-card">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
      </div>
      <div className="flex-1 mx-2">
        <div className="bg-background/80 border border-border/60 rounded-sm px-3 py-1 text-[11px] text-muted-foreground font-mono truncate">
          {url}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Open live preview in nieuw tabblad"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MockPageContent() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-5 w-40 bg-muted/50 rounded" />
      <div className="h-3 w-full bg-muted/30 rounded" />
      <div className="h-3 w-4/5 bg-muted/30 rounded" />
      <div className="h-3 w-3/5 bg-muted/30 rounded" />
      <div className="h-20 w-full bg-muted/20 rounded mt-4" />
      <div className="h-3 w-full bg-muted/30 rounded" />
      <div className="h-3 w-2/3 bg-muted/30 rounded" />
    </div>
  );
}

function buildPreviewUrl(baseUrl: string, slug: string, mode: EmbedMode, label: string, position: string, color: string) {
  const params = new URLSearchParams({ slug, mode, label, position, color });
  return `${baseUrl}/widget-preview?${params.toString()}`;
}

export function WidgetLivePreview({ mode, slug, color, buttonLabel, buttonPosition, baseUrl }: WidgetLivePreviewProps) {
  const previewUrl = buildPreviewUrl(baseUrl, slug, mode, buttonLabel, buttonPosition, color);
  const isLeft = buttonPosition === 'bottom-left';

  const handleOpen = () => window.open(previewUrl, '_blank');

  if (mode === 'link') {
    return null;
  }

  return (
    <div className="rounded-card border border-border/50 overflow-hidden bg-background shadow-card">
      <BrowserChrome url="https://mijnrestaurant.nl" onOpen={handleOpen} />

      <div className="relative bg-muted/10" style={{ minHeight: mode === 'inline' ? 300 : 220 }}>
        <MockPageContent />

        {mode === 'button' && (
          <div
            className="absolute shadow-lg text-white text-sm font-medium px-5 py-2.5 rounded-full pointer-events-none"
            style={{
              backgroundColor: color,
              bottom: 16,
              [isLeft ? 'left' : 'right']: 16,
            }}
          >
            {buttonLabel || 'Reserveer'}
          </div>
        )}

        {mode === 'inline' && (
          <div className="px-6 pb-6">
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center py-10">
              <span className="text-sm font-medium text-primary/60">Nesto Booking Widget</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
