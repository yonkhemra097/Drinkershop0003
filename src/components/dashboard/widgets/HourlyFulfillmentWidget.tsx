import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../../../context/StoreContext.tsx';

export const HourlyFulfillmentWidget: React.FC = () => {
  const [mode, setMode] = useState<'Hourly' | 'Daily'>('Hourly');
  const { orders } = useStore();
  const bars = useMemo(() => {
    const now = new Date();
    const buckets = mode === 'Hourly'
      ? Array.from({ length: 6 }, (_, index) => {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), index * 4);
          const end = new Date(start);
          end.setHours(end.getHours() + 4);
          return {
            label: `${String(start.getHours()).padStart(2, '0')}:00`,
            start,
            end,
            orders: 0,
          };
        })
      : Array.from({ length: 7 }, (_, index) => {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
          const end = new Date(start);
          end.setDate(end.getDate() + 1);
          return {
            label: start.toLocaleDateString(undefined, { weekday: 'short' }),
            start,
            end,
            orders: 0,
          };
        });

    for (const order of orders) {
      const timestamp = Date.parse(order.createdAt);
      if (!Number.isFinite(timestamp)) continue;
      const bucket = buckets.find((entry) => timestamp >= entry.start.getTime() && timestamp < entry.end.getTime());
      if (bucket) bucket.orders += 1;
    }
    return buckets;
  }, [mode, orders]);
  const maxOrders = Math.max(...bars.map((bar) => bar.orders), 0);

  return (
    <section className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e2dc] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wider text-[#ab3425]">
            Order Activity
          </span>
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#1c1c18]">
            Fulfillment Flow
          </h3>
        </div>
        <div className="flex gap-1 rounded-xl bg-[#f0eee8] p-1 text-xs">
          {(['Hourly', 'Daily'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-lg px-3 py-1 font-bold transition-all ${
                mode === item ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="my-5 flex h-36 items-end justify-between gap-2 px-2 sm:px-4">
        {bars.map((bar) => (
          <div key={bar.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="relative w-full rounded-t-xl bg-[#ab3425]/70 transition-colors group-hover:bg-[#ab3425]"
              style={{ height: `${maxOrders ? Math.max((bar.orders / maxOrders) * 100, bar.orders ? 4 : 0) : 0}%` }}
              title={`${bar.orders} orders`}
            />
            <span className="text-[11px] font-semibold text-[#817471]">{bar.label}</span>
            <span className="text-[10px] text-[#817471]">{bar.orders}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t border-[#f0eee8] pt-3 text-xs text-[#817471]">
        <Info className="h-4 w-4 shrink-0" />
        <span>{maxOrders ? 'Counts are from recorded orders.' : 'No orders recorded for this period.'}</span>
      </div>
    </section>
  );
};
