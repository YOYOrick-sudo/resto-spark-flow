import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { EmbedMode } from './EmbedModeSelector';
import type { WidgetTheme } from '@/hooks/useWidgetTheme';

interface WidgetLivePreviewProps {
  mode: EmbedMode;
  slug: string;
  color: string;
  accentColor?: string;
  buttonLabel: string;
  buttonPosition: string;
  baseUrl: string;
  logoUrl?: string;
  restaurantName?: string;
}

const modeDescriptions: Record<EmbedMode, string> = {
  button: 'Bekijk hoe de floating knop eruitziet op een voorbeeldwebsite.',
  inline: 'Bekijk hoe de inline widget eruitziet op een voorbeeldwebsite.',
  link: 'Open de hosted boekingspagina om te testen.',
};

function buildPreviewUrl(baseUrl: string, slug: string, mode: EmbedMode, label: string, position: string, color: string, theme: WidgetTheme, accentColor?: string, logoUrl?: string, restaurantName?: string) {
  const params = new URLSearchParams({ slug, mode, label, position, color, theme });
  if (accentColor) params.set('accent', accentColor);
  if (logoUrl) params.set('logo', logoUrl);
  if (restaurantName) params.set('name', restaurantName);
  return `${baseUrl}/widget-preview?${params.toString()}`;
}

export function WidgetLivePreview({ mode, slug, color, accentColor, buttonLabel, buttonPosition, baseUrl, logoUrl, restaurantName }: WidgetLivePreviewProps) {
  const [theme, setTheme] = useState<WidgetTheme>('soft');
  const previewUrl = buildPreviewUrl(baseUrl, slug, mode, buttonLabel, buttonPosition, color, theme, accentColor, logoUrl, restaurantName);

  return (
    <div className="bg-secondary/50 rounded-card-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{modeDescriptions[mode]}</p>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline whitespace-nowrap"
        >
          Open testpagina <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Stijl:</span>
        <div className="flex items-center bg-secondary rounded-full p-0.5 gap-0.5">
          <button
            onClick={() => setTheme('soft')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${theme === 'soft' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Soft
          </button>
          <button
            onClick={() => setTheme('glass')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${theme === 'glass' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Glass
          </button>
        </div>
      </div>
    </div>
  );
}
