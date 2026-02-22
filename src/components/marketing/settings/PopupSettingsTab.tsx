import { useState } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Check, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { usePopupConfigs } from '@/hooks/usePopupConfig';

interface PopupSettingsTabProps {
  readOnly: boolean;
}

export default function PopupSettingsTab({ readOnly }: PopupSettingsTabProps) {
  const { currentLocation } = useUserContext();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { data: popups } = usePopupConfigs();

  const slug = currentLocation?.slug || 'your-slug';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const embedCode = `<script src="${supabaseUrl}/functions/v1/marketing-popup-widget?slug=${slug}"></script>`;
  const previewUrl = `${supabaseUrl}/functions/v1/marketing-popup-preview?slug=${slug}`;

  const activeCount = popups?.filter(p => p.is_active).length ?? 0;

  const handleCopy = async () => {
    const { copyToClipboard } = await import('@/lib/clipboard');
    await copyToClipboard(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NestoCard className="p-6 space-y-5">
      {/* Link to popup workspace */}
      <div className="bg-secondary/50 rounded-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm text-muted-foreground">
            De popup content en weergave worden beheerd onder <strong>Marketing &gt; Website Popup</strong>.
          </p>
          {activeCount > 0 && (
            <NestoBadge variant="default">{activeCount} actief</NestoBadge>
          )}
        </div>
        <NestoButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/marketing/popup')}
          className="gap-1.5"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Popups beheren
        </NestoButton>
      </div>

      {/* Embed code */}
      <div className="bg-secondary/50 rounded-card p-4">
        <h4 className="text-sm font-medium mb-2">Embed code</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Plak dit in de <code className="bg-background px-1 py-0.5 rounded text-[11px]">&lt;head&gt;</code> van je website.
        </p>
        <div className="bg-background rounded-card-sm p-3 overflow-x-auto mb-3">
          <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
            {embedCode}
          </pre>
        </div>
        <div className="flex gap-2">
          <NestoButton size="sm" variant="secondary" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Gekopieerd' : 'Kopieer code'}
          </NestoButton>
          <NestoButton
            size="sm"
            variant="secondary"
            onClick={() => window.open(previewUrl, '_blank')}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview openen
          </NestoButton>
        </div>
      </div>
    </NestoCard>
  );
}
