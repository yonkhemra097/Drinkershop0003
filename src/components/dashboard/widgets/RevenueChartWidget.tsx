import React, { useMemo, useState } from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import { formatCurrency } from '../../../utils/formatCurrency.ts';
import { TrendingUp } from 'lucide-react';

type Timeframe = 'Week' | 'Month' | 'Year';

interface RevenueBucket {
  label: string;
  start: Date;
  end: Date;
  value: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const RevenueChartWidget: React.FC = () => {
  const { orders, settings } = useStore();
  const [timeframe, setTimeframe] = useState<Timeframe>('Week');
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const bars = useMemo(() => {
    const now = new Date();
    let buckets: RevenueBucket[];

    if (timeframe === 'Week') {
      const monday = startOfDay(now);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      buckets = Array.from({ length: 7 }, (_, index) => {
        const start = new Date(monday);
        start.setDate(start.getDate() + index);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return {
          label: start.toLocaleDateString(undefined, { weekday: 'short' }),
          start,
          end,
          value: 0,
        };
      });
    } else if (timeframe === 'Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      buckets = Array.from({ length: 5 }, (_, index) => {
        const start = new Date(monthStart);
        start.setDate(1 + index * 7);
        const end = new Date(monthStart);
        end.setDate(1 + (index + 1) * 7);
        return {
          label: `W${index + 1}`,
          start,
          end: end > new Date(now.getFullYear(), now.getMonth() + 1, 1)
            ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
            : end,
          value: 0,
        };
      });
    } else {
      buckets = Array.from({ length: 12 }, (_, index) => {
        const start = new Date(now.getFullYear(), index, 1);
        return {
          label: start.toLocaleDateString(undefined, { month: 'short' }),
          start,
          end: new Date(now.getFullYear(), index + 1, 1),
          value: 0,
        };
      });
    }

    for (const order of orders) {
      if (order.paymentStatus !== 'Paid' && order.paymentStatus !== 'COD') continue;
      const createdAt = Date.parse(order.createdAt);
      if (!Number.isFinite(createdAt)) continue;
      const bucket = buckets.find(
        (entry) => createdAt >= entry.start.getTime() && createdAt < entry.end.getTime()
      );
      if (bucket) bucket.value += order.total;
    }

    return buckets;
  }, [orders, timeframe]);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);
  const peak = bars.reduce<RevenueBucket | null>(
    (best, bar) => (bar.value > (best?.value ?? 0) ? bar : best),
    null
  );

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#e5e2dc] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#817471]">
            Performance
          </span>
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#1c1c18]">
            Sales & Revenue Trend
          </h3>
        </div>
        <div className="flex gap-1 rounded-xl bg-[#f0eee8] p-1">
          {(['Week', 'Month', 'Year'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTimeframe(option)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                timeframe === option ? 'bg-white text-[#130805] shadow-sm' : 'text-[#817471] hover:text-[#1c1c18]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex h-56 w-full items-end justify-between gap-2 border-b border-[#f0eee8] px-2 pb-2 pt-6">
        {bars.map((bar, index) => {
          const height = maxValue > 0 ? Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 4 : 0) : 0;
          return (
            <div
              key={bar.label}
              onMouseEnter={() => setActiveBar(index)}
              onMouseLeave={() => setActiveBar(null)}
              className="group relative z-10 flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end gap-1.5"
            >
              {activeBar === index && (
                <div className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-lg bg-[#130805] px-2.5 py-1 text-[11px] font-bold text-white shadow-xl">
                  {formatCurrency(bar.value, settings)}
                </div>
              )}
              <div
                className={`w-full rounded-t-xl transition-colors ${
                  peak === bar ? 'bg-[#ab3425]' : 'bg-[#ffb4a8]/50 group-hover:bg-[#ab3425]'
                }`}
                style={{ height: `${height}%` }}
                aria-label={`${bar.label}: ${formatCurrency(bar.value, settings)}`}
              />
              <span className={`text-xs ${peak === bar ? 'font-bold text-[#130805]' : 'text-[#817471]'}`}>
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col justify-between gap-2 pt-3 text-xs text-[#817471] sm:flex-row sm:items-center">
        {peak ? (
          <span>
            Peak: {peak.label} ({formatCurrency(peak.value, settings)})
          </span>
        ) : (
          <span>No paid orders recorded in this period.</span>
        )}
        {peak && (
          <span className="flex items-center font-bold text-[#ab3425]">
            <TrendingUp className="mr-1 h-4 w-4" /> Based on recorded orders
          </span>
        )}
      </div>
    </div>
  );
};
