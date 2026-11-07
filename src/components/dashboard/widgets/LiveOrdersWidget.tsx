import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import type { Order, OrderStatus } from '../../../types/index.ts';
import { formatCurrency } from '../../../utils/formatCurrency.ts';
import { ChefHat, Truck, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface LiveOrdersWidgetProps {
  onEditOrder?: (order: Order) => void;
}

export const LiveOrdersWidget: React.FC<LiveOrdersWidgetProps> = ({ onEditOrder }) => {
  const { orders, updateOrderStatus, setCurrentView, settings } = useStore();
  const [filter, setFilter] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    return o.status.toLowerCase() === filter.toLowerCase();
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Preparing':
        return (
          <span className="bg-[#f7ddd6] text-[#261814] px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
            <ChefHat className="w-3 h-3 text-[#ab3425]" /> Preparing
          </span>
        );
      case 'On the Way':
        return (
          <span className="bg-[#ffe08f] text-[#584400] px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
            <Truck className="w-3 h-3 text-[#755b00]" /> On the Way
          </span>
        );
      case 'Delivered':
        return (
          <span className="bg-[#e5e2dc] text-[#4f4542] px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
            <CheckCheck className="w-3 h-3 text-emerald-600" /> Delivered
          </span>
        );
      case 'Ready for Pickup':
        return (
          <span className="bg-[#f0eee8] text-[#130805] px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
            <Clock className="w-3 h-3 text-[#ab3425]" /> Ready for Pickup
          </span>
        );
      case 'Failed':
        return (
          <span className="bg-[#ffdad6] text-[#ba1a1a] px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-[#f0eee8] text-[#4f4542] px-2.5 py-1 rounded-full text-[11px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <span className="text-[11px] text-[#817471] uppercase tracking-wider font-semibold">
              Live Activity
            </span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
              Recent Orders Feed
            </h3>
          </div>
          <button
            onClick={() => setCurrentView('admin')}
            className="text-xs text-[#ab3425] font-bold hover:underline self-start sm:self-auto"
          >
            Manage Full Orders →
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-xs">
          {['all', 'preparing', 'on the way', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-[#130805] text-white'
                  : 'bg-[#f0eee8] text-[#4f4542] hover:bg-[#ebe8e2]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="text-[11px] text-[#817471] border-b border-[#f0eee8] pb-2 font-semibold uppercase">
                <th className="pb-2">Order ID</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Payment</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#f6f3ed]">
              {filteredOrders.slice(0, 5).map((order) => {
                const totalItemsCount = order.items.reduce((s, it) => s + it.quantity, 0);
                return (
                  <tr key={order.id} className="hover:bg-[#f6f3ed]/60 transition-colors group">
                    <td className="py-3 font-mono font-bold text-[#1c1c18]">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 text-[#4f4542] font-medium">
                      {order.customerName}
                    </td>
                    <td className="py-3 text-[#817471]">
                      {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 font-bold text-[#1c1c18]">
                      {formatCurrency(order.total, settings)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3">{getStatusBadge(order.status)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          if (onEditOrder) {
                            onEditOrder(order);
                          } else {
                            // Cycle next status
                            const next: Record<OrderStatus, OrderStatus> = {
                              Pending: 'Preparing',
                              Paid: 'Preparing',
                              Preparing: 'Ready for Pickup',
                              'Ready for Pickup': 'On the Way',
                              'On the Way': 'Delivered',
                              Delivered: 'Delivered',
                              Failed: 'Preparing',
                              Cancelled: 'Pending',
                            };
                            updateOrderStatus(order.id, next[order.status] || 'Preparing');
                          }
                        }}
                        className="px-2 py-1 bg-[#f0eee8] hover:bg-[#ab3425] hover:text-white rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
