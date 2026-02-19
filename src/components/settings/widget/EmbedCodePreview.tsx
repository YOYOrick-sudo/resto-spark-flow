import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import type { EmbedMode } from './EmbedModeSelector';

interface Props {
  mode: EmbedMode;
  slug: string;
  color: string;
  accentColor?: string;
  buttonLabel: string;
  buttonPosition: string;
  baseUrl: string;
  pulse?: boolean;
  logoUrl?: string;
  restaurantName?: string;
}

export function EmbedCodePreview({ mode, slug, color, accentColor, buttonLabel, buttonPosition, baseUrl, pulse, logoUrl, restaurantName }: Props) {
  const [copied, setCopied] = useState(false);

  const widgetUrl = `${baseUrl}/book/${slug}`;
  const scriptUrl = `${baseUrl}/widget.js`;

  const code = (() => {
    if (mode === 'button') {
      const lines = [
        `<script`,
        `  src="${scriptUrl}"`,
        `  data-slug="${slug}"`,
        `  data-mode="button"`,
        `  data-label="${buttonLabel}"`,
        `  data-position="${buttonPosition}"`,
        `  data-color="${color}"`,
      ];
      if (pulse) lines.push(`  data-pulse="true"`);
      if (accentColor) lines.push(`  data-accent="${accentColor}"`);
      if (logoUrl) lines.push(`  data-logo="${logoUrl}"`);
      if (restaurantName) lines.push(`  data-name="${restaurantName}"`);
      lines.push(`></script>`);
      return lines.join('\n');
    }
    if (mode === 'inline') {
      return `<div id="nesto-booking"></div>\n<script\n  src="${scriptUrl}"\n  data-slug="${slug}"\n  data-mode="inline"\n  data-container="nesto-booking"\n  data-color="${color}"\n></script>`;
    }
    return widgetUrl;
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="bg-secondary/50 rounded-card-sm p-4 overflow-x-auto">
        <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
          {code}
        </pre>
      </div>
      <div className="flex items-center gap-2">
        <NestoButton size="sm" variant="secondary" onClick={handleCopy} className="gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Gekopieerd' : 'Kopieer code'}
        </NestoButton>
        {mode === 'link' && (
          <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
            <NestoButton size="sm" variant="secondary" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Open in nieuw tabblad
            </NestoButton>
          </a>
        )}
      </div>
    </div>
  );
}
