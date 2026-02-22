import { useState, useEffect, useRef } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { PopupSuggestionCard } from '@/components/marketing/popup/PopupSuggestionCard';
import { usePopupSuggestion } from '@/hooks/usePopupSuggestion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { Check, Globe, ExternalLink, Link as LinkIcon, CalendarIcon, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { usePopupConfigs, usePopupConfig, useCreatePopup, useUpdatePopupConfig, useDeletePopup, PopupType } from '@/hooks/usePopupConfig';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useUserContext } from '@/contexts/UserContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';
import { useTickets } from '@/hooks/useTickets';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const POSITION_OPTIONS = [
  { value: 'top', label: 'Boven' },
  { value: 'bottom', label: 'Onder' },
];

const PREVIEW_OPTIONS = [
  { value: 'popup', label: 'Popup' },
  { value: 'bar', label: 'Sticky bar' },
  { value: 'live', label: 'Live' },
];

const TYPE_OPTIONS = [
  { value: 'reservation', label: 'Ervaring' },
  { value: 'newsletter', label: 'Nieuwsbrief' },
  { value: 'custom', label: 'Custom' },
];

const TYPE_LABELS: Record<string, string> = {
  reservation: 'Ervaring',
  newsletter: 'Nieuwsbrief',
  custom: 'Custom',
};

const DEFAULT_BUTTON_TEXT: Record<PopupType, string> = {
  reservation: 'Reserveer nu',
  newsletter: 'Aanmelden',
  custom: 'Meer info',
};

function getPopupStatus(popup: { is_active: boolean; schedule_end_at: string | null; schedule_start_at: string | null }) {
  if (!popup.is_active) return 'inactive';
  if (popup.schedule_end_at && new Date(popup.schedule_end_at) < new Date()) return 'expired';
  if (popup.schedule_start_at && new Date(popup.schedule_start_at) > new Date()) return 'scheduled';
  return 'active';
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active': return <NestoBadge variant="default" className="bg-green-100 text-green-700 border-green-200">Actief</NestoBadge>;
    case 'expired': return <NestoBadge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">Verlopen</NestoBadge>;
    case 'scheduled': return <NestoBadge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Gepland</NestoBadge>;
    default: return <NestoBadge variant="outline" className="text-muted-foreground">Uit</NestoBadge>;
  }
}

