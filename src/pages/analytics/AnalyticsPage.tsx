import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { WasteSummaryCard } from './cards/WasteSummaryCard';
import { ReviewsSummaryCard } from './cards/ReviewsSummaryCard';
import { ReserveringenSummaryCard } from './cards/ReserveringenSummaryCard';
import { KeukenSummaryCard } from './cards/KeukenSummaryCard';

const periodOptions = [
  { value: '30', label: '30 dagen' },
  { value: '90', label: '90 dagen' },
  { value: '365', label: '1 jaar' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const navigate = useNavigate();
  const periodDays = Number(period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Strategisch inzicht over al je modules"
        actions={
          <NestoOutlineButtonGroup
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReserveringenSummaryCard
          periodDays={periodDays}
          onClick={() => navigate('/analytics/reserveringen')}
        />
        <ReviewsSummaryCard
          periodDays={periodDays}
          onClick={() => navigate('/analytics/reviews')}
        />
        <WasteSummaryCard
          periodDays={periodDays}
          onClick={() => navigate('/analytics/waste')}
        />
        <KeukenSummaryCard periodDays={periodDays} />
      </div>
    </div>
  );
}
