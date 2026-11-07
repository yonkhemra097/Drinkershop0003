export type UserRole = 'admin' | 'manager' | 'staff' | 'driver' | 'customer';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  image: string;
  imageAlt: string;
  status: 'active' | 'low_stock' | 'out_of_stock' | 'hidden';
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Discount {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  createdBy: string;
  createdAt: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Paid'
  | 'Preparing'
  | 'Ready for Pickup'
  | 'On the Way'
  | 'Delivered'
  | 'Failed'
  | 'Cancelled';

export type PaymentStatus = 'Pending' | 'Paid' | 'COD' | 'Refunded';
export type FulfillmentType = 'in_store' | 'delivery';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  fulfillmentType?: FulfillmentType;
  customerNotes?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'COD' | 'ABA PayWay' | 'Card';
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  invoiceReady?: boolean;
  driverId?: string;
  driverName?: string;
  assignedStaff?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationCategory =
  | 'order'
  | 'invoice'
  | 'announcement'
  | 'account';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  values?: Record<string, string | number>;
  createdAt: string;
  readBy: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdByAdmin?: boolean;
  createdAt?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  shiftStatus?: 'clocked_in' | 'on_break' | 'clocked_out' | 'on_delivery';
  assignment?: string;
  memberPoints?: number;
}

export interface StockRequest {
  id: string;
  productId: string;
  productName: string;
  requestedBy: string;
  type: 'discrepancy' | 'damage' | 'buffer_restock';
  unitsDelta: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  previousQuantity: number;
  changeQuantity: number;
  newQuantity: number;
  reason: string;
  actor: string;
  timestamp: string;
}

export interface BottleneckAlert {
  id: string;
  station: string;
  orderNumber?: string;
  title: string;
  description: string;
  level: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type:
    | 'kpi_stats'
    | 'sales_chart'
    | 'live_orders'
    | 'courier_map'
    | 'inventory_alerts'
    | 'bottlenecks'
    | 'fulfillment_flow'
    | 'top_sellers'
    | 'staff_roster';
  colSpan: 1 | 2 | 3;
  visible: boolean;
  order: number;
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  currency: 'USD' | 'KHR';
  exchangeRate: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  taxRate: number;
  lowStockThresholdDefault: number;
}

export interface AuthUser {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdByAdmin?: boolean;
  createdAt?: string;
  password?: string;
  pin?: string;
  hasPin: boolean;
  avatar?: string;
}

export type AuthMode = 'login' | 'register' | 'set_pin' | 'enter_pin' | 'authenticated';
