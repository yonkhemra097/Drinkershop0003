import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { Product } from '../../types/index.ts';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { translate } from '../../utils/translations.ts';
import { Search, Plus, Sparkles, Flame, ArrowRight, X, Minus, Check, Heart } from 'lucide-react';

interface StorefrontViewProps {
  onOpenCart: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({ onOpenCart }) => {
  const { products, categories, discounts, addToCart, showToast, settings, languagePreference } = useStore();
  const t = (text: string, values?: Record<string, string | number>) =>
    translate(text, languagePreference, values);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewQty, setQuickViewQty] = useState<number>(1);
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'hidden') return false;
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleOpenQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setQuickViewQty(1);
  };

  const handleAddQuickViewToCart = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct, quickViewQty);
    setQuickViewProduct(null);
  };

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast(`Promo code "${code}" copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="w-full">
      {/* Hero Section (Matching Image 1.png) */}
      <section className="relative w-full overflow-hidden bg-[#2c1e1a] text-white rounded-3xl p-6 sm:p-10 md:p-14 mb-10 shadow-xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ab3425]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ab3425] text-white text-xs font-bold tracking-wider uppercase shadow-sm">
              <Flame className="w-3.5 h-3.5" />
              <span>{t('Limited Time Offer')}</span>
            </span>

            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-3xl sm:text-5xl leading-tight text-white">
              {t('Crafted Cravings &')} <br />
              <span className="text-[#ffdad4]">{t('Refreshing Sips')}</span>
            </h1>

            <p className="text-sm sm:text-base text-[#dac1bb] leading-relaxed">
              {t('Discover hand-picked artisan beverages and gourmet snacks delivered straight to your door with artisanal warmth and unmatched freshness.')}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#catalog"
                className="px-6 py-3 rounded-xl bg-[#ab3425] hover:bg-[#8a1c10] text-white font-bold text-sm shadow-lg shadow-[#ab3425]/30 transition-all flex items-center gap-2"
              >
                <span>{t('Explore Catalog')}</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                onClick={() => setShowPromoModal(true)}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm border border-white/20 transition-all"
              >
                {t('View Deals')}
              </button>
            </div>
          </div>

          {/* Featured Bundle Card */}
          <div className="w-full md:w-1/2 max-w-md">
            <div
              className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-2xl bg-cover bg-center group border border-white/10"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDrFBp-oPnX5nqtwGIsIKM3oLRMY8MXZUqyCxwtOfIuv_IXYgtQR3vawDaY6VtmfoK_D7nbNOpR2FPSG5z0-MODa_1sQo21q5_UzO0M0KeeLDdwc6ptW694ZlbOqOLa8XNPeON-fNz12LIPxElpHErtTlONweqyhODSECidiqyoFGfvEl1tvZFx2NjYAONauocOU_NcUrhV4c-dEsJrCt9_LzX2amwolPluaS3EtQXPmPyFmdmP55oucA')`,
              }}
              role="img"
              aria-label="The Movie Night Basket featured bundle"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#130805]/90 via-[#130805]/30 to-transparent flex flex-col justify-end p-6">
                <span className="text-[#ffe08f] text-[11px] font-bold uppercase tracking-wider mb-1">
                  {t('Featured Bundle')}
                </span>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl sm:text-2xl text-white">
                  {t('The Movie Night Basket')}
                </h3>
                <p className="text-xs sm:text-sm text-[#dcdad4] mt-1 mb-3">
                  {t('Save 20% on selected sodas & gourmet kettle chips.')}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#ffdad4]">{formatCurrency(16.8, settings)} <s className="text-xs text-[#817471]">{formatCurrency(21, settings)}</s></span>
                  <button
                    onClick={() => {
                      const cola = products.find((p) => p.name.includes('Cola')) || products[0];
                      const chips = products.find((p) => p.name.includes('Chips')) || products[2];
                      addToCart(cola, 2);
                      addToCart(chips, 2);
                      showToast('Added Movie Night Basket items to cart!');
                    }}
                    className="px-4 py-2 rounded-xl bg-white text-[#130805] hover:bg-[#ffdad4] text-xs font-bold transition-colors"
                  >
                    {t('Quick Bundle Add')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Category Slider & Search Bar */}
      <div id="catalog" className="sticky top-16 z-30 bg-[#fcf9f3] py-4 border-b border-[#e5e2dc] mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => {
              const isActive =
                (selectedCategory === 'All' && (cat.name === 'All Items' || cat.slug === 'all')) ||
                selectedCategory.toLowerCase() === cat.name.toLowerCase();

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug === 'all' ? 'All' : cat.name)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#130805] text-white shadow-md'
                      : 'bg-[#f0eee8] text-[#1c1c18] hover:bg-[#ebe8e2]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817471]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search drinks & snacks...')}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#f0eee8] text-[#1c1c18] placeholder:text-[#817471] text-xs focus:outline-none focus:ring-2 focus:ring-[#130805]/20 transition-all border border-transparent focus:border-[#d2c3bf]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#817471] hover:text-[#1c1c18]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Grid Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl sm:text-2xl text-[#1c1c18]">
            {t('Catalog Overview')}
          </h2>
          <span className="text-xs text-[#817471]">
            {t(filteredProducts.length === 1 ? 'Showing {count} product' : 'Showing {count} products', { count: filteredProducts.length })}
          </span>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
          const isOutOfStock = product.stock <= 0;

          return (
            <div
              key={product.id}
              className="group bg-[#f6f3ed] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between border border-[#e5e2dc]"
            >
              <div>
                {/* Product Image */}
                <div
                  onClick={() => handleOpenQuickView(product)}
                  className="relative h-56 w-full overflow-hidden bg-[#f0eee8] cursor-pointer"
                >
                  {/* Stock Pill Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {isOutOfStock ? (
                      <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#ba1a1a] shadow-xs">
                        {t('Out of Stock')}
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-700 flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {t('Low Stock')}
                      </span>
                    ) : (
                      <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#130805] flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('In Stock')}
                      </span>
                    )}
                  </div>

                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url('${product.image}')` }}
                    role="img"
                    aria-label={product.imageAlt || product.name}
                  />
                </div>

                {/* Details */}
                <div className="p-4">
                  <span className="text-[10px] text-[#817471] uppercase tracking-wider font-bold">
                    {product.category}
                  </span>
                  <h3
                    onClick={() => handleOpenQuickView(product)}
                    className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18] mt-1 cursor-pointer hover:text-[#ab3425] transition-colors truncate"
                  >
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#817471] mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Price & Add Button */}
              <div className="p-4 pt-0 flex items-center justify-between">
                <div>
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1c1c18]">
                    {formatCurrency(product.price, settings)}
                  </span>
                  <span className="text-[10px] text-[#817471] block font-mono">
                    {t('Stock')}: {product.stock}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(product, 1)}
                  disabled={isOutOfStock}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                    isOutOfStock
                      ? 'bg-[#dcdad4] text-[#817471] cursor-not-allowed shadow-none'
                      : 'bg-[#130805] text-white hover:bg-[#ab3425]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t(isOutOfStock ? 'Sold Out' : 'Add')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#e5e2dc] relative">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-[#130805] shadow-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              <div
                className="w-full md:w-1/2 h-64 md:h-auto bg-cover bg-center min-h-[280px]"
                style={{ backgroundImage: `url('${quickViewProduct.image}')` }}
                role="img"
                aria-label={quickViewProduct.name}
              />

              <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#817471] uppercase tracking-wider font-bold">
                      {quickViewProduct.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f0eee8] text-[#130805]">
                      {quickViewProduct.stock > 0 ? `${quickViewProduct.stock} ${t('left')}` : t('Out of Stock')}
                    </span>
                  </div>

                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl text-[#1c1c18]">
                    {quickViewProduct.name}
                  </h3>

                  <div className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#ab3425] mt-1">
                    {formatCurrency(quickViewProduct.price, settings)}
                  </div>

                  <p className="text-xs sm:text-sm text-[#4f4542] mt-4 leading-relaxed">
                    {quickViewProduct.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-[#817471] font-mono">
                    <span>SKU: {quickViewProduct.sku}</span>
                    <span>•</span>
                    <span>Rating: ★ {quickViewProduct.rating} ({quickViewProduct.reviewCount})</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center border border-[#d2c3bf] rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 hover:bg-[#f0eee8] text-[#1c1c18] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-2 text-xs font-bold text-[#1c1c18]">
                      {quickViewQty}
                    </span>
                    <button
                      onClick={() => setQuickViewQty((q) => Math.min(quickViewProduct.stock, q + 1))}
                      className="px-3 py-2 hover:bg-[#f0eee8] text-[#1c1c18] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleAddQuickViewToCart}
                    disabled={quickViewProduct.stock <= 0}
                    className="flex-1 py-3 px-5 rounded-xl bg-[#130805] text-white hover:bg-[#ab3425] text-xs font-bold shadow-md text-center transition-all disabled:opacity-50"
                  >
                    {t('Add to Cart')} • {formatCurrency(quickViewProduct.price * quickViewQty, settings)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promo Deals Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-[#e5e2dc]">
            <button
              onClick={() => setShowPromoModal(false)}
              className="absolute top-4 right-4 p-2 text-[#817471] hover:text-[#1c1c18]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#ab3425] font-bold text-xs uppercase tracking-wider mb-2">
              <Flame className="w-4 h-4" />
              <span>Exclusive Offers</span>
            </div>

            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl text-[#1c1c18] mb-2">
              Special Weekend Bundles
            </h3>
            <p className="text-xs text-[#817471] mb-6">
              Use these promo coupon codes at checkout to unlock artisanal savings:
            </p>

            <div className="space-y-3 mb-6">
              {[
                { code: 'SIP20', desc: '20% off all artisan sodas & sparkling waters.' },
                { code: 'SNACKTIME', desc: 'Free express delivery on all orders.' },
                { code: 'FRUITBOX', desc: `Instant ${formatCurrency(4.29, settings)} discount (1 free fresh cold-pressed juice).` },
                ...discounts.map((discount) => ({
                  code: discount.code,
                  desc: discount.description,
                })),
              ].map((promo) => (
                <div
                  key={promo.code}
                  className="p-3 bg-white rounded-xl border border-[#e5e2dc] flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-[#ab3425] bg-[#ffdad4] px-2 py-0.5 rounded">
                      {promo.code}
                    </span>
                    <p className="text-xs text-[#4f4542] mt-1">{promo.desc}</p>
                  </div>
                  <button
                    onClick={() => handleCopyPromo(promo.code)}
                    className="px-3 py-1.5 rounded-lg bg-[#f0eee8] hover:bg-[#ab3425] hover:text-white text-xs font-bold transition-colors ml-2 shrink-0 flex items-center gap-1"
                  >
                    {copiedCode === promo.code ? <Check className="w-3.5 h-3.5" /> : 'Copy'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPromoModal(false)}
              className="w-full py-3 rounded-xl bg-[#130805] text-white hover:bg-[#2c1e1a] text-xs font-bold transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
