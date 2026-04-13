

# Analytics: Van Tabs naar Card Dashboard

## Overzicht
Herschrijf de Analytics pagina naar een scanbaar dashboard met 4 summary cards en detail sub-routes.

## Bestanden

### 1. `src/pages/analytics/AnalyticsPage.tsx` — Herschrijven

```tsx
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
```

### 2. `src/pages/analytics/cards/WasteSummaryCard.tsx` — Nieuw

```tsx
import { useMemo } from 'react';
import { ArrowUpRight, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { useWasteRegistraties } from '@/hooks/useWasteRegistraties';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function WasteSummaryCard({ onClick }: Props) {
  const { data: current } = useWasteRegistraties();

  const prevFrom = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevTo = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: previous } = useWasteRegistraties({ from: prevFrom, to: prevTo });

  const totaal = useMemo(
    () => (current ?? []).reduce((s, r) => s + (r.geschatte_kosten ?? 0), 0),
    [current]
  );

  const prevTotaal = useMemo(
    () => (previous ?? []).reduce((s, r) => s + (r.geschatte_kosten ?? 0), 0),
    [previous]
  );

  const trendPct = prevTotaal > 0 ? Math.round(((totaal - prevTotaal) / prevTotaal) * 100) : null;

  const topCategorie = useMemo(() => {
    if (!current?.length || totaal === 0) return null;
    const perCat = new Map<string, number>();
    current.forEach((r) => {
      perCat.set(r.categorie, (perCat.get(r.categorie) ?? 0) + (r.geschatte_kosten ?? 0));
    });
    let top = { cat: '', kosten: 0 };
    perCat.forEach((k, c) => { if (k > top.kosten) top = { cat: c, kosten: k }; });
    return top.cat;
  }, [current, totaal]);

  return (
    <NestoCard
      hoverable
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-error/10 rounded-lg">
            <Trash2 className="h-4 w-4 text-error" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Waste</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">
          {totaal > 0 ? `€${totaal.toFixed(0)}` : '—'}
        </span>
        <span className="text-sm text-muted-foreground">deze week</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        {trendPct !== null && (
          <span className={`flex items-center gap-1 font-medium ${trendPct <= 0 ? 'text-success' : 'text-error'}`}>
            {trendPct <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {Math.abs(trendPct)}%
          </span>
        )}
        {topCategorie && (
          <span>Top: <span className="capitalize font-medium text-foreground">{topCategorie}</span></span>
        )}
      </div>
    </NestoCard>
  );
}
```

### 3. `src/pages/analytics/cards/ReviewsSummaryCard.tsx` — Nieuw

```tsx
import { ArrowUpRight, Star } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { useReviewAnalytics } from '@/hooks/useReviewAnalytics';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function ReviewsSummaryCard({ periodDays, onClick }: Props) {
  const { stats } = useReviewAnalytics(periodDays);
  const { data: brand } = useBrandIntelligence();

  const googleScore = brand?.google_rating ?? null;
  const totalReviews = stats?.totalReviews ?? 0;
  const avgSentiment = stats?.avgSentiment ?? null;

  return (
    <NestoCard hoverable className="cursor-pointer group" onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-warning/10 rounded-lg">
            <Star className="h-4 w-4 text-warning" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reviews</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">
          {googleScore !== null ? `${googleScore}/5` : '—'}
        </span>
        <span className="text-sm text-muted-foreground">Google</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalReviews} reviews</span>
        {avgSentiment !== null && (
          <>
            <span>·</span>
            <span>Sentiment {avgSentiment.toFixed(1)}/3</span>
          </>
        )}
      </div>
    </NestoCard>
  );
}
```

### 4. `src/pages/analytics/cards/ReserveringenSummaryCard.tsx` — Nieuw

```tsx
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function ReserveringenSummaryCard({ onClick }: Props) {
  // Placeholder — real data hook te koppelen
  return (
    <NestoCard hoverable className="cursor-pointer group" onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reserveringen</span>
        </div>
        <div className="flex items-center gap-2">
          <NestoBadge variant="default" size="sm">Binnenkort</NestoBadge>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">—</span>
        <span className="text-sm text-muted-foreground">gasten deze week</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <span>No-show —%</span>
        <span>·</span>
        <span>Gem. omzet —</span>
      </div>
    </NestoCard>
  );
}
```

### 5. `src/pages/analytics/cards/KeukenSummaryCard.tsx` — Nieuw

```tsx
import { ChefHat } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';

interface Props {
  periodDays: number;
}

export function KeukenSummaryCard({}: Props) {
  return (
    <NestoCard className="opacity-60">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-lg">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Keuken & Productie</span>
        </div>
        <NestoBadge variant="default" size="sm">Binnenkort</NestoBadge>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-muted-foreground">—%</span>
        <span className="text-sm text-muted-foreground">food cost</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <span>MEP —</span>
        <span>·</span>
        <span>Productie —</span>
      </div>
    </NestoCard>
  );
}
```

### 6. `src/pages/analytics/detail/WasteDetailPage.tsx` — Nieuw

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import { WasteOverzicht } from '@/components/inkoop/WasteOverzicht';

export default function WasteDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NestoButton variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-4 w-4" />
        </NestoButton>
        <PageHeader title="Waste Analyse" subtitle="Verspilling en kosten in detail" />
      </div>
      <WasteOverzicht />
    </div>
  );
}
```

### 7. `src/pages/analytics/detail/ReviewsDetailPage.tsx` — Nieuw

```tsx
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
        <PageHeader title="Reviews" subtitle="Beoordelingen, sentiment en respons" />
      </div>
      <ReviewsAnalyticsTab />
    </div>
  );
}
```

### 8. `src/pages/analytics/detail/BereikDetailPage.tsx` — Nieuw

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import BereikTab from '../tabs/BereikTab';

export default function BereikDetailPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NestoButton variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-4 w-4" />
        </NestoButton>
        <PageHeader title="Bereik" subtitle="Marketing & social media overzicht" />
      </div>
      <BereikTab />
    </div>
  );
}
```

### 9. `src/App.tsx` — Wijzigen

Toevoegen bij imports:
```tsx
import WasteDetailPage from "./pages/analytics/detail/WasteDetailPage";
import ReviewsDetailPage from "./pages/analytics/detail/ReviewsDetailPage";
import BereikDetailPage from "./pages/analytics/detail/BereikDetailPage";
```

Vervang de bestaande analytics route (regel 163):
```tsx
<Route path="/analytics" element={<AnalyticsPage />} />
```
Door:
```tsx
<Route path="/analytics" element={<AnalyticsPage />} />
<Route path="/analytics/waste" element={<WasteDetailPage />} />
<Route path="/analytics/reviews" element={<ReviewsDetailPage />} />
<Route path="/analytics/bereik" element={<BereikDetailPage />} />
```

### 10. `src/components/dashboard/WasteTile.tsx` — Wijzigen

Regel 58: wijzig navigate van `'/analytics?tab=waste'` naar `'/analytics/waste'`.

