import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { NestoCard } from '@/components/polar/NestoCard';

const mockData = [
  { date: '26 jan', day: '', count: 8 },
  { date: '27 jan', day: '', count: 12 },
  { date: '28 jan', day: '', count: 15 },
  { date: '29 jan', day: '', count: 10 },
  { date: '30 jan', day: '', count: 22 },
  { date: '31 jan', day: '', count: 18 },
  { date: '1 feb', day: '', count: 14 },
  { date: '2 feb', day: 'M', count: 16 },
  { date: '3 feb', day: 'D', count: 19 },
  { date: '4 feb', day: 'W', count: 14 },
  { date: '5 feb', day: 'D', count: 24 },
  { date: '6 feb', day: 'V', count: 28 },
  { date: '7 feb', day: 'Z', count: 32 },
  { date: '8 feb', day: 'Z', count: 20 },
];

interface ReservationsTileProps {
  todayCount: number;
}

const renderTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <span className="font-medium">{date}</span>
      <span className="ml-2">{count} reserveringen</span>
    </div>
  );
};

function CustomDot(props: any) {
  const { cx, cy, index } = props;
  if (index !== mockData.length - 1) return null;
  return <circle cx={cx} cy={cy} r={4} fill="#1d979e" stroke="#fff" strokeWidth={2} />;
}

const dayLabels = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'];

export function ReservationsTile({ todayCount }: ReservationsTileProps) {
  const navigate = useNavigate();
  const heroValue = todayCount > 0 ? String(todayCount) : '—';

  return (
    <NestoCard
      className="overflow-hidden !p-0 cursor-pointer group transition-shadow duration-200 hover:shadow-md"
      onClick={() => navigate('/reserveringen')}
    >
      <div className="px-6 pt-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Reserveringen</span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div className="px-6 mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-foreground">{heroValue}</span>
        <span className="text-sm text-muted-foreground">vandaag</span>
      </div>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={mockData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="reservationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d979e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1d979e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Tooltip content={renderTooltip} cursor={false} />
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
        <div className="flex px-2 pb-3 pt-1">
          <div className="w-1/2" />
          <div className="flex flex-1">
            {dayLabels.map((label, i) => (
              <span
                key={i}
                className="flex-1 text-center text-[11px]"
                style={i === 6 ? { color: '#1d979e', fontWeight: 600 } : { color: '#ACAEB3' }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </NestoCard>
  );
}