export default function PopupPage() {
  const { data: popups, isLoading } = usePopupConfigs();
  const { data: suggestion } = usePopupSuggestion();
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();
  const createPopup = useCreatePopup();
  const deletePopup = useDeletePopup();
  const { data: ticketsData } = useTickets(currentLocation?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState('popup');
  const [iframeKey, setIframeKey] = useState(0);

  // Auto-select first popup
  useEffect(() => {
    if (popups && popups.length > 0 && !selectedId) {
      setSelectedId(popups[0].id);
    } else if (popups && popups.length === 0) {
      setSelectedId(null);
    }
  }, [popups, selectedId]);

  // If selected popup got deleted, reset
  useEffect(() => {
    if (selectedId && popups && !popups.find(p => p.id === selectedId)) {
      setSelectedId(popups.length > 0 ? popups[0].id : null);
    }
  }, [popups, selectedId]);

  const selectedPopup = popups?.find(p => p.id === selectedId) ?? null;

  const handleCreate = () => {
    createPopup.mutate(undefined, {
      onSuccess: (newPopup) => {
        setSelectedId(newPopup.id);
        nestoToast.success('Popup aangemaakt');
      },
      onError: () => nestoToast.error('Fout', 'Kon popup niet aanmaken.'),
    });
  };

  const handleDelete = (id: string) => {
    deletePopup.mutate(id, {
      onSuccess: () => nestoToast.success('Popup verwijderd'),
      onError: () => nestoToast.error('Fout', 'Kon popup niet verwijderen.'),
    });
  };

  const slug = currentLocation?.slug || 'your-slug';
  const previewUrl = `/popup-preview?slug=${slug}${selectedId ? `&popup_id=${selectedId}` : ''}`;

  if (isLoading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <CardSkeleton lines={6} />
    </div>
  );

  const primaryColor = brandKit?.primary_color || '#1d979e';
  const activeTickets = ticketsData?.visibleTickets?.filter(t => t.status === 'active') ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* AI Suggestion */}
      {suggestion && <PopupSuggestionCard suggestion={suggestion} targetPopupId={selectedId ?? undefined} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Website Popup</h1>
        </div>
        <NestoButton onClick={handleCreate} isLoading={createPopup.isPending} className="gap-1.5" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Nieuwe popup
        </NestoButton>
      </div>

      {/* Popup list */}
      {popups && popups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {popups.map(popup => {
            const status = getPopupStatus(popup);
            const isSelected = popup.id === selectedId;
            return (
              <button
                key={popup.id}
                onClick={() => setSelectedId(popup.id)}
                className={cn(
                  'text-left p-3 rounded-card border transition-all duration-150',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/30'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{popup.name}</span>
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <NestoBadge variant="outline" className="text-[10px] px-1.5 py-0">
                    {TYPE_LABELS[popup.popup_type] ?? popup.popup_type}
                  </NestoBadge>
                  {popup.schedule_start_at && popup.schedule_end_at ? (
                    <span>
                      {format(new Date(popup.schedule_start_at), 'd MMM', { locale: nl })} – {format(new Date(popup.schedule_end_at), 'd MMM', { locale: nl })}
                    </span>
                  ) : (
                    <span>Altijd</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Geen popups"
          description="Maak je eerste popup om bezoekers te bereiken."
          action={{ label: 'Eerste popup maken', onClick: handleCreate }}
        />
      )}

      {/* Selected popup configuration */}
      {selectedPopup && (
        <PopupEditor
          key={selectedPopup.id}
          popup={selectedPopup}
          primaryColor={primaryColor}
          activeTickets={activeTickets}
          brandKit={brandKit}
          previewType={previewType}
          setPreviewType={setPreviewType}
          previewUrl={previewUrl}
          iframeKey={iframeKey}
          setIframeKey={setIframeKey}
          saved={saved}
          setSaved={setSaved}
          onDelete={() => handleDelete(selectedPopup.id)}
        />
      )}
    </div>
  );
}

// ─── Popup Editor ─────────────────────────────────────────────
interface PopupEditorProps {
  popup: NonNullable<ReturnType<typeof usePopupConfigs>['data']>[number];
  primaryColor: string;
  activeTickets: any[];
  brandKit: any;
  previewType: string;
  setPreviewType: (v: string) => void;
  previewUrl: string;
  iframeKey: number;
  setIframeKey: (fn: (k: number) => number) => void;
  saved: boolean;
  setSaved: (v: boolean) => void;
  onDelete: () => void;
}

function PopupEditor({
  popup, primaryColor, activeTickets, brandKit,
  previewType, setPreviewType, previewUrl,
  iframeKey, setIframeKey,
  saved, setSaved, onDelete,
}: PopupEditorProps) {
  const updateConfig = useUpdatePopupConfig(popup.id);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState({
    name: popup.name,
    is_active: popup.is_active,
    popup_type: popup.popup_type as PopupType,
    exit_intent_enabled: popup.exit_intent_enabled,
    timed_popup_enabled: popup.timed_popup_enabled,
    timed_popup_delay_seconds: popup.timed_popup_delay_seconds,
    sticky_bar_enabled: popup.sticky_bar_enabled,
    sticky_bar_position: popup.sticky_bar_position,
    headline: popup.headline,
    description: popup.description,
    button_text: popup.button_text,
    success_message: popup.success_message,
    gdpr_text: popup.gdpr_text,
    featured_ticket_id: popup.featured_ticket_id ?? null as string | null,
    custom_button_url: popup.custom_button_url ?? '' as string,
    schedule_start_at: popup.schedule_start_at ?? null as string | null,
    schedule_end_at: popup.schedule_end_at ?? null as string | null,
    priority: popup.priority,
  });

  const [schedulingEnabled, setSchedulingEnabled] = useState(!!(popup.schedule_start_at || popup.schedule_end_at));

  const debouncedSave = useDebouncedCallback((updates: Record<string, any>) => {
    updateConfig.mutate(updates, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  const update = (key: string, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
    debouncedSave({ [key]: value });
  };

  const handleTypeChange = (newType: string) => {
    const type = newType as PopupType;
    setState(prev => ({ ...prev, popup_type: type, button_text: DEFAULT_BUTTON_TEXT[type] }));
    debouncedSave({ popup_type: type, button_text: DEFAULT_BUTTON_TEXT[type] });
  };

  const handleScheduleToggle = (enabled: boolean) => {
    setSchedulingEnabled(enabled);
    if (!enabled) {
      setState(prev => ({ ...prev, schedule_start_at: null, schedule_end_at: null }));
      debouncedSave({ schedule_start_at: null, schedule_end_at: null });
    }
  };

  // Send postMessage to live iframe preview on every state change
  useEffect(() => {
    if (previewType !== 'live' || !iframeRef.current?.contentWindow) return;
    const ft = activeTickets.find(t => t.id === state.featured_ticket_id);
    iframeRef.current.contentWindow.postMessage({
      type: 'nesto-popup-config-update',
      config: {
        headline: state.headline,
        description: state.description,
        button_text: state.button_text,
        popup_type: state.popup_type,
        primary_color: primaryColor,
        logo_url: brandKit?.logo_url || null,
        featured_ticket: ft ? { display_title: ft.display_title, short_description: ft.short_description, color: ft.color } : null,
        sticky_bar_enabled: state.sticky_bar_enabled,
        sticky_bar_position: state.sticky_bar_position,
        exit_intent_enabled: state.exit_intent_enabled,
        timed_popup_enabled: state.timed_popup_enabled,
        timed_popup_delay_seconds: state.timed_popup_delay_seconds,
        success_message: state.success_message,
        gdpr_text: state.gdpr_text,
        custom_button_url: state.custom_button_url,
        is_active: state.is_active,
      },
    }, '*');
  }, [state, primaryColor, brandKit, previewType, activeTickets]);

  const isScheduleExpired = state.is_active && state.schedule_end_at && new Date(state.schedule_end_at) < new Date();
  const featuredTicket = activeTickets.find(t => t.id === state.featured_ticket_id);
  const ticketOptions = [
    { value: '__none__', label: 'Geen' },
    ...activeTickets.map(t => ({ value: t.id, label: t.display_title || t.name })),
  ];

  const isReservation = state.popup_type === 'reservation';
  const isNewsletter = state.popup_type === 'newsletter';
  const isCustom = state.popup_type === 'custom';

  return (
    <>
      {/* Sub-header for selected popup */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={state.name}
            onChange={(e) => update('name', e.target.value)}
            className="text-base font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 max-w-[300px]"
          />
          {isScheduleExpired && (
            <NestoBadge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              Verlopen
            </NestoBadge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" />
            Opgeslagen
          </span>
          <Switch
            checked={state.is_active}
            onCheckedChange={(v) => update('is_active', v)}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <NestoButton variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </NestoButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Popup verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{state.name}" wordt permanent verwijderd. Dit kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleer</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Configuration */}
        <div className="space-y-5">
          {/* Popup type */}
          <NestoCard className="p-4">
            <h4 className="text-sm font-medium mb-3">Popup type</h4>
            <NestoOutlineButtonGroup
              options={TYPE_OPTIONS}
              value={state.popup_type}
              onChange={handleTypeChange}
            />
          </NestoCard>

          {/* Content fields */}
          <NestoCard className="p-4 space-y-4">
            <h4 className="text-sm font-medium">Teksten</h4>
            <div>
              <Label className="text-sm mb-1.5 block">Koptekst</Label>
              <Input value={state.headline} onChange={(e) => update('headline', e.target.value)} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Beschrijving</Label>
              <Textarea value={state.description} onChange={(e) => update('description', e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Knoptekst</Label>
              <Input value={state.button_text} onChange={(e) => update('button_text', e.target.value)} />
            </div>

            {isReservation && (
              <div>
                <Label className="text-sm mb-1.5 block">Uitgelicht ticket</Label>
                <NestoSelect
                  value={state.featured_ticket_id || '__none__'}
                  onValueChange={(v) => update('featured_ticket_id', v === '__none__' ? null : v)}
                  options={ticketOptions}
                />
                {featuredTicket && (
                  <div
                    className="mt-2 rounded-xl p-4 w-full text-left"
                    style={{ background: `linear-gradient(180deg, ${featuredTicket.color}18 0%, transparent 100%)` }}
                  >
                    <p className="text-sm font-bold text-foreground">{featuredTicket.display_title}</p>
                    {featuredTicket.short_description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{featuredTicket.short_description}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isNewsletter && (
              <>
                <div>
                  <Label className="text-sm mb-1.5 block">Succesmelding</Label>
                  <Input value={state.success_message} onChange={(e) => update('success_message', e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">GDPR tekst</Label>
                  <Textarea value={state.gdpr_text} onChange={(e) => update('gdpr_text', e.target.value)} rows={2} />
                </div>
              </>
            )}

            {isCustom && (
              <div>
                <Label className="text-sm mb-1.5 block">Link URL</Label>
                <Input value={state.custom_button_url} onChange={(e) => update('custom_button_url', e.target.value)} placeholder="https://..." />
              </div>
            )}
          </NestoCard>

          {/* Display settings */}
          <NestoCard className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium">Weergave</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Hoe wil je de popup tonen?</p>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setState(prev => ({ ...prev, sticky_bar_enabled: false }));
                  debouncedSave({ sticky_bar_enabled: false });
                }}
                className={cn(
                  'flex items-start gap-3 rounded-card-sm border-[1.5px] px-4 py-3 text-left transition-all duration-150 cursor-pointer',
                  !state.sticky_bar_enabled
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                )}
              >
                <div className={cn(
                  'rounded-md p-1.5 shrink-0 mt-0.5',
                  !state.sticky_bar_enabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">Popup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Overlay die verschijnt bij een trigger</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setState(prev => ({ ...prev, sticky_bar_enabled: true, exit_intent_enabled: false, timed_popup_enabled: false }));
                  debouncedSave({ sticky_bar_enabled: true, exit_intent_enabled: false, timed_popup_enabled: false });
                }}
                className={cn(
                  'flex items-start gap-3 rounded-card-sm border-[1.5px] px-4 py-3 text-left transition-all duration-150 cursor-pointer',
                  state.sticky_bar_enabled
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                )}
              >
                <div className={cn(
                  'rounded-md p-1.5 shrink-0 mt-0.5',
                  state.sticky_bar_enabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="4" rx="1"/><line x1="2" y1="12" x2="22" y2="12" opacity=".3"/><line x1="2" y1="16" x2="22" y2="16" opacity=".3"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">Sticky bar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Vaste balk boven of onder de pagina</p>
                </div>
              </button>
            </div>

            <div className="border-t border-border" />

            {/* Popup triggers (only when popup mode) */}
            {!state.sticky_bar_enabled && (
              <div className="space-y-0">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-sm">Exit-intent</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Toon bij verlaten pagina (desktop).</p>
                  </div>
                  <Switch checked={state.exit_intent_enabled} onCheckedChange={(v) => update('exit_intent_enabled', v)} />
                </div>

                <div className="border-t border-border" />

                <div className="py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Timed popup</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Toon na aantal seconden.</p>
                    </div>
                    <Switch checked={state.timed_popup_enabled} onCheckedChange={(v) => update('timed_popup_enabled', v)} />
                  </div>
                  {state.timed_popup_enabled && (
                    <div className="mt-3 flex items-center gap-3">
                      <Slider
                        value={[state.timed_popup_delay_seconds]}
                        onValueChange={([v]) => update('timed_popup_delay_seconds', v)}
                        min={2} max={30} step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums w-16 text-right">
                        {state.timed_popup_delay_seconds}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticky bar position (only when sticky bar mode) */}
            {state.sticky_bar_enabled && (
              <div className="py-2">
                <Label className="text-sm mb-1.5 block">Positie</Label>
                <div className="max-w-[200px]">
                  <NestoSelect value={state.sticky_bar_position} onValueChange={(v) => update('sticky_bar_position', v)} options={POSITION_OPTIONS} />
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Planning (always visible) */}
            <div className="py-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Planning</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Stel een periode in wanneer de popup actief is.</p>
                </div>
                <Switch checked={schedulingEnabled} onCheckedChange={handleScheduleToggle} />
              </div>
              {schedulingEnabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Van</Label>
                    <DateTimePicker
                      value={state.schedule_start_at ? new Date(state.schedule_start_at) : undefined}
                      onChange={(d) => update('schedule_start_at', d?.toISOString() ?? null)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Tot</Label>
                    <DateTimePicker
                      value={state.schedule_end_at ? new Date(state.schedule_end_at) : undefined}
                      onChange={(d) => update('schedule_end_at', d?.toISOString() ?? null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </NestoCard>
        </div>

        {/* RIGHT: Preview */}
        <div className="space-y-5">
          <NestoCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Preview</h4>
              <div className="flex items-center gap-2">
                {previewType === 'live' && (
                  <button
                    onClick={() => setIframeKey(k => k + 1)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                    title="Ververs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <NestoOutlineButtonGroup options={PREVIEW_OPTIONS} value={previewType} onChange={setPreviewType} size="sm" />
              </div>
            </div>

            {previewType === 'live' ? (
              <div className="border border-border rounded-card overflow-hidden" style={{ minHeight: 500 }}>
                <iframe
                  ref={iframeRef}
                  key={iframeKey}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  style={{ minHeight: 500 }}
                  title="Live popup preview"
                />
              </div>
            ) : (
              <div
                className="border border-border rounded-card overflow-hidden min-h-[400px] relative"
                style={{
                  backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  backgroundColor: 'hsl(var(--background))',
                }}
              >
                {previewType === 'popup' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-[380px] bg-card rounded-3xl p-6 shadow-lg border border-border text-center">
                      {brandKit?.logo_url && (
                        <img src={brandKit.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain mb-3 mx-auto" />
                      )}
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#1a1a1a' }}>{state.headline}</h3>
                      <p className="text-sm mb-4 whitespace-pre-line" style={{ color: '#666' }}>{state.description}</p>

                      {isNewsletter && (
                        <>
                          <div className="flex gap-2 justify-center">
                            <input type="email" placeholder="je@email.nl" className="flex-1 px-3 py-2 border border-border rounded-xl text-sm bg-background" disabled />
                            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white whitespace-nowrap" style={{ backgroundColor: primaryColor }} disabled>
                              {state.button_text}
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-3">{state.gdpr_text}</p>
                        </>
                      )}

                      {isReservation && (
                        <>
                          {featuredTicket && (
                            <div
                              className="rounded-3xl p-4 w-full text-left mb-3"
                              style={{ background: `linear-gradient(180deg, ${featuredTicket.color}18 0%, transparent 100%)` }}
                            >
                              <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{featuredTicket.display_title}</p>
                              {featuredTicket.short_description && (
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: '#666' }}>{featuredTicket.short_description}</p>
                              )}
                            </div>
                          )}
                          <button className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }} disabled>
                            {state.button_text}
                          </button>
                        </>
                      )}

                      {isCustom && (
                        <button className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }} disabled>
                          <LinkIcon className="h-3.5 w-3.5" />
                          {state.button_text}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-x-0 flex items-center" style={{ [state.sticky_bar_position === 'top' ? 'top' : 'bottom']: 0 }}>
                    <div className="w-full p-3 shadow flex items-center gap-3 flex-wrap" style={{ backgroundColor: primaryColor }}>
                      <span className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{state.headline}</span>
                      {isNewsletter && (
                        <input type="email" placeholder="je@email.nl" className="px-3 py-1.5 border border-white/30 rounded-xl text-sm bg-white w-[180px]" disabled />
                      )}
                      <button className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap border border-white bg-transparent" disabled>
                        {state.button_text}
                      </button>
                      <button className="text-white text-lg leading-none opacity-80" disabled>&times;</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </NestoCard>

          <NestoButton variant="secondary" onClick={() => window.open(previewUrl, '_blank')} className="gap-1.5 w-full">
            <ExternalLink className="h-3.5 w-3.5" />
            Preview openen in nieuw tabblad
          </NestoButton>
        </div>
      </div>
    </>
  );
}

// ─── DateTimePicker ───────────────────────────────────────────
function DateTimePicker({ value, onChange }: { value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-left bg-background hover:bg-accent/50 transition-colors",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
          {value ? format(value, 'd MMM yyyy', { locale: nl }) : 'Kies datum'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => onChange(d ?? undefined)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
