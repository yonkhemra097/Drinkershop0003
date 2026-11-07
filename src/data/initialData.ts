import type {
  Product,
  Category,
  Order,
  UserAccount,
  StockRequest,
  InventoryLog,
  BottleneckAlert,
  DashboardWidget,
  StoreSettings,
  AuthUser,
} from '../types/index.ts';

export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_USERS: UserAccount[] = [];
export const INITIAL_STOCK_REQUESTS: StockRequest[] = [];
export const INITIAL_INVENTORY_LOGS: InventoryLog[] = [];
export const INITIAL_BOTTLENECKS: BottleneckAlert[] = [];
export const INITIAL_AUTH_USERS: AuthUser[] = [];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'w-kpi', title: 'Key Performance Indicators', type: 'kpi_stats', colSpan: 3, visible: true, order: 0 },
  { id: 'w-chart', title: 'Sales & Revenue Trend', type: 'sales_chart', colSpan: 2, visible: true, order: 1 },
  { id: 'w-top', title: 'Top Sellers Ranking', type: 'top_sellers', colSpan: 1, visible: true, order: 2 },
  { id: 'w-orders', title: 'Orders', type: 'live_orders', colSpan: 2, visible: true, order: 3 },
  { id: 'w-alerts', title: 'Inventory Alerts', type: 'inventory_alerts', colSpan: 1, visible: true, order: 4 },
  { id: 'w-map', title: 'Store Location', type: 'courier_map', colSpan: 2, visible: true, order: 5 },
  { id: 'w-bottlenecks', title: 'Fulfillment Alerts', type: 'bottlenecks', colSpan: 1, visible: true, order: 6 },
  { id: 'w-roster', title: 'Staff & Courier Roster', type: 'staff_roster', colSpan: 1, visible: true, order: 7 },
  { id: 'w-hourly', title: 'Fulfillment Volume', type: 'fulfillment_flow', colSpan: 2, visible: true, order: 8 },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Sip & Snack Artisan Shop',
  phone: '',
  email: '',
  address: '',
  currency: 'USD',
  exchangeRate: 4100,
  standardDeliveryFee: 3.5,
  freeDeliveryThreshold: 35.0,
  taxRate: 0.08,
  lowStockThresholdDefault: 8,
};
