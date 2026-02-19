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

const modeDescriptions: Record<EmbedMode, string> = {
  button: 'Bekijk hoe de floating knop eruitziet op een voorbeeldwebsite.',
  inline: 'Bekijk hoe de inline widget eruitziet op een voorbeeldwebsite.',
  link: 'Open de hosted boekingspagina om te testen.',
};

function buildPreviewUrl(baseUrl: string, slug: string, mode: EmbedMode, label: string, position: string, color: string) {
  const params = new URLSearchParams({ slug, mode, label, position, color });
  return `${baseUrl}/widget-preview?${params.toString()}`;
}

export function WidgetLivePreview({ mode, slug, color, buttonLabel, buttonPosition, baseUrl }: WidgetLivePreviewProps) {
  const previewUrl = buildPreviewUrl(baseUrl, slug, mode, buttonLabel, buttonPosition, color);

  return (
    <div className="bg-secondary/50 rounded-card-sm p-4 flex items-center justify-between gap-4">
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
  );
}
