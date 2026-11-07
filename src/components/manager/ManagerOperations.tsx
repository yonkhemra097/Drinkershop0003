import React from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import {
  ShieldAlert,
  Package,
  AlertOctagon,
  Truck,
  CheckCircle,
  FileCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { HourlyFulfillmentWidget } from '../dashboard/widgets/HourlyFulfillmentWidget.tsx';
import { DiscountManagement } from '../admin/DiscountManagement.tsx';
import { formatCurrency } from '../../utils/formatCurrency.ts';

export const ManagerOperations: React.FC = () => {
  const {
    stockRequests,
    approveStockRequest,
    denyStockRequest,
    bottlenecks,
    resolveBottleneck,
    users,
    orders,
    toggleClockIn,
    showToast,
    setCurrentView,
    settings,
  } = useStore();

  const operationalUsers = users.filter(
    (user) => user.role === 'manager' || user.role === 'staff' || user.role === 'driver'
  );
  const onDutyCount = operationalUsers.filter(
    (user) => user.shiftStatus === 'clocked_in' || user.shiftStatus === 'on_delivery'
  ).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysRevenue = orders
    .filter((order) => {
      const createdAt = Date.parse(order.createdAt);
      return (
        Number.isFinite(createdAt) &&
        createdAt >= todayStart.getTime() &&
        (order.paymentStatus === 'Paid' || order.paymentStatus === 'COD')
      );
    })
    .reduce((total, order) => total + order.total, 0);

  return (
    <div className="w-full space-y-8">
      {/* Top Banner / Headline Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-[#ab3425] text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>Operations Control Center</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl sm:text-4xl text-[#1c1c18]">
            Store Operations & Supervision
          </h1>
        </div>

        <span className="rounded-xl border border-[#e5e2dc] bg-white px-3.5 py-2 text-xs font-semibold text-[#4f4542]">
          Operations overview
        </span>
      </div>

      {/* Key Metrics Row (Bento 4 items matching Image 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#f6f3ed] p-5 rounded-2xl shadow-xs border border-[#e5e2dc] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#817471] block mb-1">
              Active Staff & Drivers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-3xl text-[#1c1c18]">{operationalUsers.length}</span>
              <span className="text-xs text-[#ab3425] font-bold">{onDutyCount} on duty</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e5e2dc] flex items-center justify-between text-xs text-[#4f4542]">
            <span>On duty</span>
            <span className="font-bold text-[#1c1c18]">{onDutyCount} / {operationalUsers.length}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#f6f3ed] p-5 rounded-2xl shadow-xs border border-[#e5e2dc] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#817471] block mb-1">
              Pending Stock Adjustments
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-3xl text-[#1c1c18]">
                {stockRequests.filter((r) => r.status === 'pending').length}
              </span>
              <span className="text-xs text-[#755b00] font-bold">Needs review</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e5e2dc] flex items-center justify-between text-xs text-[#4f4542]">
            <span>Requests awaiting review</span>
            <span className="font-bold text-[#1c1c18]">{stockRequests.filter((r) => r.status === 'pending').length}</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#f6f3ed] p-5 rounded-2xl shadow-xs border border-[#e5e2dc] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#817471] block mb-1">
              Delivery Bottlenecks
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-3xl text-[#ab3425]">
                {bottlenecks.length}
              </span>
              <span className="text-xs text-[#817471]">Current reports</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e5e2dc] flex items-center justify-between text-xs text-[#4f4542]">
            <span>Active delivery orders</span>
            <span className="font-bold text-[#1c1c18]">{orders.filter((order) => order.fulfillmentType === 'delivery' && order.status !== 'Delivered' && order.status !== 'Cancelled').length}</span>
          </div>
        </div>

        {/* Card 4: Daily Revenue Target */}
        <div className="bg-[#130805] text-white p-5 rounded-2xl shadow-md border border-[#2c1e1a] flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#dac1bb] block mb-1">
              Today's Revenue
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-3xl text-white">
                {formatCurrency(todaysRevenue, settings)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[#dac1bb] mb-1">
              <span>From recorded orders</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-[#fc6f5a] h-full rounded-full" style={{ width: todaysRevenue > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      <DiscountManagement />

      {/* Main Grid: Supervision & Attendance (Matching Image 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stock Requests & Bottlenecks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory Supervision & Stock Corrections */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e2dc]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18]">
                  Inventory Supervision & Requests
                </h2>
                <p className="text-xs text-[#817471]">
                  Review and authorize stock corrections, waste logs, and emergency replenishments.
                </p>
              </div>
              <span className="text-xs text-[#ab3425] font-bold">
                {stockRequests.filter((r) => r.status === 'pending').length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {stockRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#f6f3ed] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#e5e2dc]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f0eee8] text-[#755b00] flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1c1c18]">{req.productName}</h4>
                      <p className="text-[11px] text-[#817471]">{req.reason}</p>
                    </div>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => denyStockRequest(req.id)}
                        className="px-3 py-1.5 bg-[#ebe8e2] text-[#ba1a1a] hover:bg-[#ffdad6] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Deny
                      </button>
                      <button
                        onClick={() => approveStockRequest(req.id)}
                        className="px-3 py-1.5 bg-[#130805] text-white hover:bg-[#2c1e1a] rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize self-end sm:self-auto ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}
                    >
                      {req.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Supervision & Bottlenecks */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e2dc]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18]">
                  Fulfillment Supervision & Bottlenecks
                </h2>
                <p className="text-xs text-[#817471]">
                  Real-time alerts on order preparation delays and delivery dispatch blockages.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-xs font-bold">
                {bottlenecks.length} Active Bottlenecks
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {bottlenecks.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#f6f3ed] p-3.5 rounded-2xl border-l-4 border-l-[#ab3425] border border-[#e5e2dc] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1 text-[11px]">
                      <span className="font-bold text-[#ab3425] uppercase">{b.station}</span>
                      <span className="font-mono text-[#817471]">{b.orderNumber}</span>
                    </div>
                    <h4 className="font-bold text-xs text-[#1c1c18] mb-1">{b.title}</h4>
                    <p className="text-[11px] text-[#4f4542] line-clamp-3 mb-2">{b.description}</p>
                  </div>
                  <button
                    onClick={() => resolveBottleneck(b.id)}
                    className="w-full mt-2 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-xs font-bold rounded-xl text-emerald-700 transition-colors border border-[#d2c3bf]/50"
                  >
                    Clear Blockage
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Staff & Driver Attendance Roster */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18]">
                Staff & Drivers
              </h2>
              <span className="text-xs text-[#817471]">28 On Duty</span>
            </div>
            <p className="text-xs text-[#817471] mb-4">
              Real-time attendance roster and shift status tracking.
            </p>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {users
                .filter((u) => u.role !== 'customer')
                .map((u) => {
                  const isClockedIn = u.shiftStatus === 'clocked_in' || u.shiftStatus === 'on_delivery';
                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-[#f6f3ed] rounded-2xl flex items-center justify-between border border-[#e5e2dc]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#130805] text-white flex items-center justify-center font-bold text-xs">
                          {u.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#1c1c18]">{u.name}</div>
                          <div className="text-[10px] text-[#817471]">{u.assignment || u.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            u.shiftStatus === 'on_delivery'
                              ? 'bg-[#ab3425]'
                              : isClockedIn
                              ? 'bg-emerald-500'
                              : 'bg-zinc-400'
                          }`}
                          title={u.shiftStatus}
                        />
                        <button
                          onClick={() => toggleClockIn(u.id)}
                          className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-[#ebe8e2] rounded-lg border border-[#d2c3bf]/50"
                        >
                          {isClockedIn ? 'Clock Out' : 'Clock In'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#f0eee8] flex justify-between items-center text-xs">
            <span className="text-[#817471]">Attendance Discrepancies: 0</span>
            <button
              onClick={() => showToast('Staff shift roster synced with HR calendar.')}
              className="text-[#ab3425] font-bold hover:underline flex items-center gap-1"
            >
              <span>Manage Schedule</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Daily Operational Summary & Hourly Fulfillment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Summary Metrics */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18] mb-1">
              Daily Operational Summary
            </h3>
            <p className="text-xs text-[#817471] mb-5">
              Key performance metrics across store packing and dispatch workflows.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-[#4f4542]">
                  <span>Order Accuracy Rate</span>
                  <span className="font-bold text-[#1c1c18]">99.2%</span>
                </div>
                <div className="w-full bg-[#f0eee8] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#130805] h-full rounded-full" style={{ width: '99.2%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[#4f4542]">
                  <span>On-Time Dispatch SLA</span>
                  <span className="font-bold text-[#1c1c18]">94.8%</span>
                </div>
                <div className="w-full bg-[#f0eee8] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#fc6f5a] h-full rounded-full" style={{ width: '94.8%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[#4f4542]">
                  <span>Inventory Audit Compliance</span>
                  <span className="font-bold text-[#1c1c18]">98.0%</span>
                </div>
                <div className="w-full bg-[#f0eee8] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#c9a84c] h-full rounded-full" style={{ width: '98.0%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-[#f6f3ed] p-3.5 rounded-2xl flex items-center justify-between border border-[#e5e2dc]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1c1c18]">
              <FileCheck className="w-4 h-4 text-[#ab3425]" />
              <span>Shift Sign-Off Ready</span>
            </div>
            <span className="text-[11px] text-[#817471] font-medium">Due at 22:00</span>
          </div>
        </div>

        {/* Visual Banner / Hourly Fulfillment Graph */}
        <div className="lg:col-span-2">
          <HourlyFulfillmentWidget />
        </div>
      </div>
    </div>
  );
};
