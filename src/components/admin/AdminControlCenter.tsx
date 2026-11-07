import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { Product, Order, UserRole } from '../../types/index.ts';
import { listCloudUsers, updateCloudUserRole, type FirebaseAccountRecord } from '../../utils/firebaseFunctions.ts';
import { formatCurrency } from '../../utils/formatCurrency.ts';
import { exportCsv } from '../../utils/exportCsv.ts';
import { translate } from '../../utils/translations.ts';
import {
  LayoutDashboard,
  FastForward,
  FolderTree,
  Boxes,
  Receipt,
  CreditCard,
  Truck,
  Users,
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Tag,
  MapPin,
} from 'lucide-react';
import { KpiStatsWidget } from '../dashboard/widgets/KpiStatsWidget.tsx';
import { RevenueChartWidget } from '../dashboard/widgets/RevenueChartWidget.tsx';
import { TopSellersWidget } from '../dashboard/widgets/TopSellersWidget.tsx';
import { LiveOrdersWidget } from '../dashboard/widgets/LiveOrdersWidget.tsx';
import { InventoryAlertsWidget } from '../dashboard/widgets/InventoryAlertsWidget.tsx';
import { EditProductModal } from '../modals/EditProductModal.tsx';
import { EditOrderModal } from '../modals/EditOrderModal.tsx';
import { InvoicesView } from '../invoices/InvoicesView.tsx';
import { DiscountManagement } from './DiscountManagement.tsx';

const AdminLocationsMap = React.lazy(() =>
  import('../location/AdminLocationsMap.tsx').then((module) => ({
    default: module.AdminLocationsMap,
  }))
);

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'invoices'
  | 'payments'
  | 'deliveries'
  | 'users'
  | 'locations'
  | 'discounts'
  | 'settings';

