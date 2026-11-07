import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { OrderStatus } from '../../types/index.ts';
import {
  Truck,
  Phone,
  Navigation,
  CheckCircle,
  AlertTriangle,
  X,
  FileWarning,
} from 'lucide-react';
import { CourierMapWidget } from '../dashboard/widgets/CourierMapWidget.tsx';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { translate } from '../../utils/translations.ts';

export const DriverDeliveries: React.FC = () => {
  const { orders, updateOrderStatus, updateOrderPaymentStatus, showToast, settings, languagePreference } = useStore();
  const t = (text: string) => translate(text, languagePreference);

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentOrderNum, setIncidentOrderNum] = useState('');
  const [incidentReason, setIncidentReason] = useState('Customer unreachable / no answer');
  const [incidentNotes, setIncidentNotes] = useState('');

  // Assigned stops
  const assignedOrders = orders.filter(
    (o) => (o.fulfillmentType ?? 'delivery') === 'delivery' && (
      o.status === 'On the Way' ||
      o.status === 'Ready for Pickup' ||
      o.status === 'Delivered' ||
      o.status === 'Paid'
    )
  );
  const pendingCount = assignedOrders.filter((order) => order.status !== 'Delivered').length;
  const completedCount = assignedOrders.filter((order) => order.status === 'Delivered').length;
  const codToCollect = assignedOrders
    .filter((order) => order.paymentMethod === 'COD' && order.paymentStatus === 'COD')
    .reduce((total, order) => total + order.total, 0);

  const filteredOrders = assignedOrders.filter((o) => {
    if (activeFilter === 'completed') return o.status === 'Delivered';
    if (activeFilter === 'pending') return o.status !== 'Delivered';
    return true;
  });

  const handleCompleteDelivery = (orderId: string, orderNumber: string) => {
    updateOrderStatus(orderId, 'Delivered');
    updateOrderPaymentStatus(orderId, 'Paid');
    showToast(`Order ${orderNumber} marked Delivered! COD reconciled.`);
  };

  const handleStartTrip = (orderId: string) => {
    updateOrderStatus(orderId, 'On the Way');
    showToast('Delivery status updated.');
  };

  const handleAcceptPickup = (orderId: string) => {
    updateOrderStatus(orderId, 'Ready for Pickup');
    showToast('Package picked up from kitchen staging.');
  };

  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Incident reported for ${incidentOrderNum}: ${incidentReason}`, 'warning');
    setShowIncidentModal(false);
    setIncidentNotes('');
  };

  return (
    <div className="w-full space-y-8">
      {/* Top Banner / Courier Operations (Matching Image 7) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#817471] block">
            Courier Operations
          </span>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl sm:text-4xl text-[#1c1c18] mt-1">
            Assigned Deliveries
          </h1>
        </div>

        <span className="rounded-xl border border-[#e5e2dc] bg-white px-3.5 py-2 text-xs font-semibold text-[#4f4542]">
          {assignedOrders.length} delivery orders
        </span>
      </div>

      {/* Shift Overview & Live Map (2-column layout matching Image 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shift Overview Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#817471] block mb-1">
              Shift Overview
            </span>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl text-[#1c1c18]">
              Delivery Summary
            </h2>

            <div className="mt-5 space-y-3">
              <div className="p-3 bg-[#f6f3ed] rounded-2xl flex items-center justify-between">
                <span className="text-xs text-[#817471]">Assigned Stops</span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
                  {assignedOrders.length} Orders
                </span>
              </div>

              <div className="p-3 bg-[#f6f3ed] rounded-2xl flex items-center justify-between">
                <span className="text-xs text-[#817471]">COD to Collect</span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#ab3425]">
                  {formatCurrency(codToCollect, settings)}
                </span>
              </div>

              <div className="p-3 bg-[#f6f3ed] rounded-2xl flex items-center justify-between">
                <span className="text-xs text-[#817471]">Completed</span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-emerald-700">
                  {completedCount} / {assignedOrders.length}
                </span>
              </div>
            </div>
          </div>

          <p className="rounded-2xl border border-[#e5e2dc] bg-[#f6f3ed] p-4 text-xs text-[#4f4542]">
            Delivery orders use the customer-provided address. The app does not collect live location.
          </p>
        </div>

        {/* Right Column: Store Location Map */}
        <div className="lg:col-span-2">
          <CourierMapWidget />
        </div>
      </div>

      {/* Assigned Deliveries Queue (Matching Image 7) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
            Assigned Deliveries Queue
          </h2>

          <div className="flex gap-1 bg-[#f0eee8] p-1 rounded-xl text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeFilter === 'all' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
              }`}
            >
              All ({assignedOrders.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeFilter === 'pending' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeFilter === 'completed' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>

        {/* Cards Queue List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d2c3bf] bg-white p-6 text-center text-sm text-[#817471]">
              No delivery orders match this filter.
            </p>
          ) : filteredOrders.map((order, idx) => {
            const isCompleted = order.status === 'Delivered';
            const isOnTheWay = order.status === 'On the Way';
            const isPickedUp = order.status === 'Ready for Pickup';
            const phoneNumber = order.customerPhone.replace(/[^\d+]/g, '');
            const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerAddress)}&travelmode=driving`;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-[#e5e2dc] shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#ffdad4] text-[#ab3425] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm flex items-center justify-center shrink-0">
                      #{String(idx + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
                          {order.customerName}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOnTheWay
                              ? 'bg-[#ffdad4] text-[#ab3425]'
                              : 'bg-[#ffe08f] text-[#584400]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <span className="text-xs text-[#817471]">
                        {t('Full name')}: {order.customerName} · {t('Phone Number')}:{' '}
                        {order.customerPhone ? (
                          <a
                            href={`tel:${order.customerPhone.replace(/[^\d+]/g, '')}`}
                            className="font-semibold text-[#1c1c18] hover:underline"
                          >
                            {order.customerPhone}
                          </a>
                        ) : (
                          t('Not provided')
                        )}
                        {' · '}Order ID: {order.orderNumber} • {order.items.length} items ({formatCurrency(order.total, settings)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {phoneNumber ? (
                      <a
                        href={`tel:${phoneNumber}`}
                        className="p-2 rounded-xl bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#1c1c18] transition-colors"
                        title={`Call ${order.customerName}`}
                        aria-label={`Call ${order.customerName}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="p-2 rounded-xl bg-[#f0eee8] text-[#817471] opacity-50 cursor-not-allowed"
                        title="Customer phone number unavailable"
                        aria-label="Customer phone number unavailable"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#1c1c18] transition-colors"
                      title="Open destination in Google Maps"
                      aria-label="Open destination in Google Maps"
                    >
                      <Navigation className="w-4 h-4 text-[#2563eb]" />
                    </a>
                  </div>
                </div>

                {/* Address & Note Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#f6f3ed] p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] text-[#817471] uppercase tracking-wider font-bold block mb-1">
                      Delivery Address
                    </span>
                    <p className="font-bold text-[#1c1c18]">{order.customerAddress}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#817471] uppercase tracking-wider font-bold block mb-1">
                      Delivery Notes
                    </span>
                    <p className="text-[#4f4542]">
                      "{order.customerNotes || 'No special instructions. Call upon arrival.'}"
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#817471] uppercase tracking-wider font-bold block mb-1">
                      COD Collection
                    </span>
                    <p className="font-bold text-[#ab3425] text-sm">
                      {formatCurrency(order.total, settings)} ({order.paymentMethod === 'COD' ? 'Cash Only' : 'Prepaid'})
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#817471]">Update Status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className="p-1.5 rounded-lg border border-[#d2c3bf] bg-white text-xs font-semibold"
                    >
                      <option value="Ready for Pickup">Picked Up</option>
                      <option value="On the Way">On the Way</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIncidentOrderNum(order.orderNumber);
                        setShowIncidentModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#4f4542] text-xs font-bold transition-colors"
                    >
                      Report Issue
                    </button>

                    {isOnTheWay && (
                      <button
                        onClick={() => handleCompleteDelivery(order.id, order.orderNumber)}
                        className="px-5 py-2 rounded-xl bg-[#ab3425] hover:bg-[#8a1c10] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        Complete Delivery
                      </button>
                    )}

                    {isPickedUp && (
                      <button
                        onClick={() => handleStartTrip(order.id)}
                        className="px-5 py-2 rounded-xl bg-[#130805] hover:bg-[#2c1e1a] text-white text-xs font-bold transition-all shadow-md"
                      >
                        Start Trip
                      </button>
                    )}

                    {order.status === 'Paid' && (
                      <button
                        onClick={() => handleAcceptPickup(order.id)}
                        className="px-5 py-2 rounded-xl bg-[#130805] hover:bg-[#2c1e1a] text-white text-xs font-bold transition-all shadow-md"
                      >
                        Accept & Pick Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident / Failure Callout Banner (Image 7) */}
      <div className="bg-[#ffdad6]/30 p-6 rounded-3xl border-2 border-[#ffdad6] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ba1a1a] text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
              Encountering Delivery Failure?
            </h3>
            <p className="text-xs text-[#4f4542] mt-0.5">
              Log failed delivery reasons instantly for dispatcher review (e.g. customer unreachable, incorrect address).
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowIncidentModal(true)}
          className="px-5 py-2.5 bg-white hover:bg-[#f6f3ed] text-[#1c1c18] font-bold text-xs rounded-xl shadow-xs border border-[#d2c3bf] transition-colors shrink-0"
        >
          Open Incident Form
        </button>
      </div>

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-[#e5e2dc] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18] flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-[#ba1a1a]" />
                <span>Log Delivery Failure</span>
              </h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="p-1 rounded-full text-[#817471] hover:text-[#1c1c18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">Order Affected</label>
                <input
                  type="text"
                  value={incidentOrderNum}
                  onChange={(e) => setIncidentOrderNum(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#f6f3ed] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">Reason for Failure</label>
                <select
                  value={incidentReason}
                  onChange={(e) => setIncidentReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#f6f3ed] text-xs font-semibold"
                >
                  <option value="Customer unreachable / no answer">Customer unreachable / no answer</option>
                  <option value="Incorrect or incomplete street address">Incorrect or incomplete street address</option>
                  <option value="Customer refused package / cancelled">Customer refused package / cancelled</option>
                  <option value="Vehicle breakdown or accident">Vehicle breakdown or accident</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">Driver Field Notes</label>
                <textarea
                  rows={3}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="Tried calling 3 times, knocked on door, waited 10 mins..."
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#f6f3ed] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f0eee8]">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4f4542] hover:bg-[#f0eee8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold shadow-md transition-colors"
                >
                  Notify Dispatcher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
