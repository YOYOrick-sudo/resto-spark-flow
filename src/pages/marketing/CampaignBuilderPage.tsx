import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { BuilderSidebar } from '@/components/marketing/campaigns/BuilderSidebar';
import { TemplateStep } from '@/components/marketing/campaigns/TemplateStep';
import { ContentStep } from '@/components/marketing/campaigns/ContentStep';
import { AudienceStep } from '@/components/marketing/campaigns/AudienceStep';
import { ScheduleStep } from '@/components/marketing/campaigns/ScheduleStep';
import { ConfirmStep } from '@/components/marketing/campaigns/ConfirmStep';
import { useCreateCampaign } from '@/hooks/useMarketingCampaigns';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useSegmentPreview } from '@/hooks/useSegmentPreview';
import { usePermission } from '@/hooks/usePermission';
import { EmptyState } from '@/components/polar/EmptyState';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { nestoToast } from '@/lib/nestoToast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EmailBlockData } from '@/components/marketing/campaigns/EmailBlock';

function defaultBlocks(): EmailBlockData[] {
  return [
    { id: crypto.randomUUID(), type: 'header', content: {} },
    { id: crypto.randomUUID(), type: 'text', content: { text: '' } },
    { id: crypto.randomUUID(), type: 'footer', content: {} },
  ];
}

