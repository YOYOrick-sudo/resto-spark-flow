import { useState } from 'react';
import type { EmbedMode } from './EmbedModeSelector';
import { ExternalLink, X } from 'lucide-react';

interface WidgetLivePreviewProps {
  mode: EmbedMode;
  slug: string;
  color: string;
  buttonLabel: string;
  buttonPosition: string;
  baseUrl: string;
}

function BrowserChrome({ url }: { url: string }) {
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

export function WidgetLivePreview({ mode, slug, color, buttonLabel, buttonPosition, baseUrl }: WidgetLivePreviewProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const widgetUrl = `${baseUrl}/book/${slug}?embed=true`;

  if (mode === 'link') {
    return (
      <div className="bg-secondary/50 rounded-card-sm border border-border/40 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Widget URL</p>
          <p className="text-sm font-mono truncate">{baseUrl}/book/{slug}</p>
        </div>
        <a
          href={`${baseUrl}/book/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const isLeft = buttonPosition === 'bottom-left';

  return (
    <div className="rounded-card border border-border/50 overflow-hidden bg-background shadow-card">
      <BrowserChrome url="https://mijnrestaurant.nl" />

      {/* Mock website area */}
      <div className="relative bg-muted/10" style={{ minHeight: mode === 'inline' ? 420 : 280 }}>
        {mode === 'button' && (
          <>
            <MockPageContent />

            {/* Floating button */}
            <button
              type="button"
              onClick={() => setOverlayOpen(true)}
              className="absolute shadow-lg text-white text-sm font-medium px-5 py-2.5 rounded-full transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                bottom: 16,
                [isLeft ? 'left' : 'right']: 16,
              }}
            >
              {buttonLabel || 'Reserveer'}
            </button>

            {/* Overlay inside preview */}
            {overlayOpen && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                <div className="relative bg-background rounded-lg shadow-2xl overflow-hidden" style={{ width: '90%', maxWidth: 420, height: '85%' }}>
                  <button
                    type="button"
                    onClick={() => setOverlayOpen(false)}
                    className="absolute top-2 right-2 z-20 p-1 rounded-full bg-background/80 hover:bg-muted border border-border/50 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <iframe
                    src={widgetUrl}
                    title="Widget preview"
                    className="w-full h-full border-0"
                    style={{ transform: 'scale(0.65)', transformOrigin: 'top center', width: '154%', height: '154%' }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'inline' && (
          <div className="p-4">
            <div className="rounded-lg border border-border/40 overflow-hidden bg-background" style={{ height: 400 }}>
              <iframe
                src={widgetUrl}
                title="Widget preview"
                className="border-0"
                style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: '154%', height: '154%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
