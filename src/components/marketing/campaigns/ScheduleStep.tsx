import { NestoInput } from '@/components/polar/NestoInput';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { EmailPreview } from './EmailPreview';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useUserContext } from '@/contexts/UserContext';
import type { EmailBlockData } from './EmailBlock';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NestoButton } from '@/components/polar/NestoButton';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useState } from 'react';

interface ScheduleStepProps {
  sendNow: boolean;
  onSendNowChange: (v: boolean) => void;
  scheduledDate: Date | null;
  onScheduledDateChange: (d: Date | null) => void;
  scheduledTime: string;
  onScheduledTimeChange: (t: string) => void;
  subject: string;
  onSubjectChange: (s: string) => void;
  previewText: string;
  onPreviewTextChange: (t: string) => void;
  blocks: EmailBlockData[];
}

export function ScheduleStep({
  sendNow, onSendNowChange,
  scheduledDate, onScheduledDateChange,
  scheduledTime, onScheduledTimeChange,
  subject, onSubjectChange,
  previewText, onPreviewTextChange,
  blocks,
}: ScheduleStepProps) {
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();
  const [previewMode, setPreviewMode] = useState('desktop');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Planning</h2>
        <p className="text-sm text-muted-foreground mt-1">Stel het verzendmoment en de onderwerpregel in.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          {/* Subject */}
          <NestoInput
            label="Onderwerpregel"
            placeholder="bijv. Ontdek ons nieuwe seizoensmenu"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />

          <NestoInput
            label="Preview tekst"
            placeholder="Korte tekst die onder het onderwerp verschijnt"
            value={previewText}
            onChange={(e) => onPreviewTextChange(e.target.value)}
          />

          {/* Send timing */}
          <div className="space-y-3">
            <label className="block text-label text-muted-foreground">Verzendmoment</label>
            <NestoOutlineButtonGroup
              options={[
                { value: 'now', label: 'Nu versturen' },
                { value: 'schedule', label: 'Inplannen' },
              ]}
              value={sendNow ? 'now' : 'schedule'}
              onChange={(v) => onSendNowChange(v === 'now')}
              size="sm"
            />

            {!sendNow && (
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <NestoButton variant="outline" size="sm" leftIcon={<CalendarDays className="h-4 w-4" />}>
                      {scheduledDate ? format(scheduledDate, 'd MMMM yyyy', { locale: nl }) : 'Kies datum'}
                    </NestoButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate ?? undefined}
                      onSelect={(d) => onScheduledDateChange(d ?? null)}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => onScheduledTimeChange(e.target.value)}
                  className="rounded-button border-[1.5px] border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:!border-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
            <NestoOutlineButtonGroup
              options={[
                { value: 'desktop', label: 'Desktop' },
                { value: 'mobile', label: 'Mobiel' },
              ]}
              value={previewMode}
              onChange={setPreviewMode}
              size="sm"
            />
          </div>
          <EmailPreview
            blocks={blocks}
            brandColor={brandKit?.primary_color ?? undefined}
            logoUrl={brandKit?.logo_url}
            locationName={currentLocation?.name ?? 'Restaurant'}
            mobile={previewMode === 'mobile'}
          />
        </div>
      </div>
    </div>
  );
}