export default function CampaignBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const canManage = usePermission('marketing.manage');

  // State
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EmailBlockData[]>(defaultBlocks());
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const { data: brandKit, isLoading: brandKitLoading } = useMarketingBrandKit();
  const { data: segments = [] } = useMarketingSegments();
  const isMobile = useIsMobile();
  const createCampaign = useCreateCampaign();

  // Default send time from brand kit
  const defaultTime = brandKit?.default_send_time ?? '18:00';

  // Audience count
  const selectedSegment = segments.find((s) => s.id === segmentId);
  const filterRules = selectedSegment?.filter_rules ?? null;
  const { data: previewCount } = useSegmentPreview(filterRules);
  const audienceCount = segmentId ? (previewCount ?? '...') : 'alle opt-in';
  const segmentLabel = segmentId
    ? (selectedSegment?.name ?? 'Segment')
    : 'Alle contacten met opt-in';

  const markComplete = useCallback((s: number) => {
    setCompletedSteps((prev) => new Set([...prev, s]));
  }, []);

  const goNext = () => {
    markComplete(step);
    setStep(step + 1);
  };

  const goPrev = () => setStep(step - 1);

  const handleTemplateSelect = (id: string | null, html: string | null) => {
    setTemplateId(id);
    setTemplateHtml(html);
    // If template selected, populate initial content block
    if (html) {
      setBlocks([
        { id: crypto.randomUUID(), type: 'header', content: {} },
        { id: crypto.randomUUID(), type: 'text', content: { text: html.replace(/<[^>]*>/g, ' ').trim().slice(0, 500) } },
        { id: crypto.randomUUID(), type: 'footer', content: {} },
      ]);
    } else {
      setBlocks(defaultBlocks());
    }
  };

  const handleConfirm = () => {
    const status = sendNow ? 'sending' : 'scheduled';
    let scheduled_at: string | null = null;
    if (!sendNow && scheduledDate) {
      const [h, m] = scheduledTime.split(':');
      const d = new Date(scheduledDate);
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      scheduled_at = d.toISOString();
    }

    // Build simple HTML from blocks
    const contentParts = blocks
      .filter((b) => ['text', 'menu_item', 'reserve_button', 'review_quote'].includes(b.type))
      .map((b) => {
        if (b.type === 'text') return `<p>${b.content.text ?? ''}</p>`;
        if (b.type === 'menu_item') return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:8px 0"><strong>${b.content.menuItemName ?? ''}</strong> — ${b.content.menuItemPrice ?? ''}<br/><small>${b.content.menuItemDescription ?? ''}</small></div>`;
        if (b.type === 'reserve_button') return `<div style="text-align:center;padding:16px 0"><a href="/reserveren" style="background:${brandKit?.primary_color ?? '#1d979e'};color:#fff;padding:14px 36px;border-radius:16px;text-decoration:none;font-weight:700">Reserveer nu</a></div>`;
        if (b.type === 'review_quote') return `<blockquote style="border-left:3px solid ${brandKit?.primary_color ?? '#1d979e'};padding:12px;margin:8px 0"><em>"${b.content.reviewText ?? ''}"</em><br/><small>— ${b.content.reviewAuthor ?? ''}</small></blockquote>`;
        return '';
      });
    const contentHtml = contentParts.join('');

    createCampaign.mutate(
      {
        name: campaignName || subject || 'Naamloze campagne',
        subject,
        content_html: contentHtml,
        content_text: blocks.filter((b) => b.type === 'text').map((b) => b.content.text).join('\n'),
        segment_id: segmentId,
        scheduled_at,
        status,
      },
      {
        onSuccess: () => {
          nestoToast.success(sendNow ? 'Campagne wordt verzonden!' : 'Campagne ingepland!');
          navigate('/marketing/campagnes');
        },
        onError: () => nestoToast.error('Er is iets misgegaan'),
      }
    );
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="Geen toegang" description="Je hebt geen rechten om campagnes te beheren." />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-6 space-y-6">
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/marketing/campagnes')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Terug
        </NestoButton>
        <InfoAlert
          title="Desktop vereist"
          variant="warning"
        >
          Gebruik een desktop voor de email builder. Op mobiel kun je campagnes bekijken via het overzicht.
        </InfoAlert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Brand kit warning */}
      {!brandKitLoading && !brandKit && (
        <InfoAlert title="Brand Kit niet ingesteld" variant="warning">
          Stel eerst je Brand Kit in via{' '}
          <button onClick={() => navigate('/instellingen/marketing')} className="underline font-medium">
            Instellingen &gt; Marketing
          </button>{' '}
          voor een consistente uitstraling.
        </InfoAlert>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-4">
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/marketing/campagnes')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Terug
        </NestoButton>
        <div className="flex-1">
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campagnenaam..."
            className="text-h2 font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground w-full"
          />
        </div>
      </div>

      <div className="flex gap-6">
        <BuilderSidebar
          currentStep={step}
          completedSteps={completedSteps}
          onStepClick={setStep}
        />

        <div className="flex-1 min-w-0">
          {step === 1 && (
            <TemplateStep
              selectedTemplateId={templateId}
              onSelect={handleTemplateSelect}
            />
          )}
          {step === 2 && (
            <ContentStep blocks={blocks} onChange={setBlocks} />
          )}
          {step === 3 && (
            <AudienceStep segmentId={segmentId} onSegmentChange={setSegmentId} />
          )}
          {step === 4 && (
            <ScheduleStep
              sendNow={sendNow}
              onSendNowChange={setSendNow}
              scheduledDate={scheduledDate}
              onScheduledDateChange={setScheduledDate}
              scheduledTime={scheduledTime || defaultTime}
              onScheduledTimeChange={setScheduledTime}
              subject={subject}
              onSubjectChange={setSubject}
              previewText={previewText}
              onPreviewTextChange={setPreviewText}
              blocks={blocks}
            />
          )}
          {step === 5 && (
            <ConfirmStep
              subject={subject}
              sendNow={sendNow}
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              segmentId={segmentId}
              segmentLabel={segmentLabel}
              audienceCount={audienceCount}
              isSubmitting={createCampaign.isPending}
              onConfirm={handleConfirm}
            />
          )}

          {/* Navigation footer */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            <NestoButton
              variant="ghost"
              onClick={goPrev}
              disabled={step === 1}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Vorige
            </NestoButton>
            {step < 5 && (
              <NestoButton
                onClick={goNext}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Volgende
              </NestoButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
