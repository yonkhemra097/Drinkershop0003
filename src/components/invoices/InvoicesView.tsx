import React from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { translate } from '../../utils/translations.ts';
import { exportCsv } from '../../utils/exportCsv.ts';

export const InvoicesView: React.FC = () => {
  const {
    orders,
    currentUser,
    settings,
    languagePreference,
    setInvoiceReadiness,
    showToast,
  } = useStore();
  const t = (text: string) => translate(text, languagePreference);
  const canSeeAllInvoices =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager' ||
    currentUser?.role === 'staff';

  const visibleOrders = orders.filter((order) => {
    if (canSeeAllInvoices) return true;
    if (currentUser?.role === 'driver') return order.driverId === currentUser.id;
    if (currentUser?.role !== 'customer') return false;
    if (order.customerId) return order.customerId === currentUser.id;
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    return Boolean(
      currentUser.name.trim() &&
      order.customerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() &&
      currentUser.phone &&
      normalizePhone(order.customerPhone) === normalizePhone(currentUser.phone)
    );
  });

  const handleExport = () => {
    exportCsv(
      'invoices.csv',
      ['Invoice', 'Date', 'Customer', 'Phone', 'Address', 'Item', 'Quantity', 'Unit Price', 'Subtotal', 'Discount', 'Delivery Fee', 'Total', 'Payment Method', 'Payment Status', 'Order Status', 'Invoice Ready'],
      visibleOrders.flatMap((order) =>
        order.items.map((item) => [
          order.orderNumber,
          order.createdAt,
          order.customerName,
          order.customerPhone,
          order.customerAddress,
          item.productName,
          item.quantity,
          formatCurrency(item.price, settings),
          formatCurrency(order.subtotal, settings),
          formatCurrency(order.discount, settings),
          formatCurrency(order.deliveryFee, settings),
          formatCurrency(order.total, settings),
          order.paymentMethod,
          order.paymentStatus,
          order.status,
          order.invoiceReady ? 'Ready' : 'Not ready',
        ])
      )
    );
    showToast('Invoice CSV exported.', 'success');
  };

  const readyCount = visibleOrders.filter((order) => order.invoiceReady === true).length;
  const canManageReadiness = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  return (
    <section className="w-full space-y-4">
      <header className="bg-white p-4 rounded-2xl border border-[#e5e2dc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
            {t(canSeeAllInvoices ? 'All Invoices' : 'Invoices')}
          </h1>
          <p className="text-xs text-[#817471] mt-1">
            {canSeeAllInvoices
              ? t('Review invoices for all customer orders.')
              : currentUser?.role === 'driver'
                ? t('Invoices for your assigned deliveries.')
                : t('Invoices for your orders.')}
          </p>
        </div>
        {visibleOrders.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-[#f0eee8] text-[#1c1c18] text-xs font-bold hover:bg-[#ebe8e2]"
          >
            {t('Export Invoices')}
          </button>
        )}
      </header>

      {visibleOrders.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-[#e5e2dc]">
            <span className="text-xs text-[#817471]">{t('Ready invoices')}</span>
            <p className="mt-1 text-lg font-bold text-emerald-700">{readyCount}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#e5e2dc]">
            <span className="text-xs text-[#817471]">{t('Not ready invoices')}</span>
            <p className="mt-1 text-lg font-bold text-amber-800">{visibleOrders.length - readyCount}</p>
          </div>
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-[#e5e2dc] text-center text-sm text-[#817471]">
          {t('No invoices yet.')}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => {
            const isReady = order.invoiceReady === true;
            return (
              <article
                key={order.id}
                className="bg-white rounded-2xl border border-[#e5e2dc] shadow-xs overflow-hidden"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#f0eee8]">
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-[#1c1c18]">
                      {t('Invoice')} {order.orderNumber}
                    </h2>
                    <p className="text-xs text-[#817471] mt-1">
                      {t('Full name')}: {order.customerName} · {order.createdAt}
                    </p>
                    <p className="text-xs text-[#4f4542] mt-1">
                      {t('Phone Number')}: {order.customerPhone}
                    </p>
                    <p className="text-xs text-[#4f4542] mt-1 break-words">
                      {t('Delivery Address')}: {order.customerAddress}
                    </p>
                    <p className="text-xs text-[#4f4542] mt-1">
                      {t('Order status')}: {t(order.status)} · {t('Payment status')}: {t(order.paymentStatus)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isReady ? t('Ready') : t('Not ready')}
                    </span>
                    {canManageReadiness && (
                      <button
                        type="button"
                        onClick={() => setInvoiceReadiness(order.id, !isReady)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                          isReady ? 'bg-[#817471] hover:bg-[#655b58]' : 'bg-emerald-700 hover:bg-emerald-800'
                        }`}
                      >
                        {isReady ? t('Mark Not Ready') : t('Confirm Ready')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="divide-y divide-[#f0eee8]">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.productId}-${index}`}
                        className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1c1c18]">{item.productName}</p>
                          <p className="text-[#817471]">
                            {t('Quantity')}: {item.quantity} × {formatCurrency(item.price, settings)}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-[#1c1c18]">
                          {formatCurrency(item.quantity * item.price, settings)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#e5e2dc] space-y-1 text-xs">
                    <div className="flex justify-between text-[#4f4542]">
                      <span>{t('Subtotal')}</span>
                      <span>{formatCurrency(order.subtotal, settings)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-[#4f4542]">
                        <span>{t('Discount')}</span>
                        <span>-{formatCurrency(order.discount, settings)}</span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-[#4f4542]">
                        <span>{t('Delivery Fee')}</span>
                        <span>{formatCurrency(order.deliveryFee, settings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 font-bold text-sm text-[#1c1c18]">
                      <span>{t('Total')}</span>
                      <span>{formatCurrency(order.total, settings)}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
