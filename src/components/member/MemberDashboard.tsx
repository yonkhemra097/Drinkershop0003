import React from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { Award, RotateCcw, ShoppingBag } from 'lucide-react';

interface MemberDashboardProps {
  isManagementView?: boolean;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ isManagementView = false }) => {
  const { currentUser, orders, products, memberPoints, addToCart, showToast, settings } = useStore();
  const memberOrders = orders
    .filter((order) => order.customerId === currentUser?.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const handleReorder = (orderId: string) => {
    const order = memberOrders.find((entry) => entry.id === orderId);
    if (!order) return;

    const productById = new Map(products.map((product) => [product.id, product]));
    const unavailable = order.items.filter((item) => !productById.has(item.productId));
    if (unavailable.length) {
      showToast('Some items from this order are no longer available.', 'warning');
    }
    for (const item of order.items) {
      const product = productById.get(item.productId);
      if (product) addToCart(product, item.quantity);
    }
    if (order.items.every((item) => productById.has(item.productId))) {
      showToast('Order items added to your cart.');
    }
  };

  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-[#e5e2dc] bg-[#f6f3ed] p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#ab3425]">
            Member Dashboard
          </span>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-bold text-[#130805]">
            Welcome, {currentUser?.name ?? 'Member'}
          </h1>
          <p className="mt-1 text-sm text-[#4f4542]">Your real order history and rewards summary.</p>
          {currentUser?.createdAt && Number.isFinite(Date.parse(currentUser.createdAt)) && (
            <p className="mt-1 text-xs text-[#817471]">
              {currentUser.createdByAdmin ? 'Account created by the store administrator' : 'Member since'}
              {' · '}{new Date(currentUser.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4 shadow-sm">
          <Award className="h-7 w-7 text-[#ab3425]" />
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#817471]">Points</span>
            <strong className="text-xl text-[#130805]">{memberPoints}</strong>
          </div>
        </div>
      </section>

      {isManagementView && (
        <p className="rounded-xl border border-[#e5e2dc] bg-white px-4 py-3 text-xs text-[#4f4542]">
          Management view: member order actions are read-only.
        </p>
      )}

      <section className="space-y-4">
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-[#ab3425]">
            Order History
          </span>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-[#130805]">
            Your Orders
          </h2>
        </div>

        {memberOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#d2c3bf] bg-white p-8 text-center text-sm text-[#817471]">
            <ShoppingBag className="h-6 w-6" />
            <p>No orders are linked to this account yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberOrders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e5e2dc] bg-white p-5 shadow-sm md:flex-row md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-[#130805]">{order.orderNumber}</h3>
                    <span className="rounded-full bg-[#f0eee8] px-2.5 py-0.5 text-[10px] font-bold text-[#4f4542]">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#4f4542]">
                    {order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}
                  </p>
                  <p className="mt-1 text-[11px] text-[#817471]">
                    {Number.isFinite(Date.parse(order.createdAt))
                      ? new Date(order.createdAt).toLocaleString()
                      : 'Date unavailable'}
                    {' · '}{formatCurrency(order.total, settings)}
                  </p>
                </div>
                {!isManagementView && (
                  <button
                    type="button"
                    onClick={() => handleReorder(order.id)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ab3425] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#8a1c10]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reorder
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
