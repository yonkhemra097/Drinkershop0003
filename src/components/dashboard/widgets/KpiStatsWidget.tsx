import React from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import { AlertTriangle, CheckCircle2, Clock, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency.ts';

export const KpiStatsWidget: React.FC = () => {
  const { orders, products, users, settings } = useStore();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const salesSince = (start: Date) =>
    orders.reduce((total, order) => {
      if (order.paymentStatus !== 'Paid' && order.paymentStatus !== 'COD') return total;
      const createdAt = Date.parse(order.createdAt);
      return Number.isFinite(createdAt) && createdAt >= start.getTime()
        ? total + order.total
        : total;
    }, 0);

  const pendingOrders = orders.filter(
    (order) => ['Pending', 'Paid', 'Preparing'].includes(order.status)
  ).length;
  const completedOrders = orders.filter((order) => order.status === 'Delivered').length;
  const totalCustomers = users.filter((user) => user.role === 'customer').length;
  const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Today', total: salesSince(todayStart) },
          { label: 'This Week', total: salesSince(weekStart) },
          { label: 'This Month', total: salesSince(monthStart) },
        ].map(({ label, total }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f7ddd6]">
              <DollarSign className="h-5 w-5 text-[#ab3425]" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-[#817471]">{label} Sales</span>
              <strong className="block truncate font-['Plus_Jakarta_Sans',sans-serif] text-lg text-[#1c1c18]">
                {formatCurrency(total, settings)}
              </strong>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-sm">
          <ShoppingBag className="h-5 w-5 text-[#4f4542]" />
          <div><span className="block text-xs text-[#817471]">Total Orders</span><strong>{orders.length.toLocaleString()}</strong></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#ffb4a8] bg-[#ffdad4]/30 p-4 shadow-sm">
          <Clock className="h-5 w-5 text-[#ab3425]" />
          <div><span className="block text-xs text-[#6d0300]">Pending Orders</span><strong className="text-[#ab3425]">{pendingOrders}</strong></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div><span className="block text-xs text-[#817471]">Completed</span><strong>{completedOrders.toLocaleString()}</strong></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-sm">
          <Users className="h-5 w-5 text-[#4f4542]" />
          <div><span className="block text-xs text-[#817471]">Customers</span><strong>{totalCustomers}</strong></div>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-[#ffdad6] bg-[#ffdad6]/40 p-4 shadow-sm md:col-span-4">
          <AlertTriangle className="h-5 w-5 text-[#ba1a1a]" />
          <div><span className="block text-xs font-bold text-[#93000a]">Needs Restock</span><strong className="text-[#ba1a1a]">{lowStockCount} Items</strong></div>
        </div>
      </div>
    </div>
  );
};