export const AdminControlCenter: React.FC<{ initialTab?: AdminTab }> = ({ initialTab = 'overview' }) => {
  const {
    products,
    categories,
    orders,
    users,
    currentUser,
    inventoryLogs,
    settings,
    updateSettings,
    adjustProductStock,
    addCategory,
    deleteCategory,
    updateCurrentUserProfile,
    languagePreference,
    setLanguagePreference,
    darkMode,
    setDarkMode,
    fontSizePreference,
    setFontSizePreference,
    createStaffAccount,
    publishAnnouncement,
    toggleClockIn,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // New category inline input
  const [newCatName, setNewCatName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager' | 'staff' | 'driver'>('driver');
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [profileName, setProfileName] = useState(currentUser?.name ?? '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone ?? '');
  const [exchangeRateDraft, setExchangeRateDraft] = useState(String(settings.exchangeRate));
  const [firebaseAccounts, setFirebaseAccounts] = useState<FirebaseAccountRecord[]>([]);
  const [accountPageToken, setAccountPageToken] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const t = (text: string) => translate(text, languagePreference);
  const isAdmin = currentUser?.role === 'admin';
  const accountCreatedAt = (id: string, cloudDate: string | null) =>
    cloudDate || users.find((profile) => profile.id === id)?.createdAt || '';

  useEffect(() => {
    if (!isAdmin && (activeTab === 'users' || activeTab === 'locations')) {
      setActiveTab('overview');
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'users') return;
    let isActive = true;
    setIsLoadingAccounts(true);
    void listCloudUsers()
      .then((result) => {
        if (!isActive) return;
        setFirebaseAccounts(result.accounts);
        setAccountPageToken(result.nextPageToken);
      })
      .catch((error: unknown) => {
        if (isActive) {
          showToast(error instanceof Error ? error.message : 'Could not load Firebase accounts.', 'error');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingAccounts(false);
      });
    return () => { isActive = false; };
  }, [accountRefreshKey, activeTab, isAdmin, showToast]);

  if (!isAdmin && currentUser?.role !== 'manager') {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e2dc] p-8 text-center">
        <h2 className="font-bold text-xl text-[#1c1c18]">{t('Management access required')}</h2>
        <p className="text-sm text-[#817471] mt-2">Sign in with an administrator or manager account to access the control center.</p>
      </div>
    );
  }

  const handleCreateStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createStaffAccount({
      name: newStaffName,
      email: newStaffEmail,
      phone: newStaffPhone,
      password: newStaffPassword,
      role: newStaffRole,
    });
    if (!result.success) {
      showToast(result.error || 'Could not create the staff account.', 'error');
      return;
    }
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffPassword('');
    setAccountRefreshKey((key) => key + 1);
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await updateCurrentUserProfile({ name: profileName, phone: profilePhone });
    if (!result.success) showToast(result.error || 'Could not update the profile.', 'error');
  };

  const handlePublishAnnouncement = (event: React.FormEvent) => {
    event.preventDefault();
    const result = publishAnnouncement(announcementDraft);
    if (!result.success) {
      showToast(result.error || 'Could not send the announcement.', 'error');
      return;
    }
    setAnnouncementDraft('');
  };

  const exportUserAccounts = () => {
    exportCsv(
      'user-accounts.csv',
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Shift Status', 'Created At'],
      firebaseAccounts.map((user) => [
        user.name,
        user.email,
        user.phone,
        user.role,
        user.status,
        user.shiftStatus || '',
        accountCreatedAt(user.id, user.createdAt),
      ])
    );
    showToast('User account CSV exported. Passwords and PINs were not included.', 'success');
  };

  const exportStockItems = () => {
    exportCsv(
      'stock-items.csv',
      ['SKU', 'Product', 'Category', 'Stock', 'Status', 'Price', 'Cost Price'],
      products.map((product) => [
        product.sku,
        product.name,
        product.category,
        product.stock,
        product.status,
        formatCurrency(product.price, settings),
        formatCurrency(product.costPrice, settings),
      ])
    );
    showToast('Stock item CSV exported.', 'success');
  };

  const exportInvoices = () => {
    exportCsv(
      'invoices.csv',
      ['Invoice', 'Date', 'Customer', 'Phone', 'Address', 'Item', 'Quantity', 'Unit Price', 'Subtotal', 'Discount', 'Delivery Fee', 'Total', 'Payment Method', 'Payment Status', 'Order Status'],
      orders.flatMap((order) =>
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
        ])
      )
    );
    showToast('Invoice CSV exported.', 'success');
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );
  const currentYear = new Date().getFullYear();
  const abaVolume = orders
    .filter((order) => order.paymentMethod === 'ABA PayWay' && order.paymentStatus === 'Paid')
    .reduce((total, order) => total + order.total, 0);
  const pendingCod = orders
    .filter((order) => order.paymentMethod === 'COD' && order.paymentStatus === 'COD')
    .reduce((total, order) => total + order.total, 0);
  const revenueYtd = orders
    .filter((order) => {
      const createdAt = Date.parse(order.createdAt);
      return (
        Number.isFinite(createdAt) &&
        new Date(createdAt).getFullYear() === currentYear &&
        (order.paymentStatus === 'Paid' || order.paymentStatus === 'COD')
      );
    })
    .reduce((total, order) => total + order.total, 0);
  const activeDeliveryOrders = orders.filter(
    (order) =>
      (order.fulfillmentType ?? 'delivery') === 'delivery' &&
      order.status !== 'Delivered' &&
      order.status !== 'Cancelled'
  );

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <FastForward className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <Receipt className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'deliveries', label: 'Deliveries', icon: <Truck className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'locations', label: 'Live Locations', icon: <MapPin className="w-4 h-4" /> },
    { id: 'discounts', label: 'Discounts', icon: <Tag className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      {/* Admin Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#2c1e1a] text-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between shrink-0 shadow-xl border border-[#130805]">
        <div>
          <div className="flex items-center gap-2.5 px-3 py-2 mb-4 text-[#ffdad4] border-b border-white/10 pb-4">
            <span className="material-symbols-outlined text-2xl text-[#fc6f5a]">local_bar</span>
            <div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base leading-tight">
                SnackShop Admin
              </div>
              <div className="text-[10px] text-[#dac1bb]">Full Control Center</div>
            </div>
          </div>

          <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {tabs.filter((tab) => isAdmin || (tab.id !== 'users' && tab.id !== 'locations')).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-[#fcf9f3] text-[#1c1c18] font-bold shadow-md'
                      : 'text-[#dac1bb] hover:bg-[#130805] hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{t(tab.label)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 mt-6 text-[11px] text-[#dac1bb] flex items-center justify-between">
          <span>Admin Portal v2.4</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 min-w-0">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#817471] font-semibold">
                  Admin Control Center
                </span>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl text-[#1c1c18]">
                  Dashboard Overview
                </h2>
              </div>
              <button
                onClick={() => showToast('Financial export downloaded as Excel/CSV.')}
                className="px-4 py-2 bg-[#130805] hover:bg-[#2c1e1a] text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
              >
                Export Report
              </button>
            </div>

            {isAdmin && (
              <form
                onSubmit={handlePublishAnnouncement}
                className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-3"
              >
                <div>
                  <h3 className="font-bold text-sm text-[#1c1c18]">{t('Send announcement to all users')}</h3>
                  <p className="mt-1 text-xs text-[#817471]">{t('This message will appear in every signed-in user notification inbox.')}</p>
                </div>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={announcementDraft}
                  onChange={(event) => setAnnouncementDraft(event.target.value)}
                  placeholder={t('Write an announcement...')}
                  className="w-full p-3 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs resize-y"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#817471]">{announcementDraft.length}/500</span>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[#ab3425] text-white text-xs font-bold hover:bg-[#8a1c10]">
                    {t('Send announcement')}
                  </button>
                </div>
              </form>
            )}

            {/* KPI Summary */}
            <KpiStatsWidget />

            {/* Charts & Top Sellers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RevenueChartWidget />
              </div>
              <div>
                <TopSellersWidget onViewAllProducts={() => setActiveTab('products')} />
              </div>
            </div>

            {/* Live Orders & Inventory Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LiveOrdersWidget
                  onEditOrder={(order) => {
                    setSelectedOrderForEdit(order);
                    setIsOrderModalOpen(true);
                  }}
                />
              </div>
              <div>
                <InventoryAlertsWidget onOpenInventoryManager={() => setActiveTab('inventory')} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e5e2dc]">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                  Product Catalog Management
                </h3>
                <p className="text-xs text-[#817471]">
                  Add, edit, price, and adjust stock counts across your artisan drink & snack catalogue.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedProductForEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#ab3425] hover:bg-[#8a1c10] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817471]" />
              <input
                type="text"
                placeholder="Filter by name, SKU, or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-[#d2c3bf] text-xs focus:outline-none focus:border-[#ab3425]"
              />
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-[#e5e2dc] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f6f3ed] text-[#817471] font-semibold uppercase border-b border-[#e5e2dc]">
                    <th className="p-3">Product</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Selling / Cost</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eee8]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcf9f3] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 border border-[#e5e2dc]"
                            style={{ backgroundImage: `url('${p.image}')` }}
                          />
                          <div>
                            <div className="font-bold text-[#1c1c18]">{p.name}</div>
                            <div className="text-[10px] text-[#817471] line-clamp-1">{p.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[#817471]">{p.sku}</td>
                      <td className="p-3 font-medium text-[#4f4542]">{p.category}</td>
                      <td className="p-3 font-bold text-[#1c1c18]">
                        {formatCurrency(p.price, settings)} <span className="text-[10px] text-[#817471] font-normal">({formatCurrency(p.costPrice, settings)})</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            p.stock <= p.lowStockThreshold
                              ? 'bg-[#ffdad6] text-[#ba1a1a]'
                              : 'bg-[#f0eee8] text-[#1c1c18]'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="capitalize text-[11px] font-semibold">{p.status.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => adjustProductStock(p.id, 10, 'Quick +10 restock from Admin table', 'Admin')}
                            title="Quick Restock +10"
                            className="px-2 py-1 bg-[#f0eee8] hover:bg-[#dcdad4] text-[#1c1c18] rounded-lg font-bold text-[10px]"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProductForEdit(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-[#ffdad4] text-[#ab3425] rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                  Store Categories
                </h3>
                <p className="text-xs text-[#817471]">
                  Organize your inventory taxonomy for customer browsing and promotional filters.
                </p>
              </div>

              {/* Add category form */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="p-2 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs focus:outline-none focus:border-[#ab3425]"
                />
                <button
                  onClick={() => {
                    if (newCatName.trim()) {
                      addCategory({
                        name: newCatName.trim(),
                        slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
                        productCount: 0,
                      });
                      setNewCatName('');
                    }
                  }}
                  className="px-3.5 py-2 bg-[#130805] hover:bg-[#2c1e1a] text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Add Category
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white p-4 rounded-2xl border border-[#e5e2dc] shadow-xs flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[#1c1c18]">{cat.name}</h4>
                    <span className="text-xs text-[#817471] font-mono">slug: {cat.slug}</span>
                  </div>
                  {cat.slug !== 'all' && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2 text-[#817471] hover:text-[#ba1a1a] rounded-lg hover:bg-[#ffdad6]/30 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: INVENTORY & AUDIT LOGS */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] flex items-center justify-between">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                  Inventory Audit & Stock Ledger
                </h3>
                <p className="text-xs text-[#817471]">
                  Complete traceability of stock adjustments and sales deductions.
                </p>
              </div>
            </div>

            {/* Inventory Logs Table */}
            <div className="bg-white rounded-2xl border border-[#e5e2dc] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f6f3ed] text-[#817471] font-semibold uppercase border-b border-[#e5e2dc]">
                    <th className="p-3">Time</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Delta</th>
                    <th className="p-3">New Stock</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eee8]">
                  {inventoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fcf9f3]">
                      <td className="p-3 text-[#817471] font-mono">{log.timestamp}</td>
                      <td className="p-3 font-bold text-[#1c1c18]">{log.productName}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded ${
                            log.changeQuantity > 0
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {log.changeQuantity > 0 ? `+${log.changeQuantity}` : log.changeQuantity}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#1c1c18]">{log.newQuantity}</td>
                      <td className="p-3 text-[#4f4542]">{log.reason}</td>
                      <td className="p-3 font-semibold text-[#817471]">{log.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS MASTER */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                  Order Fulfillment Master
                </h3>
                <p className="text-xs text-[#817471]">
                  Inspect, edit statuses, reassign drivers, and manage customer orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="px-4 py-2 rounded-xl bg-[#ab3425] text-white text-xs font-bold hover:bg-[#8a1c10]"
              >
                {t('View Invoices')}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e5e2dc] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-[#f6f3ed] text-[#817471] font-semibold uppercase border-b border-[#e5e2dc]">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Phone & Address</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Courier</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eee8]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#fcf9f3]">
                      <td className="p-3 font-mono font-bold text-[#1c1c18]">{o.orderNumber}</td>
                      <td className="p-3 font-bold text-[#1c1c18]">{o.customerName}</td>
                      <td className="p-3 text-[11px] text-[#4f4542]">
                        <div>{o.customerPhone}</div>
                        <div className="text-[#817471] truncate max-w-xs">{o.customerAddress}</div>
                      </td>
                      <td className="p-3 text-[#817471]">
                        {o.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                      </td>
                      <td className="p-3 font-bold text-[#1c1c18]">
                        <div>{formatCurrency(o.total, settings)}</div>
                        <div className="text-[10px] font-medium text-[#817471]">
                          {o.fulfillmentType === 'in_store' ? 'In-store' : 'Delivery'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0eee8] text-[#1c1c18]">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#4f4542]">{o.driverName || 'Unassigned'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('invoices')}
                            className="px-2.5 py-1 rounded-lg bg-[#f0eee8] text-[#1c1c18] hover:bg-[#ebe8e2] font-bold text-xs"
                          >
                            {t('Invoice')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForEdit(o);
                              setIsOrderModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#ab3425] text-white hover:bg-[#8a1c10] font-bold text-xs shadow-xs"
                          >
                            Edit Order
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && <InvoicesView />}

        {/* TAB 6: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc]">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                Payment Gateways & Ledger
              </h3>
              <p className="text-xs text-[#817471]">
                Reconciliation of Cash on Delivery (COD) and ABA PayWay KHQR instant settlements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc]">
                <span className="text-xs text-[#817471]">ABA KHQR Volume</span>
                <div className="text-xl font-bold text-[#005f73] mt-1">{formatCurrency(abaVolume, settings)}</div>
                <span className="text-[10px] text-emerald-700 font-bold">Recorded as paid</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc]">
                <span className="text-xs text-[#817471]">Cash on Delivery (Pending Courier)</span>
                <div className="text-xl font-bold text-[#ab3425] mt-1">{formatCurrency(pendingCod, settings)}</div>
                <span className="text-[10px] text-amber-700 font-bold">Unpaid COD orders</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc]">
                <span className="text-xs text-[#817471]">Total Revenue YTD</span>
                <div className="text-xl font-bold text-[#130805] mt-1">{formatCurrency(revenueYtd, settings)}</div>
                <span className="text-[10px] text-[#817471] font-bold">Recorded this year</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DELIVERIES FLEET */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc]">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                Courier Fleet & Dispatch
              </h3>
              <p className="text-xs text-[#817471]">
                Delivery orders and their assigned couriers. No live location is collected.
              </p>
            </div>

            <div className="space-y-3">
              {activeDeliveryOrders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#d2c3bf] bg-white p-6 text-center text-xs text-[#817471]">
                  No active delivery orders.
                </p>
              ) : activeDeliveryOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#1c1c18]">{order.orderNumber}</h4>
                      <p className="text-xs text-[#817471]">{order.customerName} · {order.customerAddress}</p>
                    </div>
                    <span className="rounded-full bg-[#f0eee8] px-2.5 py-1 text-xs font-bold text-[#4f4542]">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#4f4542]">
                    Courier: {order.driverName || 'Not assigned'} · {order.paymentMethod === 'COD' ? `COD ${formatCurrency(order.total, settings)}` : order.paymentStatus}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: USER MANAGEMENT */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#e5e2dc] flex items-center justify-between">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                  {t('User Accounts & Roles')}
                </h3>
                <p className="text-xs text-[#817471]">
                  {t('Firebase Authentication accounts. Assign account roles by email.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFirebaseAccounts([]);
                  setAccountPageToken(null);
                  setAccountRefreshKey((key) => key + 1);
                }}
                disabled={isLoadingAccounts}
                className="rounded-xl bg-[#f0eee8] px-3 py-2 text-xs font-bold text-[#1c1c18] disabled:opacity-50"
              >
                {isLoadingAccounts ? t('Loading accounts…') : t('Refresh accounts')}
              </button>
            </div>

            {isAdmin && (
              <form onSubmit={handleCreateStaff} className="bg-white p-4 rounded-2xl border border-[#e5e2dc] space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-[#1c1c18]">{t('Create a staff account')}</h4>
                  <p className="text-[11px] text-[#817471]">
                    {t('Only administrators can create Admin, Manager, Staff, or Courier accounts. Provide the temporary password securely.')}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input required value={newStaffName} onChange={(event) => setNewStaffName(event.target.value)} placeholder={t('Full name')} className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
                  <input required type="email" value={newStaffEmail} onChange={(event) => setNewStaffEmail(event.target.value)} placeholder={t('Email address')} className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
                  <input value={newStaffPhone} onChange={(event) => setNewStaffPhone(event.target.value)} placeholder={t('Phone (optional)')} className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
                  <input required type="password" minLength={8} value={newStaffPassword} onChange={(event) => setNewStaffPassword(event.target.value)} placeholder={t('Temporary password (8+ characters)')} className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select value={newStaffRole} onChange={(event) => setNewStaffRole(event.target.value as 'admin' | 'manager' | 'staff' | 'driver')} className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs font-semibold">
                    <option value="admin">{t('Admin')}</option>
                    <option value="driver">{t('Courier')}</option>
                    <option value="manager">{t('Manager')}</option>
                    <option value="staff">{t('Staff')}</option>
                  </select>
                  <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#ab3425] text-white text-xs font-bold hover:bg-[#8a1c10]">
                    {t('Create account')}
                  </button>
                </div>
              </form>
            )}
            <div className="bg-white rounded-2xl border border-[#e5e2dc] overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f6f3ed] text-[#817471] font-semibold uppercase border-b border-[#e5e2dc]">
                    <th className="p-3">{t('User')}</th>
                    <th className="p-3">{t('Email & Phone')}</th>
                    <th className="p-3">{t('Role')}</th>
                    <th className="p-3">{t('Shift Status')}</th>
                    <th className="p-3">{t('Created')}</th>
                    <th className="p-3 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0eee8]">
                  {firebaseAccounts.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fcf9f3]">
                      <td className="p-3 font-bold text-[#1c1c18]">{u.name}</td>
                      <td className="p-3 text-[#4f4542]">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-[#817471]">{u.phone}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const role = e.target.value as UserRole;
                            void updateCloudUserRole(u.email, role)
                              .then(() => {
                                setFirebaseAccounts((accounts) =>
                                  accounts.map((account) => account.id === u.id ? { ...account, role } : account)
                                );
                                showToast(`Updated ${u.email} to ${role}. Sign in again to refresh permissions.`);
                              })
                              .catch((error: unknown) => {
                                showToast(error instanceof Error ? error.message : 'Could not update the account role.', 'error');
                              });
                          }}
                          disabled={
                            !u.email ||
                            (u.role === 'admin' && u.id === (currentUser?.firebaseUid || currentUser?.id))
                          }
                          className="p-1 rounded-lg border border-[#d2c3bf] bg-white text-xs font-semibold"
                        >
                          {isAdmin && <option value="admin">{t('Admin')}</option>}
                          <option value="manager">{t('Manager')}</option>
                          <option value="staff">{t('Staff')}</option>
                          <option value="driver">{t('Driver')}</option>
                          <option value="customer">{t('Customer')}</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.shiftStatus === 'clocked_in'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {u.shiftStatus || 'clocked_out'}
                        </span>
                      </td>
                      <td className="p-3 text-[#4f4542]">
                        {accountCreatedAt(u.id, u.createdAt) &&
                        Number.isFinite(Date.parse(accountCreatedAt(u.id, u.createdAt)))
                          ? new Date(accountCreatedAt(u.id, u.createdAt)).toLocaleString()
                          : t('Date unavailable')}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleClockIn(u.id)}
                          disabled={!users.some((profile) => profile.id === u.id)}
                          className="px-2.5 py-1 bg-[#f0eee8] hover:bg-[#dcdad4] rounded-lg text-xs font-semibold"
                        >
                          {t('Toggle Shift')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {firebaseAccounts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-[#817471]">
                        {isLoadingAccounts ? t('Loading Firebase accounts…') : t('No Firebase accounts found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {accountPageToken && (
              <button
                type="button"
                disabled={isLoadingAccounts}
                onClick={() => {
                  setIsLoadingAccounts(true);
                  void listCloudUsers(accountPageToken)
                    .then((result) => {
                      setFirebaseAccounts((accounts) => [...accounts, ...result.accounts]);
                      setAccountPageToken(result.nextPageToken);
                    })
                    .catch((error: unknown) => {
                      showToast(error instanceof Error ? error.message : 'Could not load more Firebase accounts.', 'error');
                    })
                    .finally(() => setIsLoadingAccounts(false));
                }}
                className="rounded-xl bg-[#f0eee8] px-4 py-2 text-xs font-bold text-[#1c1c18] disabled:opacity-50"
              >
                {t('Load more accounts')}
              </button>
            )}
          </div>
        )}
        {activeTab === 'locations' && isAdmin && (
          <React.Suspense fallback={<p className="rounded-xl bg-white p-4 text-sm text-[#817471]">{t('Loading map…')}</p>}>
            <AdminLocationsMap />
          </React.Suspense>
        )}


        {activeTab === 'discounts' && <DiscountManagement />}

        {/* TAB 9: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border border-[#e5e2dc] space-y-4 max-w-2xl">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18]">
                {t('Store Configuration & Operational Settings')}
              </h3>
              <p className="text-xs text-[#817471]">
                {t('Prices are stored in USD. Currency changes convert displayed amounts using the exchange rate below.')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Store Name')}</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => updateSettings({ storeName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]"
                />
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Currency')}</label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value as 'USD' | 'KHR' })}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] font-bold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Exchange rate (៛ per $1 USD)')}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={exchangeRateDraft}
                  onChange={(event) => setExchangeRateDraft(event.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]"
                />
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Standard Delivery Fee (USD)')}</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.standardDeliveryFee}
                  onChange={(e) => updateSettings({ standardDeliveryFee: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]"
                />
              </div>

              <div>
                <label className="block text-[#4f4542] font-semibold mb-1">{t('Free Delivery Threshold (USD)')}</label>
                <input
                  type="number"
                  step="1"
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) => updateSettings({ freeDeliveryThreshold: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]"
                />
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="border-t border-[#e5e2dc] pt-4 space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[#1c1c18]">{t('Edit Profile')}</h4>
                <p className="text-xs text-[#817471]">{t('Update your account name and contact details.')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required aria-label="Profile name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Name" className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
                <input type="email" aria-label="Profile email" value={currentUser?.email || ''} readOnly className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#f0eee8] text-xs text-[#817471]" />
                <input aria-label="Profile phone" value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} placeholder="Phone" className="p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] text-xs" />
              </div>
              <button type="submit" className="px-4 py-2 bg-[#2c1e1a] text-white rounded-xl text-xs font-bold">{t('Save Profile')}</button>
            </form>

            <div className="border-t border-[#e5e2dc] pt-4 space-y-3">
              <h4 className="font-bold text-sm text-[#1c1c18]">{t('Display Preferences')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="block font-semibold text-[#4f4542]">{t('Language preference')}</span>
                  <select value={languagePreference} onChange={(event) => setLanguagePreference(event.target.value === 'km' ? 'km' : 'en')} className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]">
                    <option value="en">{t('English')}</option>
                    <option value="km">{t('Khmer')}</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block font-semibold text-[#4f4542]">{t('Font size')}</span>
                  <select
                    value={fontSizePreference}
                    onChange={(event) => {
                      const size = event.target.value;
                      if (size === 'small' || size === 'normal' || size === 'large') {
                        setFontSizePreference(size);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3]"
                  >
                    <option value="small">{t('Small')}</option>
                    <option value="normal">{t('Normal')}</option>
                    <option value="large">{t('Large')}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#e5e2dc] p-3 font-semibold text-[#4f4542]">
                  <input type="checkbox" checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} className="accent-[#ab3425]" />
                  {t('Dark mode')}
                </label>
              </div>
              <p className="text-[11px] text-[#817471]">{t('Choose a language to translate the app interface.')}</p>
            </div>

            <div className="border-t border-[#e5e2dc] pt-4 space-y-3">
              <h4 className="font-bold text-sm text-[#1c1c18]">{t('Export Data')}</h4>
              <p className="text-xs text-[#817471]">{t('Download CSV files. User exports exclude passwords and PINs.')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportUserAccounts} className="px-4 py-2 bg-[#f0eee8] rounded-xl text-xs font-bold text-[#1c1c18]">{t('Export User Accounts')}</button>
                <button type="button" onClick={exportStockItems} className="px-4 py-2 bg-[#f0eee8] rounded-xl text-xs font-bold text-[#1c1c18]">{t('Export Stock Items')}</button>
                <button type="button" onClick={exportInvoices} className="px-4 py-2 bg-[#f0eee8] rounded-xl text-xs font-bold text-[#1c1c18]">{t('Export Invoices')}</button>
              </div>
            </div>

            <button
              onClick={() => {
                const exchangeRate = Number(exchangeRateDraft);
                if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
                  showToast('Enter an exchange rate greater than zero.', 'error');
                  return;
                }
                updateSettings({ exchangeRate });
              }}
              className="px-5 py-2.5 bg-[#130805] text-white rounded-xl text-xs font-bold hover:bg-[#2c1e1a] shadow-sm"
            >
              {t('Save Configuration')}
            </button>
          </div>
        )}
      </main>

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isProductModalOpen}
        product={selectedProductForEdit}
        onClose={() => setIsProductModalOpen(false)}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={isOrderModalOpen}
        order={selectedOrderForEdit}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </div>
  );
};
