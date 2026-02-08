import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { NestoCard } from '@/components/polar/NestoCard';

const mockData = [
  { date: '26 jan', count: 12 },
  { date: '27 jan', count: 18 },
  { date: '28 jan', count: 15 },
  { date: '29 jan', count: 22 },
  { date: '30 jan', count: 8 },
  { date: '31 jan', count: 14 },
  { date: '1 feb', count: 19 },
  { date: '2 feb', count: 25 },
  { date: '3 feb', count: 11 },
  { date: '4 feb', count: 17 },
  { date: '5 feb', count: 21 },
  { date: '6 feb', count: 16 },
  { date: '7 feb', count: 23 },
  { date: '8 feb', count: 20 },
];

interface ReservationsTileProps {
  todayCount: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="bg-foreground text-background rounded-lg px-3 py-1.5 text-sm shadow-lg">
      <span className="font-medium">{date}</span>
      <span className="ml-2">{count} reserveringen</span>
    </div>
  );
}

function CustomDot(props: any) {
  const { cx, cy, index } = props;
  if (index !== mockData.length - 1) return null;
  return <circle cx={cx} cy={cy} r={4} fill="#1d979e" stroke="none" />;
}

export function ReservationsTile({ todayCount }: ReservationsTileProps) {
  const heroValue = todayCount > 0 ? String(todayCount) : '—';

  return (
    <NestoCard className="overflow-hidden !p-0">
      <div className="px-6 pt-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Reserveringen</span>
        <Link to="/reserveringen">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
      </div>
      <div className="px-6 mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-foreground">{heroValue}</span>
        <span className="text-sm text-muted-foreground">vandaag</span>
      </div>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={mockData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="reservationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d979e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1d979e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1d979e"
              strokeWidth={2}
              fill="url(#reservationGradient)"
              dot={<CustomDot />}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </NestoCard>
  );
}
