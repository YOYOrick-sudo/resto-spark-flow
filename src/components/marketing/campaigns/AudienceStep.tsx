import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { useSegmentPreview } from '@/hooks/useSegmentPreview';
import { Users } from 'lucide-react';

interface AudienceStepProps {
  segmentId: string | null;
  onSegmentChange: (id: string | null) => void;
}

const ALL_OPTIN = '__all_optin__';

export function AudienceStep({ segmentId, onSegmentChange }: AudienceStepProps) {
  const { data: segments = [] } = useMarketingSegments();

  // Get selected segment filter for preview count
  const selectedSegment = segments.find((s) => s.id === segmentId);
  const filterRules = selectedSegment?.filter_rules ?? null;
  const { data: previewCount } = useSegmentPreview(filterRules);

  const options = [
    { value: ALL_OPTIN, label: 'Alle contacten met opt-in' },
    ...segments.map((s) => ({
      value: s.id,
      label: `${s.name}${s.guest_count != null ? ` (${s.guest_count})` : ''}`,
    })),
  ];

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Doelgroep</h2>
        <p className="text-sm text-muted-foreground mt-1">Kies aan wie deze campagne wordt verstuurd.</p>
      </div>

      <NestoSelect
        label="Segment"
        placeholder="Selecteer doelgroep"
        value={segmentId ?? ALL_OPTIN}
        onValueChange={(v) => onSegmentChange(v === ALL_OPTIN ? null : v)}
        options={options}
      />

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <NestoBadge variant="primary">
          Wordt verstuurd naar {segmentId ? (previewCount ?? '...') : 'alle opt-in'} gasten
        </NestoBadge>
      </div>
    </div>
  );
}
