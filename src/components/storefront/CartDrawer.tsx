import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { calculateOrderTotals, isPromoCodeValid } from '../../utils/shopLogic.ts';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { translate } from '../../utils/translations.ts';
import { areFirebaseFunctionsEnabled } from '../../utils/firebaseFunctions.ts';
import { isFirebaseConfigured } from '../../utils/firestoreData.ts';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const { cart, updateCartQuantity, removeFromCart, appliedPromo, setAppliedPromo, settings, discounts, showToast, languagePreference } = useStore();
  const [promoInput, setPromoInput] = useState<string>('');
  const t = (text: string) => translate(text, languagePreference);

  if (!isOpen) return null;

  const totals = calculateOrderTotals(cart, appliedPromo, settings, discounts);
  const checkoutUnavailable = isFirebaseConfigured() && !areFirebaseFunctionsEnabled();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const code = promoInput.trim().toUpperCase();
    if (isPromoCodeValid(code, discounts)) {
      setAppliedPromo(code);
      showToast(`Promo code "${code}" applied!`);
      setPromoInput('');
    } else {
      showToast('Invalid promo code. Please check the code and try again.', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-[#fcf9f3] h-full shadow-2xl flex flex-col justify-between border-l border-[#e5e2dc] animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-[#e5e2dc] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#ab3425]" />
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18]">
              {t('Your Basket')} ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0eee8] text-[#817471] hover:text-[#1c1c18] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-[#817471]">
              <div className="w-16 h-16 rounded-full bg-[#f0eee8] flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-[#817471]" />
              </div>
              <h3 className="font-bold text-base text-[#1c1c18]">{t('Your basket is empty')}</h3>
              <p className="text-xs text-[#817471] mt-1 max-w-xs">
                {t('Explore our curated artisan beverages and crispy snacks to add your favorites.')}
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-white rounded-2xl border border-[#e5e2dc] shadow-xs flex items-center gap-3"
              >
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0 border border-[#e5e2dc]"
                  style={{ backgroundImage: `url('${item.product.image}')` }}
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#1c1c18] truncate">
                    {item.product.name}
                  </h4>
                  <span className="text-xs font-semibold text-[#ab3425]">
                    {formatCurrency(item.product.price, settings)}
                  </span>

                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center border border-[#d2c3bf] rounded-lg bg-[#fcf9f3]">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-[#e5e2dc] text-[#1c1c18]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-[#e5e2dc] text-[#1c1c18]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-[#817471] hover:text-[#ba1a1a]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-bold text-[#1c1c18] shrink-0 text-right">
                  {formatCurrency(item.product.price * item.quantity, settings)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Calculations & Promo */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#e5e2dc] bg-white space-y-3">
            {/* Promo Code Input */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#817471]" />
                <input
                  type="text"
                  placeholder={t('Promo Code (e.g. SIP20)')}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#f6f3ed] rounded-xl text-xs uppercase font-mono border border-transparent focus:border-[#ab3425] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#130805] hover:bg-[#2c1e1a] text-white text-xs font-bold rounded-xl transition-colors"
              >
                {t('Apply')}
              </button>
            </form>

            {appliedPromo && (
              <div className="flex items-center justify-between text-xs bg-[#ffdad4] text-[#8a1c10] px-3 py-1.5 rounded-lg font-semibold">
                <span>{t('Code applied:')} <strong>{appliedPromo}</strong></span>
                <button onClick={() => setAppliedPromo(null)} className="underline text-[11px]">
                  {t('Remove')}
                </button>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-[#4f4542] pt-1">
              <div className="flex justify-between">
                <span>{t('Subtotal')}</span>
                <span className="font-semibold text-[#1c1c18]">{formatCurrency(totals.subtotal, settings)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t('Discount')}</span>
                  <span className="font-semibold">-{formatCurrency(totals.discount, settings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('Delivery')}</span>
                <span className="font-semibold text-[#1c1c18]">
                  {totals.deliveryFee === 0 ? t('FREE') : formatCurrency(totals.deliveryFee, settings)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#1c1c18] pt-2 border-t border-[#f0eee8]">
                <span>{t('Total Amount')}</span>
                <span className="text-[#ab3425] text-base">{formatCurrency(totals.total, settings)}</span>
              </div>
            </div>

            {checkoutUnavailable ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 bg-[#817471] text-white/90 rounded-xl font-bold text-xs cursor-not-allowed"
                >
                  {t('Checkout unavailable')}
                </button>
                <p className="text-center text-[11px] text-[#817471]">
                  {t('Online ordering is unavailable while Cloud Functions are disabled for this project.')}
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 bg-[#ab3425] hover:bg-[#8a1c10] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ab3425]/20 transition-all active:scale-[0.99]"
              >
                <span>{t('Proceed to Checkout')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
