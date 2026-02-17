import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { NestoCard } from '@/components/polar/NestoCard';
import type { DayGuestCount } from '@/hooks/useWeeklyGuestCounts';

interface ReservationsTileProps {
  todayGuests: number;
  weeklyData: DayGuestCount[];
}

const renderTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg">
      <span className="font-medium">{date}</span>
      <span className="ml-2">{count} gasten</span>
    </div>
  );
};

export function ReservationsTile({ todayGuests, weeklyData }: ReservationsTileProps) {
  const navigate = useNavigate();
  const heroValue = todayGuests > 0 ? String(todayGuests) : '—';
  const chartData = weeklyData.length > 0 ? weeklyData : [];

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
        <span className="text-sm text-muted-foreground">gasten vandaag</span>
      </div>
      <div className="mt-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={164}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 20, left: 12 }}>
              <defs>
                <linearGradient id="reservationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                padding={{ left: 8, right: 8 }}
                allowDuplicatedCategory={true}
                axisLine={false}
                tickLine={false}
                tick={({ x, y, index }: any) => {
                  const isLast = index === chartData.length - 1;
                  return (
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fill={isLast ? 'hsl(183,70%,37%)' : 'hsl(220,4%,68%)'}
                      fontWeight={isLast ? 600 : 400}
                    >
                      {chartData[index]?.day}
                    </text>
                  );
                }}
              />
              <Tooltip content={renderTooltip} cursor={false} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(183,70%,37%)"
                strokeWidth={2}
                fill="url(#reservationGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(183,70%,37%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[164px]" />
        )}
      </div>
    </NestoCard>
  );
}
