import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { calculateFulfillmentTotals, calculateOrderTotals } from '../../utils/shopLogic.ts';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { translate } from '../../utils/translations.ts';
import type { FulfillmentType, PaymentStatus } from '../../types/index.ts';
import { X, CheckCircle2, QrCode, Banknote, CreditCard, ShieldCheck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderNumber: string, fulfillmentType: FulfillmentType, total: number) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { cart, appliedPromo, settings, discounts, createOrder, showToast, languagePreference, currentUser } = useStore();
  const t = (text: string) => translate(text, languagePreference);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ABA PayWay' | 'Card'>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || fulfillmentType !== 'in_store' || !currentUser) return;

    setCustomerName((name) => name || currentUser.name);
    setCustomerPhone((phone) => phone || currentUser.phone || '');
  }, [isOpen, fulfillmentType, currentUser]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totals = calculateOrderTotals(cart, appliedPromo, settings, discounts);
  const { deliveryFee, total } = calculateFulfillmentTotals(totals, fulfillmentType);

  const resetCheckoutForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerNotes('');
    setFulfillmentType('delivery');
    setPaymentMethod('COD');
  };

  const handleClose = () => {
    resetCheckoutForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (fulfillmentType === 'delivery' && !customerAddress.trim()) {
      showToast('Enter a delivery address to continue.', 'error');
      return;
    }
    const paymentStatus: PaymentStatus =
      paymentMethod !== 'COD' || fulfillmentType === 'in_store' ? 'Paid' : 'COD';

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    setIsSubmitting(true);
    try {
      const newOrder = await createOrder({
        customerId: currentUser?.firebaseUid || currentUser?.id,
        customerName,
        customerPhone,
        customerAddress: fulfillmentType === 'delivery' ? customerAddress : 'In-store purchase',
        fulfillmentType,
        customerNotes,
        items: orderItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee,
        total,
        paymentMethod,
        paymentStatus,
        promoCode: appliedPromo,
      });
      resetCheckoutForm();
      onSuccess(newOrder.orderNumber, fulfillmentType, newOrder.total);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not place your order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-[#fcf9f3] rounded-3xl max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 sm:p-8 relative shadow-2xl border border-[#e5e2dc]">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#f0eee8] text-[#817471] hover:text-[#1c1c18] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[#ab3425]" />
          <span className="text-xs font-bold text-[#ab3425] uppercase tracking-wider">
            {t('Secure Checkout')}
          </span>
        </div>
        <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl text-[#1c1c18] mb-6">
          {t('Complete Your Order')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-3">
            <h3 className="font-bold text-sm text-[#1c1c18]">{t('How would you like to receive your order?')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType('in_store')}
                className={`p-3 rounded-xl border font-bold ${
                  fulfillmentType === 'in_store'
                    ? 'border-[#ab3425] bg-[#ffdad4]/30 text-[#130805]'
                    : 'border-[#e5e2dc] text-[#4f4542]'
                }`}
              >
                {t('In-store purchase')}
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType('delivery')}
                className={`p-3 rounded-xl border font-bold ${
                  fulfillmentType === 'delivery'
                    ? 'border-[#ab3425] bg-[#ffdad4]/30 text-[#130805]'
                    : 'border-[#e5e2dc] text-[#4f4542]'
                }`}
              >
                {t('Delivery service')}
              </button>
            </div>
          </div>

          {/* Customer and delivery details */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-3">
            <h3 className="font-bold text-sm text-[#1c1c18]">
              {t(fulfillmentType === 'delivery' ? 'Delivery Details' : 'In-store Purchase Details')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Full Name')}</label>
                <input
                  required
                  type="text"
                  autoComplete="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs focus:outline-none focus:border-[#ab3425]"
                />
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Phone Number')}</label>
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs focus:outline-none focus:border-[#ab3425]"
                />
              </div>
            </div>

            {fulfillmentType === 'delivery' && (
              <>
                <div>
                  <label className="block text-[#4f4542] font-semibold mb-1">{t('Delivery Address')}</label>
                  <input
                    required
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder={t('Street address, building, unit')}
                    className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs focus:outline-none focus:border-[#ab3425]"
                  />
                </div>
                <div>
                  <label className="block text-[#4f4542] font-semibold mb-1">{t('Instructions for Courier')}</label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder={t('Gate code, building access, delivery notes')}
                    className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs focus:outline-none focus:border-[#ab3425]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-3">
            <h3 className="font-bold text-sm text-[#1c1c18]">{t('Payment Option')}</h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-[#ab3425] bg-[#ffdad4]/30 text-[#130805] font-bold'
                    : 'border-[#e5e2dc] hover:bg-[#f6f3ed] text-[#4f4542]'
                }`}
              >
                <Banknote className="w-5 h-5 text-[#ab3425]" />
                <span className="text-xs">
                  {t(fulfillmentType === 'in_store' ? 'Cash at store' : 'Cash on delivery')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ABA PayWay')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'ABA PayWay'
                    ? 'border-[#005f73] bg-[#005f73]/10 text-[#005f73] font-bold'
                    : 'border-[#e5e2dc] hover:bg-[#f6f3ed] text-[#4f4542]'
                }`}
              >
                <QrCode className="w-5 h-5 text-[#005f73]" />
                <span className="text-xs">{t('ABA PayWay')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  paymentMethod === 'Card'
                    ? 'border-[#130805] bg-[#130805]/10 text-[#130805] font-bold'
                    : 'border-[#e5e2dc] hover:bg-[#f6f3ed] text-[#4f4542]'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#130805]" />
                <span className="text-xs">{t('Credit Card')}</span>
              </button>
            </div>

            {/* ABA PayWay Interactive Mock QR view */}
            {paymentMethod === 'ABA PayWay' && (
              <div className="mt-3 p-3 bg-[#f6f3ed] rounded-xl border border-[#d2c3bf]/60 flex items-center gap-4">
                <div className="w-20 h-20 bg-white p-2 rounded-lg border border-[#e5e2dc] flex items-center justify-center shrink-0 shadow-xs">
                  {/* Stylized QR Code SVG */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="white" />
                    <rect x="10" y="10" width="30" height="30" fill="#005f73" />
                    <rect x="18" y="18" width="14" height="14" fill="white" />
                    <rect x="60" y="10" width="30" height="30" fill="#005f73" />
                    <rect x="68" y="18" width="14" height="14" fill="white" />
                    <rect x="10" y="60" width="30" height="30" fill="#005f73" />
                    <rect x="18" y="68" width="14" height="14" fill="white" />
                    <rect x="50" y="50" width="10" height="10" fill="#005f73" />
                    <rect x="65" y="65" width="20" height="20" fill="#005f73" />
                    <rect x="70" y="70" width="10" height="10" fill="white" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-[#005f73] block">{t('ABA KHQR PayWay Ready')}</span>
                  <p className="text-[11px] text-[#4f4542] mt-0.5">
                    Scan with ABA Mobile or any Bakong bank app to pay <strong>{formatCurrency(total, settings)}</strong> instantly.
                  </p>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                    ✓ Verified API Merchant Sandbox
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Total Breakdown */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-1.5">
            <div className="flex justify-between text-[#817471]">
              <span>{t('Items ({count})').replace('{count}', String(cart.length))}</span>
              <span>{formatCurrency(totals.subtotal, settings)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>{t('Discount')}</span>
                <span>-{formatCurrency(totals.discount, settings)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#817471]">
              <span>{t('Delivery Fee')}</span>
              <span>
                {fulfillmentType === 'in_store' ? t('Not applicable') : deliveryFee === 0 ? t('FREE') : formatCurrency(deliveryFee, settings)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[#1c1c18] pt-2 border-t border-[#f0eee8]">
              <span>{t('Total Payable')}</span>
              <span className="text-base text-[#ab3425]">{formatCurrency(total, settings)}</span>
            </div>
            <div className="pt-2 border-t border-[#f0eee8] space-y-1">
              <p className="font-bold text-[#1c1c18]">
                {t(fulfillmentType === 'in_store' ? 'Present these items at the store:' : 'Order items:')}
              </p>
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between text-[#4f4542]">
                  <span>{quantity} × {product.name}</span>
                  <span>{formatCurrency(product.price * quantity, settings)}</span>
                </div>
              ))}
              {fulfillmentType === 'in_store' && (
                <p className="pt-1 font-bold text-[#ab3425]">
                  {t('Pay {amount} at the store using your selected payment option.').replace('{amount}', formatCurrency(total, settings))}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#ab3425] hover:bg-[#8a1c10] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ab3425]/20 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>{t('Securing Order...')}</span>
            ) : (
              <span>
                {t(fulfillmentType === 'in_store' ? 'Place in-store order' : 'Place delivery order')} ({formatCurrency(total, settings)})
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
