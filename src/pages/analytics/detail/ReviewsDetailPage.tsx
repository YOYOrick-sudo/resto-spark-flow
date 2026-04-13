import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import ReviewsAnalyticsTab from '../tabs/ReviewsAnalyticsTab';

export default function ReviewsDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NestoButton variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-4 w-4" />
        </NestoButton>
        <PageHeader title="Reviews" subtitle="Beoordelingen, sentiment en respons" className="border-none pb-0" />
      </div>
      <ReviewsAnalyticsTab />
    </div>
  );
}
