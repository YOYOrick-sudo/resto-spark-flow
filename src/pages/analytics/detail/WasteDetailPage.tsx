import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { WasteOverzicht } from '@/components/inkoop/WasteOverzicht';

export default function WasteDetailPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Analytics</span>
        </Link>
        <PageHeader title="Waste Analyse" subtitle="Verspilling en kosten in detail" className="border-none pb-0" />
      </div>
      <WasteOverzicht />
    </div>
  );
}
