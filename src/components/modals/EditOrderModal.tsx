import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { Order, OrderStatus, PaymentStatus } from '../../types/index.ts';
import { X, Save, Truck, User } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.ts';

interface EditOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  const { updateOrderDetails, users, settings } = useStore();

  const [status, setStatus] = useState<OrderStatus>('Preparing');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [driverId, setDriverId] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  const drivers = users.filter((u) => u.role === 'driver');

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setDriverId(order.driverId || '');
      setCustomerNotes(order.customerNotes || '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDriver = drivers.find((d) => d.id === driverId);

    updateOrderDetails(order.id, {
      status,
      paymentStatus,
      driverId: driverId || undefined,
      driverName: selectedDriver ? selectedDriver.name : undefined,
      customerNotes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#fcf9f3] rounded-3xl max-w-lg w-full p-6 sm:p-7 relative shadow-2xl border border-[#e5e2dc]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#817471] hover:text-[#1c1c18]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold bg-[#ffdad4] text-[#ab3425] px-2 py-0.5 rounded">
            {order.orderNumber}
          </span>
          <span className="text-xs text-[#817471]">• {order.createdAt}</span>
        </div>
        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18] mb-1">
          Edit Order & Delivery Dispatch
        </h3>
        <p className="text-xs text-[#817471] mb-5">
          Customer: <strong>{order.customerName}</strong> ({order.customerPhone})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Order Items Preview */}
          <div className="p-3 bg-white rounded-xl border border-[#e5e2dc] space-y-1">
            <span className="text-[10px] text-[#817471] uppercase font-bold tracking-wider block mb-1">
              Items in Order
            </span>
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between">
                <span>{it.quantity}x {it.productName}</span>
                <span className="font-bold">{formatCurrency(it.price * it.quantity, settings)}</span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-[#f0eee8] flex justify-between font-bold text-[#1c1c18]">
              <span>Total Bill</span>
              <span className="text-[#ab3425]">{formatCurrency(order.total, settings)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Fulfillment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs font-bold focus:outline-none focus:border-[#ab3425]"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid (Incoming)</option>
                <option value="Preparing">Preparing in Kitchen</option>
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="On the Way">On the Way (Courier)</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed Delivery</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs font-bold focus:outline-none focus:border-[#ab3425]"
              >
                <option value="Paid">Paid</option>
                <option value="COD">Cash on Delivery (Pending)</option>
                <option value="Pending">Pending Verification</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#4f4542] font-semibold mb-1">Assign Driver / Courier</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
            >
              <option value="">-- Unassigned (Station Pickup) --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.assignment || 'Courier'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#4f4542] font-semibold mb-1">Customer / Staff Notes</label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
            />
          </div>

          <div className="pt-3 border-t border-[#e5e2dc] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#1c1c18] font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#ab3425] hover:bg-[#8a1c10] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Update Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
