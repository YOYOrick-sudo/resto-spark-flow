import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { NestoButton } from '@/components/polar/NestoButton';
import { copyToClipboard } from '@/lib/clipboard';
import { nestoToast } from '@/lib/nestoToast';

const FALLBACK_BRAND = '#1d979e';

interface Props {
  slug: string;
  brandColor: string | null;
}

export function ShareSection({ slug, brandColor }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/werken-bij/${slug}`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      nestoToast.error('Kopiëren mislukt');
    }
  };

  const handleDownloadQR = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: brandColor || FALLBACK_BRAND, light: '#FFFFFF' },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `sollicitatie-${slug}.png`;
      a.click();
    } catch {
      nestoToast.error('QR-code genereren mislukt');
    }
  };

  return (
    <section>
      <h2 className="text-base font-medium mb-1">Delen</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Deel deze link op je website, social media of als QR-code in je restaurant.
      </p>
      <div className="bg-secondary/50 rounded-card p-3 mb-3">
        <p className="text-sm font-mono break-all text-foreground">{url}</p>
      </div>
      <div className="flex gap-2">
        <NestoButton size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Gekopieerd' : 'Kopieer link'}
        </NestoButton>
        <NestoButton size="sm" variant="secondary" onClick={handleDownloadQR}>
          <Download className="h-3.5 w-3.5" />
          Download QR-code
        </NestoButton>
      </div>
    </section>
  );
}