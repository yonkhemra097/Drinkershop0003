import React from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import { formatCurrency } from '../../../utils/formatCurrency.ts';
import { translate } from '../../../utils/translations.ts';

interface TopSellersWidgetProps {
  onViewAllProducts?: () => void;
}

export const TopSellersWidget: React.FC<TopSellersWidgetProps> = ({ onViewAllProducts }) => {
  const { products, orders, setCurrentView, settings, languagePreference } = useStore();
  const t = (text: string, values?: Record<string, string | number>) =>
    translate(text, languagePreference, values);

  const productsById = new Map(products.map((product) => [product.id, product]));
  const salesByProduct = new Map<string, { sold: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = salesByProduct.get(item.productId) ?? { sold: 0, revenue: 0 };
      current.sold += item.quantity;
      current.revenue += item.quantity * item.price;
      salesByProduct.set(item.productId, current);
    }
  }

  const topSellers = [...salesByProduct.entries()]
    .flatMap(([productId, sales]) => {
      const product = productsById.get(productId);
      return product ? [{ product, ...sales }] : [];
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  return (
    <div className="top-sellers-widget flex h-full flex-col justify-between rounded-2xl border border-[#e5e2dc] bg-white p-5 shadow-sm">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#1c1c18]">
            {t('Top Sellers')}
          </h3>
          <span className="text-xs font-medium text-[#817471]">{t('Revenue')}</span>
        </div>

        {topSellers.length === 0 ? (
          <p className="rounded-xl bg-[#f6f3ed] p-4 text-center text-xs text-[#817471]">
            {t('No sales have been recorded yet.')}
          </p>
        ) : (
          <div className="space-y-3">
            {topSellers.map(({ product, sold, revenue }) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-[#f6f3ed]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl border border-[#e5e2dc] bg-cover bg-center"
                    style={{ backgroundImage: `url('${product.image}')` }}
                    role="img"
                    aria-label={product.name}
                  />
                  <div className="min-w-0">
                    <h4 className="top-seller-product-name truncate text-xs font-bold text-[#1c1c18]">
                      {t(product.name)}
                    </h4>
                    <span className="top-seller-sold-count block text-[11px] text-[#817471]">
                      {t('{count} sold', { count: sold })}
                    </span>
                  </div>
                </div>
                <span className="top-seller-revenue shrink-0 text-xs font-bold text-[#130805]">
                  {formatCurrency(revenue, settings)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (onViewAllProducts) onViewAllProducts();
          else setCurrentView('admin');
        }}
        className="mt-4 w-full rounded-xl bg-[#f0eee8] py-2 text-xs font-bold text-[#1c1c18] transition-colors hover:bg-[#ebe8e2]"
      >
        {t('View All Products')}
      </button>
    </div>
  );
};
