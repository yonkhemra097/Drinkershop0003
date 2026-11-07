import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Product,
  Category,
  Order,
  CartItem,
  UserAccount,
  StockRequest,
  InventoryLog,
  BottleneckAlert,
  DashboardWidget,
  Discount,
  StoreSettings,
  UserRole,
  OrderStatus,
  PaymentStatus,
  AuthUser,
  FulfillmentType,
  AppNotification,
  NotificationCategory,
} from '../types/index.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_USERS,
  INITIAL_STOCK_REQUESTS,
  INITIAL_INVENTORY_LOGS,
  INITIAL_BOTTLENECKS,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_STORE_SETTINGS,
  INITIAL_AUTH_USERS,
} from '../data/initialData.ts';
import {
  applyStockDelta,
  determineProductStatus,
  reorderDashboardWidgets,
  validatePinSetup,
  verifyUserPin,
} from '../utils/shopLogic.ts';
import {
  changeEmailPassword,
  createEmailPasswordAccount,
  reauthenticateWithEmailPassword,
  signInWithEmailPassword,
  signOutIdentityProvider,
} from '../utils/identityAuth.ts';
import {
  areFirebaseFunctionsEnabled,
  bootstrapInitialAdmin,
  placeOrderInCloud,
  provisionStaffAccount,
  updateCloudUserRole,
} from '../utils/firebaseFunctions.ts';
import {
  getAuthenticatedRole,
  isFirebaseConfigured,
  markCloudNotificationRead,
  saveAuthenticatedProfile,
  useFirestoreCollectionSync,
  useFirestoreSettingsSync,
} from '../utils/firestoreData.ts';
import type { AppLanguage } from '../utils/translations.ts';

export type AppView =
  | 'storefront'
  | 'dragdrop_dashboard'
  | 'admin'
  | 'manager'
  | 'driver'
  | 'member'
  | 'invoices';

const AUTH_STORAGE_VERSION = '7';
const bootstrapAdminEmail = (
  import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL || 'yonkhemra2108@gmail.com'
).trim().toLowerCase();

const demoRecordIds = new Set([
  ...Array.from({ length: 12 }, (_, index) => `prod-${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `ord-${index + 1}`),
  'usr-admin-1',
  'usr-mgr-1',
  'usr-staff-1',
  'usr-staff-2',
  'usr-staff-3',
  'usr-driver-1',
  'usr-driver-2',
  'usr-cust-1',
  'usr-new-1',
  'stk-req-1',
  'stk-req-2',
  'stk-req-3',
  'log-1',
  'log-2',
  'bot-1',
  'bot-2',
  'bot-3',
  'cat-all',
  'cat-water',
  'cat-soft',
  'cat-energy',
  'cat-juice',
  'cat-dairy',
  'cat-chips',
  'cat-biscuits',
  'cat-cakes',
  'cat-candies',
]);

function removeDemoRecords<T extends { id: string }>(records: T[]): T[] {
  return records.filter((record) => !demoRecordIds.has(record.id));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createLocalAccountId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function withoutLegacyPassword(user: AuthUser): AuthUser {
  const { password: _legacyPassword, ...safeUser } = user as AuthUser & { password?: string };
  return { ...safeUser, email: normalizeEmail(safeUser.email) };
}

function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled in Firebase Authentication.';
    case 'auth/admin-restricted-operation':
      return 'Firebase is restricting account creation to administrators. Enable email/password sign-up in Firebase Authentication, or have an administrator create this account.';
    case 'auth/network-request-failed':
      return 'Unable to reach Firebase. Check your internet connection and try again.';
    case 'auth/too-many-requests':
      return 'Firebase temporarily blocked sign-in after too many attempts. Stop retrying and try again later, or reset the account password in Firebase Console.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

async function getTrustedRole(
  identity: Awaited<ReturnType<typeof signInWithEmailPassword>>,
  email: string
): Promise<UserRole> {
  let role = await getAuthenticatedRole(identity);
  if (email !== bootstrapAdminEmail) return role;
  if (role !== 'admin') {
    if (!areFirebaseFunctionsEnabled()) {
      throw new Error('Administrator setup is unavailable while Cloud Functions are disabled for this project.');
    }
    await bootstrapInitialAdmin();
    await identity.getIdToken(true);
    role = await getAuthenticatedRole(identity);
  }
  return role;
}

function loadCurrentUser(): AuthUser | null {
  if (localStorage.getItem('sip_snack_auth_storage_version') !== AUTH_STORAGE_VERSION) {
    localStorage.removeItem('sip_snack_auth_user');
    localStorage.setItem('sip_snack_auth_storage_version', AUTH_STORAGE_VERSION);
    return null;
  }

  const saved = localStorage.getItem('sip_snack_auth_user');
  if (!saved) return null;
  try {
    const user = JSON.parse(saved) as AuthUser;
    if (!user.createdByAdmin) return { ...user, role: 'customer' };
    return user;
  } catch {
    localStorage.removeItem('sip_snack_auth_user');
    return null;
  }
}

interface StoreContextType {
  // Navigation & Role
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  appliedPromo: string | null;
  setAppliedPromo: (code: string | null) => void;
  discounts: Discount[];
  createDiscount: (discount: Omit<Discount, 'id' | 'createdBy' | 'createdAt'>) => { success: boolean; error?: string };
  deleteDiscount: (id: string) => void;

  // Orders
  orders: Order[];
  createOrder: (orderData: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    fulfillmentType: FulfillmentType;
    customerNotes?: string;
    items: { productId: string; productName: string; quantity: number; price: number }[];
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    paymentMethod: 'COD' | 'ABA PayWay' | 'Card';
    paymentStatus: PaymentStatus;
    promoCode?: string | null;
  }) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => void;
  setInvoiceReadiness: (orderId: string, ready: boolean) => void;
  notifications: AppNotification[];
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  publishAnnouncement: (message: string) => { success: boolean; error?: string };
  assignOrderDriver: (orderId: string, driverId: string, driverName: string) => void;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => void;

  // Inventory & Stock Requests
  stockRequests: StockRequest[];
  approveStockRequest: (requestId: string) => void;
  denyStockRequest: (requestId: string) => void;
  createStockRequest: (req: Omit<StockRequest, 'id' | 'createdAt' | 'status'>) => void;
  adjustProductStock: (productId: string, delta: number, reason: string, actor?: string) => void;
  inventoryLogs: InventoryLog[];

  // Bottlenecks
  bottlenecks: BottleneckAlert[];
  resolveBottleneck: (id: string) => void;
  addBottleneck: (alert: Omit<BottleneckAlert, 'id' | 'timestamp'>) => void;

  // Users & operational roles
  users: UserAccount[];
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateCurrentUserProfile: (profile: { name: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  toggleClockIn: (userId: string) => void;

  // Dashboard & Widgets
  dashboardWidgets: DashboardWidget[];
  reorderWidgets: (activeId: string, overId: string) => void;
  toggleWidgetVisibility: (id: string) => void;
  updateWidgetColSpan: (id: string, colSpan: 1 | 2 | 3) => void;
  resetDashboardLayout: () => void;
  addWidget: (widget: Omit<DashboardWidget, 'id' | 'order'>) => void;

  // Member / Loyalty
  memberPoints: number;
  redeemPoints: (points: number, rewardTitle: string) => boolean;

  // Store Settings
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => void;
  languagePreference: AppLanguage;
  setLanguagePreference: (language: AppLanguage) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  fontSizePreference: 'small' | 'normal' | 'large';
  setFontSizePreference: (size: 'small' | 'normal' | 'large') => void;

  // Live simulation
  // Toast
  toast: { message: string; type?: 'success' | 'info' | 'warning' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  // Authentication & PIN
  currentUser: AuthUser | null;
  allAuthUsers: AuthUser[];
  isLocked: boolean;
  authModalOpen: boolean;
  authView: 'login' | 'register' | 'set_pin' | 'enter_pin';
  setAuthView: (view: 'login' | 'register' | 'set_pin' | 'enter_pin') => void;
  openAuthModal: (view?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    pin: string;
    confirmPin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  createStaffAccount: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'admin' | 'manager' | 'staff' | 'driver';
  }) => Promise<{ success: boolean; error?: string }>;
  setAndConfirmPin: (pin: string, confirmPin: string) => { success: boolean; error?: string };
  unlockWithPin: (enteredPin: string) => { success: boolean; error?: string };
  lockSystem: () => void;
  logout: () => void;
  changePin: (oldPin: string, newPin: string, confirmPin: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
}

interface ProductCostRecord {
  id: string;
  costPrice: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<AppView>('storefront');

  // Core Data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('sip_snack_products');
    const records = saved ? JSON.parse(saved) as Product[] : INITIAL_PRODUCTS;
    return removeDemoRecords(records);
  });
  const [productCosts, setProductCosts] = useState<ProductCostRecord[]>(() =>
    products.map(({ id, costPrice }) => ({ id, costPrice }))
  );

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('sip_snack_categories');
    const records = saved ? JSON.parse(saved) as Category[] : INITIAL_CATEGORIES;
    return removeDemoRecords(records);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('sip_snack_orders');
    const records = saved ? JSON.parse(saved) as Order[] : INITIAL_ORDERS;
    return removeDemoRecords(records);
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('sip_snack_notifications');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as AppNotification[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem('sip_snack_notifications');
      return [];
    }
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('sip_snack_users');
    if (!saved) return INITIAL_USERS;
    const savedUsers = JSON.parse(saved) as UserAccount[];
    return removeDemoRecords(savedUsers);
  });

  const [stockRequests, setStockRequests] = useState<StockRequest[]>(() => {
    const saved = localStorage.getItem('sip_snack_stock_requests');
    const records = saved ? JSON.parse(saved) as StockRequest[] : INITIAL_STOCK_REQUESTS;
    return removeDemoRecords(records);
  });

  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
    const saved = localStorage.getItem('sip_snack_inventory_logs');
    const records = saved ? JSON.parse(saved) as InventoryLog[] : INITIAL_INVENTORY_LOGS;
    return removeDemoRecords(records);
  });

  const [bottlenecks, setBottlenecks] = useState<BottleneckAlert[]>(() => {
    const saved = localStorage.getItem('sip_snack_bottlenecks');
    const records = saved ? JSON.parse(saved) as BottleneckAlert[] : INITIAL_BOTTLENECKS;
    return removeDemoRecords(records);
  });

  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem('sip_snack_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_WIDGETS;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('sip_snack_settings');
    const settings = saved
      ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) as Partial<StoreSettings> }
      : DEFAULT_STORE_SETTINGS;
    if (settings.address === '108 Artisan Avenue, Downtown Hub, Suite 100') {
      settings.address = '';
    }
    return settings;
  });
  const [languagePreference, setLanguagePreferenceState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('sip_snack_language');
    return saved === 'km' ? 'km' : 'en';
  });
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('sip_snack_dark_mode') === 'true'
  );
  const [fontSizePreference, setFontSizePreference] = useState<'small' | 'normal' | 'large'>(() => {
    const saved = localStorage.getItem('sip_snack_font_size');
    return saved === 'small' || saved === 'large' ? saved : 'normal';
  });

  const setLanguagePreference = useCallback((language: AppLanguage) => {
    setLanguagePreferenceState(language);
  }, []);

  // Cart & Loyalty
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>(() => {
    const saved = localStorage.getItem('sip_snack_discounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [memberPoints, setMemberPoints] = useState<number>(0);

  // Toasts
  // Authentication & PIN
  const [allAuthUsers, setAllAuthUsers] = useState<AuthUser[]>(() => {
    const saved = localStorage.getItem('sip_snack_all_auth_users');
    if (!saved) return INITIAL_AUTH_USERS;
    try {
      const savedUsers = JSON.parse(saved) as AuthUser[];
      return Array.isArray(savedUsers)
        ? savedUsers.filter((user) => user.id !== 'local-admin').map(withoutLegacyPassword)
        : INITIAL_AUTH_USERS;
    } catch {
      localStorage.removeItem('sip_snack_all_auth_users');
      return INITIAL_AUTH_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(loadCurrentUser);

  const [isLocked, setIsLocked] = useState<boolean>(currentUser !== null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(true);
  const [authView, setAuthView] = useState<'login' | 'register' | 'set_pin' | 'enter_pin'>(
    currentUser ? 'enter_pin' : 'login'
  );

  // Persistence helpers
  useEffect(() => {
    localStorage.setItem('sip_snack_all_auth_users', JSON.stringify(allAuthUsers));
  }, [allAuthUsers]);

  useEffect(() => {
    localStorage.setItem('sip_snack_language', languagePreference);
    document.documentElement.lang = languagePreference;
  }, [languagePreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    document.documentElement.dataset.fontSize = fontSizePreference;
    localStorage.setItem('sip_snack_dark_mode', String(darkMode));
    localStorage.setItem('sip_snack_font_size', fontSizePreference);
  }, [darkMode, fontSizePreference]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sip_snack_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sip_snack_auth_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('sip_snack_is_locked', isLocked ? 'true' : 'false');
  }, [isLocked]);

  useEffect(() => {
    localStorage.setItem('sip_snack_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sip_snack_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('sip_snack_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const syncNotifications = (event: StorageEvent) => {
      if (event.key !== 'sip_snack_notifications') return;
      try {
        const next = event.newValue ? JSON.parse(event.newValue) as AppNotification[] : [];
        if (!Array.isArray(next)) throw new Error('Invalid notification data in local storage.');
        setNotifications(next);
      } catch (error) {
        console.error('Could not sync notifications from another tab.', error);
      }
    };
    window.addEventListener('storage', syncNotifications);
    return () => window.removeEventListener('storage', syncNotifications);
  }, []);

  useEffect(() => {
    localStorage.setItem('sip_snack_widgets', JSON.stringify(dashboardWidgets));
  }, [dashboardWidgets]);

  useEffect(() => {
    localStorage.setItem('sip_snack_discounts', JSON.stringify(discounts));
  }, [discounts]);

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const firestoreError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);
  const firestoreUid = currentUser?.firebaseUid || currentUser?.id;
  const hasManagementAccess = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canAccessStoreOperations = hasManagementAccess;
  const productCostsById = useRef(new Map<string, number>());
  productCostsById.current = new Map(productCosts.map(({ id, costPrice }) => [id, costPrice]));
  const setSyncedProducts = useCallback<React.Dispatch<React.SetStateAction<Product[]>>>((nextProducts) => {
    setProducts((previous) => {
      const records = typeof nextProducts === 'function' ? nextProducts(previous) : nextProducts;
      return records.map((product) => ({
        ...product,
        costPrice: hasManagementAccess
          ? productCostsById.current.get(product.id) ?? product.costPrice ?? 0
          : 0,
      }));
    });
  }, [hasManagementAccess]);

  useFirestoreCollectionSync(
    'products', products, setSyncedProducts, firestoreUid, currentUser?.role, true,
    hasManagementAccess, firestoreError
  );
  useFirestoreCollectionSync(
    'productCosts', productCosts, setProductCosts, firestoreUid, currentUser?.role,
    hasManagementAccess, hasManagementAccess, firestoreError
  );
  useFirestoreCollectionSync(
    'categories', categories, setCategories, firestoreUid, currentUser?.role, true,
    hasManagementAccess, firestoreError
  );
  useFirestoreCollectionSync(
    'orders', orders, setOrders, firestoreUid, currentUser?.role, Boolean(firestoreUid),
    hasManagementAccess || currentUser?.role === 'driver', firestoreError
  );
  useFirestoreCollectionSync(
    'users', users, setUsers, firestoreUid, currentUser?.role, Boolean(firestoreUid),
    hasManagementAccess, firestoreError
  );
  useFirestoreCollectionSync(
    'stockRequests', stockRequests, setStockRequests, firestoreUid, currentUser?.role,
    Boolean(firestoreUid), canAccessStoreOperations, firestoreError
  );
  useFirestoreCollectionSync(
    'inventoryLogs', inventoryLogs, setInventoryLogs, firestoreUid, currentUser?.role,
    Boolean(firestoreUid), canAccessStoreOperations, firestoreError
  );
  useFirestoreCollectionSync(
    'bottlenecks', bottlenecks, setBottlenecks, firestoreUid, currentUser?.role,
    Boolean(firestoreUid), canAccessStoreOperations, firestoreError
  );
  useFirestoreCollectionSync(
    'discounts', discounts, setDiscounts, firestoreUid, currentUser?.role, true,
    hasManagementAccess, firestoreError
  );
  useFirestoreCollectionSync(
    'notifications', notifications, setNotifications, firestoreUid, currentUser?.role,
    Boolean(firestoreUid), hasManagementAccess, firestoreError
  );
  useFirestoreSettingsSync(settings, setSettings, hasManagementAccess, firestoreError);

  useEffect(() => {
    if (!hasManagementAccess) return;
    const costs = new Map(productCosts.map(({ id, costPrice }) => [id, costPrice]));
    setProducts((previous) => previous.map((product) => {
      const costPrice = costs.get(product.id);
      return costPrice === undefined || product.costPrice === costPrice
        ? product
        : { ...product, costPrice };
    }));
  }, [hasManagementAccess, productCosts]);

  useEffect(() => {
    if (!currentUser) {
      setMemberPoints(0);
      return;
    }
    const userId = currentUser.firebaseUid || currentUser.id;
    const profile = users.find((user) => user.id === userId);
    if (profile) setMemberPoints(profile.memberPoints || 0);
  }, [currentUser, users]);

  const addNotification = useCallback((
    category: NotificationCategory,
    title: string,
    message: string,
    values: Record<string, string | number> = {}
  ) => {
    const notification: AppNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      title,
      message,
      values,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    setNotifications((previous) => [notification, ...previous].slice(0, 100));
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    if (!currentUser) return;
    const readerId = currentUser.firebaseUid || currentUser.id;
    if (currentUser.role === 'customer' && isFirebaseConfigured()) {
      void markCloudNotificationRead(readerId, [notificationId]).catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Could not save the notification status.', 'error');
      });
    }
    setNotifications((previous) => previous.map((notification) =>
      notification.id === notificationId && !notification.readBy.includes(readerId)
        ? { ...notification, readBy: [...notification.readBy, readerId] }
        : notification
    ));
  }, [currentUser, showToast]);

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    const readerId = currentUser.firebaseUid || currentUser.id;
    const unreadIds = notifications
      .filter((notification) => !notification.readBy.includes(readerId))
      .map((notification) => notification.id);
    if (currentUser.role === 'customer' && isFirebaseConfigured()) {
      void markCloudNotificationRead(readerId, unreadIds).catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Could not save notification statuses.', 'error');
      });
    }
    setNotifications((previous) => previous.map((notification) =>
      notification.readBy.includes(readerId)
        ? notification
        : { ...notification, readBy: [...notification.readBy, readerId] }
    ));
  }, [currentUser, notifications, showToast]);

  const publishAnnouncement = useCallback((message: string) => {
    if (currentUser?.role !== 'admin') {
      return { success: false, error: 'Only administrators can send announcements.' };
    }
    const content = message.trim();
    if (!content) return { success: false, error: 'Enter an announcement before sending.' };
    addNotification('announcement', 'Admin announcement', content);
    showToast('Announcement sent to all users.', 'success');
    return { success: true };
  }, [addNotification, currentUser, showToast]);

  // Products CRUD
  const addProduct = useCallback((newProd: Omit<Product, 'id'>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can add products.', 'error');
      return;
    }
    const id = `prod-${Date.now()}`;
    const product: Product = {
      ...newProd,
      id,
      status: determineProductStatus(newProd.stock, newProd.lowStockThreshold),
    };
    setProducts((prev) => [product, ...prev]);
    setProductCosts((prev) => [{ id, costPrice: product.costPrice }, ...prev]);
    showToast(`Added product "${product.name}" successfully!`);
  }, [currentUser, showToast]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can update products.', 'error');
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.stock !== undefined || updates.lowStockThreshold !== undefined) {
          updated.status = determineProductStatus(
            updated.stock,
            updated.lowStockThreshold
          );
        }
        return updated;
      })
    );
    if (updates.costPrice !== undefined) {
      const costPrice = updates.costPrice;
      setProductCosts((previous) => previous.map((product) =>
        product.id === id ? { ...product, costPrice } : product
      ));
    }
    showToast(`Product updated successfully!`);
  }, [currentUser, showToast]);

  const deleteProduct = useCallback((id: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can delete products.', 'error');
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setProductCosts((prev) => prev.filter((product) => product.id !== id));
    showToast('Product deleted from catalog.', 'info');
  }, [currentUser, showToast]);

  // Categories CRUD
  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can add categories.', 'error');
      return;
    }
    const id = `cat-${Date.now()}`;
    setCategories((prev) => [...prev, { ...cat, id }]);
    showToast(`Added category "${cat.name}".`);
  }, [currentUser, showToast]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can update categories.', 'error');
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    showToast('Category updated.');
  }, [currentUser, showToast]);

  const deleteCategory = useCallback((id: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can delete categories.', 'error');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Category deleted.', 'info');
  }, [currentUser, showToast]);

  const createDiscount = useCallback(
    (discountData: Omit<Discount, 'id' | 'createdBy' | 'createdAt'>) => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        return { success: false, error: 'Only an administrator or manager can create discounts.' };
      }
      const code = discountData.code.trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
        return { success: false, error: 'Discount codes must be 3–20 letters, numbers, or hyphens.' };
      }
      if (!discountData.description.trim()) {
        return { success: false, error: 'Enter a description for the discount.' };
      }
      if (
        !Number.isFinite(discountData.value) ||
        discountData.value <= 0 ||
        (discountData.type === 'percent' && discountData.value > 100)
      ) {
        return {
          success: false,
          error: discountData.type === 'percent'
            ? 'Percentage discounts must be greater than 0 and no more than 100.'
            : 'Fixed discounts must be greater than 0.',
        };
      }
      const builtInCodes = ['SIP20', 'SNACKTIME', 'FREESHIPGOLD', 'FRUITBOX'];
      if (
        builtInCodes.includes(code) ||
        discounts.some((discount) => discount.code.toUpperCase() === code)
      ) {
        return { success: false, error: 'That discount code is already in use.' };
      }

      setDiscounts((previous) => [
        ...previous,
        {
          ...discountData,
          code,
          description: discountData.description.trim(),
          id: `discount-${Date.now()}`,
          createdBy: currentUser.name,
          createdAt: new Date().toISOString(),
        },
      ]);
      showToast(`Discount "${code}" created.`, 'success');
      return { success: true };
    },
    [currentUser, discounts, showToast]
  );

  const deleteDiscount = useCallback(
    (id: string) => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        showToast('Only an administrator or manager can remove discounts.', 'error');
        return;
      }
      const discount = discounts.find((item) => item.id === id);
      setDiscounts((previous) => previous.filter((item) => item.id !== id));
      if (discount && appliedPromo?.toUpperCase() === discount.code) setAppliedPromo(null);
      showToast('Discount removed.', 'info');
    },
    [appliedPromo, currentUser, discounts, showToast]
  );

  // Cart operations
  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`Added ${quantity}x ${product.name} to cart!`);
  }, [showToast]);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart.', 'info');
  }, [showToast]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Inventory adjustment
  const adjustProductStock = useCallback(
    (productId: string, delta: number, reason: string, actor = 'Operations Admin') => {
      if (
        actor !== 'Order Checkout' &&
        currentUser?.role !== 'admin' &&
        currentUser?.role !== 'manager'
      ) {
        showToast('Only an administrator or manager can adjust stock.', 'error');
        return;
      }
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const { newStock, status } = applyStockDelta(p.stock, delta, p.lowStockThreshold);

          // Add to inventory logs
          const log: InventoryLog = {
            id: `log-${Date.now()}`,
            productId: p.id,
            productName: p.name,
            previousQuantity: p.stock,
            changeQuantity: delta,
            newQuantity: newStock,
            reason,
            actor,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setInventoryLogs((logs) => [log, ...logs]);

          return {
            ...p,
            stock: newStock,
            status,
          };
        })
      );
      showToast(`Stock updated (${delta > 0 ? `+${delta}` : delta}) for product.`);
    },
    [currentUser, showToast]
  );

  // Orders CRUD & Checkout
  const createOrder = useCallback(
    async (orderData: {
      customerId?: string;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      fulfillmentType: FulfillmentType;
      customerNotes?: string;
      items: { productId: string; productName: string; quantity: number; price: number }[];
      subtotal: number;
      discount: number;
      deliveryFee: number;
      total: number;
      paymentMethod: 'COD' | 'ABA PayWay' | 'Card';
      paymentStatus: PaymentStatus;
      promoCode?: string | null;
    }): Promise<Order> => {
      if (isFirebaseConfigured()) {
        if (!areFirebaseFunctionsEnabled()) {
          throw new Error('Checkout is unavailable because Cloud Functions are disabled for this Firebase project.');
        }
        const { order, memberPoints } = await placeOrderInCloud({
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          fulfillmentType: orderData.fulfillmentType,
          customerNotes: orderData.customerNotes,
          items: orderData.items.map(({ productId, quantity }) => ({ productId, quantity })),
          paymentMethod: orderData.paymentMethod,
          promoCode: orderData.promoCode || undefined,
        });

        if (!firestoreUid) setOrders((previous) => [order, ...previous]);
        if (memberPoints !== undefined) setMemberPoints(memberPoints);
        else setMemberPoints((points) => points + Math.floor(order.total * 10));
        clearCart();
        showToast(`Order ${order.orderNumber} placed successfully!`);
        return order;
      }

      const orderNum = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: orderNum,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        fulfillmentType: orderData.fulfillmentType,
        customerNotes: orderData.customerNotes,
        items: orderData.items,
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        deliveryFee: orderData.deliveryFee,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        status: orderData.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
        invoiceReady: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Deduct stock safely
      orderData.items.forEach((item) => {
        adjustProductStock(item.productId, -item.quantity, `Order ${orderNum} fulfillment deduction`, 'Order Checkout');
      });

      // Add points for member (10 pts per $1)
      setMemberPoints((pts) => pts + Math.floor(orderData.total * 10));

      setOrders((prev) => [newOrder, ...prev]);
      addNotification(
        'order',
        'New order',
        'Order {orderNumber} was placed by {customerName}.',
        { orderNumber: orderNum, customerName: orderData.customerName }
      );
      clearCart();
      showToast(`Order ${orderNum} placed successfully!`);
      return newOrder;
    },
    [addNotification, adjustProductStock, clearCart, firestoreUid, showToast]
  );

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status === status) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
    showToast(`Order status updated to "${status}".`);
    addNotification('order', 'Order status updated', '{orderNumber} is now {status}.', {
      orderNumber: order.orderNumber,
      status,
    });
  }, [addNotification, orders, showToast]);

  const updateOrderPaymentStatus = useCallback((orderId: string, paymentStatus: PaymentStatus) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.paymentStatus === paymentStatus) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o))
    );
    showToast(`Payment status updated to "${paymentStatus}".`);
    addNotification('order', 'Payment updated', 'Payment for {orderNumber} is now {status}.', {
      orderNumber: order.orderNumber,
      status: paymentStatus,
    });
  }, [addNotification, orders, showToast]);

  const setInvoiceReadiness = useCallback((orderId: string, ready: boolean) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can update invoice readiness.', 'error');
      return;
    }
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.invoiceReady === ready) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, invoiceReady: ready, updatedAt: new Date().toISOString() }
          : order
      )
    );
    showToast(ready ? 'Invoice confirmed ready.' : 'Invoice marked not ready.', 'success');
    addNotification(
      'invoice',
      ready ? 'Invoice ready' : 'Invoice not ready',
      ready ? 'Invoice {orderNumber} is ready.' : 'Invoice {orderNumber} is not ready.',
      { orderNumber: order.orderNumber }
    );
  }, [addNotification, currentUser, orders, showToast]);

  const assignOrderDriver = useCallback((orderId: string, driverId: string, driverName: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, driverId, driverName, updatedAt: new Date().toISOString() } : o))
    );
    showToast(`Assigned ${driverName} to order.`);
  }, [showToast]);

  const updateOrderDetails = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o))
    );
    showToast('Order details updated.');
  }, [showToast]);

  // Stock Requests
  const approveStockRequest = useCallback(
    (requestId: string) => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        showToast('Only an administrator or manager can approve stock requests.', 'error');
        return;
      }
      const req = stockRequests.find((r) => r.id === requestId);
      if (!req) return;

      adjustProductStock(req.productId, req.unitsDelta, `Manager approved request: ${req.reason}`, 'Store Manager');
      setStockRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
      );
      showToast(`Approved stock request for ${req.productName}.`);
    },
    [stockRequests, adjustProductStock, currentUser, showToast]
  );

  const denyStockRequest = useCallback((requestId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can deny stock requests.', 'error');
      return;
    }
    setStockRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'denied' } : r))
    );
    showToast('Stock request denied.', 'warning');
  }, [currentUser, showToast]);

  const createStockRequest = useCallback(
    (req: Omit<StockRequest, 'id' | 'createdAt' | 'status'>) => {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        showToast('Only an administrator or manager can create stock requests.', 'error');
        return;
      }
      const newReq: StockRequest = {
        ...req,
        id: `stk-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setStockRequests((prev) => [newReq, ...prev]);
      showToast('Stock adjustment request submitted to manager.');
    },
    [currentUser, showToast]
  );

  // Bottlenecks
  const resolveBottleneck = useCallback((id: string) => {
    setBottlenecks((prev) => prev.filter((b) => b.id !== id));
    showToast('Bottleneck resolved and cleared!', 'success');
  }, [showToast]);

  const addBottleneck = useCallback((alert: Omit<BottleneckAlert, 'id' | 'timestamp'>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can create fulfillment alerts.', 'error');
      return;
    }
    const newAlert: BottleneckAlert = {
      ...alert,
      id: `bot-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setBottlenecks((prev) => [newAlert, ...prev]);
  }, [currentUser, showToast]);

  // Users
  const updateUser = useCallback((id: string, updates: Partial<UserAccount>) => {
    if (currentUser?.role !== 'admin') {
      showToast('Only an administrator can manage user accounts.', 'error');
      return;
    }
    const targetUser = users.find((user) => user.id === id);
    const applyUpdates = () => {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates, createdByAdmin: true } : u))
      );
      const authUpdates: Partial<AuthUser> = {};
      if (updates.name !== undefined) authUpdates.name = updates.name;
      if (updates.email !== undefined) authUpdates.email = updates.email;
      if (updates.phone !== undefined) authUpdates.phone = updates.phone;
      if (updates.role !== undefined) authUpdates.role = updates.role;
      if (updates.avatar !== undefined) authUpdates.avatar = updates.avatar;
      authUpdates.createdByAdmin = true;
      setAllAuthUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...authUpdates } : user)));
      setCurrentUser((user) => user?.id === id ? { ...user, ...authUpdates } : user);
      showToast('User profile updated.');
      if (targetUser && (updates.name !== undefined || updates.role !== undefined || updates.email !== undefined)) {
        addNotification('account', 'Account updated', 'Account updated for {name}.', {
          name: updates.name ?? targetUser.name,
        });
      }
    };

    if (updates.role !== undefined) {
      if (!targetUser?.email) {
        showToast('The Firebase account email could not be found.', 'error');
        return;
      }
      void updateCloudUserRole(targetUser.email, updates.role)
        .then(applyUpdates)
        .catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Could not update the Firebase account role.', 'error');
        });
      return;
    }
    applyUpdates();
  }, [addNotification, currentUser, showToast, users]);

  const addUser = useCallback((newUser: Omit<UserAccount, 'id'>) => {
    if (currentUser?.role !== 'admin') {
      showToast('Only an administrator can add user accounts.', 'error');
      return;
    }
    const user: UserAccount = {
      ...newUser,
      id: `usr-${Date.now()}`,
    };
    setUsers((prev) => [...prev, user]);
    addNotification('account', 'Account created', 'An account was created for {name}.', { name: user.name });
    showToast(`Created account for ${user.name}.`);
  }, [addNotification, currentUser, showToast]);

  const updateCurrentUserProfile = useCallback(
    async (profile: { name: string; phone: string }) => {
      if (!currentUser) return { success: false, error: 'Sign in before editing your profile.' };
      const name = profile.name.trim();
      const phone = profile.phone.trim();
      if (!name) return { success: false, error: 'Name is required.' };

      const authUpdates: Partial<AuthUser> = { name, phone };
      const updatedUser = { ...currentUser, ...authUpdates };
      if (isFirebaseConfigured()) {
        try {
          await saveAuthenticatedProfile(updatedUser);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Could not save the profile to Firestore.',
          };
        }
      }
      setAllAuthUsers((previous) =>
        previous.map((user) => (user.id === currentUser.id ? { ...user, ...authUpdates } : user))
      );
      setUsers((previous) =>
        previous.map((user) =>
          user.id === currentUser.id ? { ...user, name, phone } : user
        )
      );
      setCurrentUser((user) => (user ? { ...user, ...authUpdates } : user));
      showToast('Profile updated successfully.', 'success');
      return { success: true };
    },
    [currentUser, showToast]
  );

  const toggleClockIn = useCallback((userId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      showToast('Only an administrator or manager can update shift attendance.', 'error');
      return;
    }
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newShift = u.shiftStatus === 'clocked_in' ? 'clocked_out' : 'clocked_in';
        return { ...u, shiftStatus: newShift };
      })
    );
    showToast('Attendance status updated.');
  }, [currentUser, showToast]);

  // Dashboard Widget Drag and Drop
  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setDashboardWidgets((prev) => reorderDashboardWidgets(prev, activeId, overId));
  }, []);

  const toggleWidgetVisibility = useCallback((id: string) => {
    setDashboardWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const updateWidgetColSpan = useCallback((id: string, colSpan: 1 | 2 | 3) => {
    setDashboardWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, colSpan } : w))
    );
  }, []);

  const resetDashboardLayout = useCallback(() => {
    setDashboardWidgets(DEFAULT_DASHBOARD_WIDGETS);
    showToast('Dashboard widgets reset to default layout.');
  }, [showToast]);

  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'order'>) => {
    setDashboardWidgets((prev) => [
      ...prev,
      {
        ...widget,
        id: `w-${Date.now()}`,
        order: prev.length,
      },
    ]);
    showToast(`Added "${widget.title}" widget to dashboard.`);
  }, [showToast]);

  // Loyalty Points
  const redeemPoints = useCallback(
    (points: number, rewardTitle: string): boolean => {
      if (currentUser?.role === 'manager') {
        showToast('Managers can view member rewards but cannot redeem points.', 'error');
        return false;
      }
      if (memberPoints < points) {
        showToast('Insufficient reward points available.', 'warning');
        return false;
      }
      setMemberPoints((prev) => prev - points);
      showToast(`Redeemed "${rewardTitle}" successfully! Check your promo vouchers.`);
      return true;
    },
    [currentUser, memberPoints, showToast]
  );

  // Settings
  const updateSettings = useCallback((updates: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    showToast('Store settings saved.');
  }, [showToast]);

  // Auth & PIN handlers
  const openAuthModal = useCallback((view: 'login' | 'register' = 'login') => {
    setAuthView(view);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    if (currentUser && !isLocked) {
      setAuthModalOpen(false);
    }
  }, [currentUser, isLocked]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isFirebaseConfigured()) {
        try {
          const identity = await signInWithEmailPassword(email.trim(), password);
          const normalizedEmailValue = identity.email?.trim().toLowerCase();
          if (!normalizedEmailValue) {
            return { success: false, error: 'Firebase did not return an email address for this account.' };
          }

          const existing = allAuthUsers.find((user) => user.email.toLowerCase() === normalizedEmailValue);
          const role = await getTrustedRole(identity, normalizedEmailValue);
          const authenticatedUser: AuthUser = existing
            ? {
                ...existing,
                firebaseUid: identity.uid,
                name: identity.displayName || existing.name,
                email: normalizedEmailValue,
                avatar: identity.photoURL || existing.avatar,
                role,
                createdByAdmin: role !== 'customer',
                createdAt: existing.createdAt || identity.metadata.creationTime || new Date().toISOString(),
              }
            : {
                id: identity.uid,
                firebaseUid: identity.uid,
                name: identity.displayName || normalizedEmailValue,
                email: normalizedEmailValue,
                phone: identity.phoneNumber || '',
                role,
                createdByAdmin: role !== 'customer',
                hasPin: false,
                createdAt: identity.metadata.creationTime || new Date().toISOString(),
                avatar: identity.photoURL || undefined,
              };

          authenticatedUser.createdAt = await saveAuthenticatedProfile(authenticatedUser);
          setAllAuthUsers((previous) =>
            existing
              ? previous.map((user) => (user.id === existing.id ? authenticatedUser : user))
              : [...previous, authenticatedUser]
          );
          setUsers((previous) => {
            const existingAccount = previous.find(
              (user) => user.id === authenticatedUser.id || user.email.toLowerCase() === normalizedEmailValue
            );
            if (existingAccount) {
              return previous.map((user) =>
                user.id === existingAccount.id
                  ? {
                      ...user,
                      name: authenticatedUser.name,
                      phone: authenticatedUser.phone || '',
                      role: authenticatedUser.role,
                      createdByAdmin: authenticatedUser.createdByAdmin,
                      createdAt: authenticatedUser.createdAt,
                      avatar: authenticatedUser.avatar,
                    }
                  : user
              );
            }

            return [
              ...previous,
              {
                id: authenticatedUser.id,
                name: authenticatedUser.name,
                email: authenticatedUser.email,
                phone: authenticatedUser.phone || '',
                role: authenticatedUser.role,
                createdByAdmin: authenticatedUser.createdByAdmin,
                createdAt: authenticatedUser.createdAt,
                status: 'active',
                avatar: authenticatedUser.avatar,
              },
            ];
          });
          setCurrentUser(authenticatedUser);

          if (!authenticatedUser.hasPin || !authenticatedUser.pin) {
            setAuthView('set_pin');
            setAuthModalOpen(true);
            setIsLocked(true);
            showToast(`Welcome ${authenticatedUser.name}! Please set your 4- or 6-digit security PIN.`, 'info');
            return { success: true };
          }

          setIsLocked(true);
          setAuthView('enter_pin');
          setAuthModalOpen(true);
          showToast(`Password verified. Enter your PIN to continue, ${authenticatedUser.name}.`, 'info');
          return { success: true };
        } catch (error) {
          return { success: false, error: getFirebaseAuthErrorMessage(error) };
        }
      }

      const normalizedEmailValue = normalizeEmail(email);
      const localUser = allAuthUsers.find(
        (user) => normalizeEmail(user.email) === normalizedEmailValue && user.password === password.trim()
      );
      if (!localUser) {
        return { success: false, error: 'Invalid email or password. Please verify your credentials.' };
      }

      const authenticatedUser: AuthUser = {
        ...localUser,
        email: normalizedEmailValue,
        hasPin: localUser.hasPin || Boolean(localUser.pin),
        createdAt: localUser.createdAt ?? new Date().toISOString(),
      };

      setCurrentUser(authenticatedUser);
      setIsLocked(true);
      setAuthView('enter_pin');
      setAuthModalOpen(true);
      showToast(`Password verified. Enter your PIN to continue, ${authenticatedUser.name}.`, 'info');
      return { success: true };
    },
    [allAuthUsers, showToast]
  );

  const register = useCallback(
    async (userData: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      pin: string;
      confirmPin: string;
    }) => {
      const pinCheck = validatePinSetup(userData.pin, userData.confirmPin);
      if (!pinCheck.valid) {
        return { success: false, error: pinCheck.error || 'Invalid PIN.' };
      }
      if (userData.password.length < 6) {
        return { success: false, error: 'Choose a password with at least 6 characters.' };
      }

      const normalizedEmail = normalizeEmail(userData.email);
      const existing = allAuthUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
      if (existing) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const createdAt = new Date().toISOString();
      const newUser: AuthUser = {
        id: createLocalAccountId('local-user'),
        name: userData.name.trim(),
        email: normalizedEmail,
        role: 'customer',
        createdByAdmin: false,
        createdAt,
        password: userData.password,
        phone: userData.phone?.trim() || '',
        pin: userData.pin.trim(),
        hasPin: true,
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      };

      if (isFirebaseConfigured()) {
        try {
          const identity = await createEmailPasswordAccount(normalizedEmail, userData.password);
          const firebaseUser: AuthUser = {
            ...newUser,
            id: identity.uid,
            firebaseUid: identity.uid,
            createdAt: identity.metadata.creationTime || createdAt,
          };

          const persistedUser = {
            ...firebaseUser,
            createdAt: await saveAuthenticatedProfile(firebaseUser),
          };
          setAllAuthUsers((previous) => [...previous, persistedUser]);
          setUsers((previous) => {
            const existingAccount = previous.find(
              (user) => user.id === persistedUser.id || user.email.toLowerCase() === normalizedEmail
            );
            if (existingAccount) {
              return previous.map((user) =>
                user.id === existingAccount.id
                  ? {
                      ...user,
                      name: persistedUser.name,
                      phone: persistedUser.phone || '',
                      role: persistedUser.role,
                      createdByAdmin: false,
                      createdAt: persistedUser.createdAt,
                      avatar: persistedUser.avatar,
                    }
                  : user
              );
            }

            return [
              ...previous,
              {
                id: persistedUser.id,
                name: persistedUser.name,
                email: persistedUser.email,
                phone: persistedUser.phone || '',
                role: persistedUser.role,
                createdAt: persistedUser.createdAt,
                status: 'active',
                avatar: persistedUser.avatar,
              },
            ];
          });
          setCurrentUser(persistedUser);
          addNotification('account', 'New account created', 'A customer account was created for {name}.', {
            name: persistedUser.name,
          });

          setIsLocked(true);
          setAuthView('enter_pin');
          setAuthModalOpen(true);
          showToast(`Account created for ${persistedUser.name}. Enter your PIN to continue.`, 'info');
          return { success: true };
        } catch (error) {
          return { success: false, error: getFirebaseAuthErrorMessage(error) };
        }
      }

      setAllAuthUsers((previous) => [...previous, newUser]);
      setUsers((previous) => [
        ...previous,
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone || '',
          role: newUser.role,
          createdByAdmin: false,
          createdAt,
          status: 'active',
          avatar: newUser.avatar,
        },
      ]);
      setCurrentUser(newUser);
      addNotification('account', 'New account created', 'A customer account was created for {name}.', {
        name: newUser.name,
      });

      setIsLocked(true);
      setAuthView('enter_pin');
      setAuthModalOpen(true);
      showToast(`Account created for ${newUser.name}. Enter your PIN to continue.`, 'info');
      return { success: true };
    },
    [addNotification, allAuthUsers, showToast]
  );

  const createStaffAccount = useCallback(
    async (userData: {
      name: string;
      email: string;
      phone: string;
      password: string;
      role: 'admin' | 'manager' | 'staff' | 'driver';
    }) => {
      if (currentUser?.role !== 'admin') {
        return { success: false, error: 'Only an administrator can create staff accounts.' };
      }
      if (isFirebaseConfigured() && !areFirebaseFunctionsEnabled()) {
        return { success: false, error: 'Staff account creation is unavailable because Cloud Functions are disabled for this Firebase project.' };
      }

      const normalizedEmail = normalizeEmail(userData.email);
      if (!userData.name.trim() || !normalizedEmail || userData.password.length < 8) {
        return { success: false, error: 'Enter a name, email, and a temporary password of at least 8 characters.' };
      }
      const existing = allAuthUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
      if (existing && !existing.createdByAdmin) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const createdAt = new Date().toISOString();
      const newUser: AuthUser = {
        id: existing?.id || createLocalAccountId('staff-user'),
        firebaseUid: existing?.firebaseUid || undefined,
        name: userData.name.trim(),
        email: normalizedEmail,
        phone: userData.phone.trim(),
        role: userData.role,
        createdByAdmin: true,
        createdAt,
        password: userData.password,
        hasPin: false,
      };
      const newAccount: UserAccount = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        role: newUser.role,
        createdByAdmin: true,
        createdAt,
        status: 'active',
        shiftStatus: 'clocked_out',
        assignment:
          newUser.role === 'admin'
            ? 'Admin'
            : newUser.role === 'driver'
              ? 'Courier'
              : newUser.role === 'staff'
                ? 'Staff'
                : 'Manager',
      };

      if (isFirebaseConfigured()) {
        let id: string;
        try {
          id = await provisionStaffAccount({
            ...userData,
            email: normalizedEmail,
          });
        } catch (error) {
          return { success: false, error: getFirebaseAuthErrorMessage(error) };
        }
        const cloudUser: AuthUser = {
          ...newUser,
          id: existing?.id || id,
          firebaseUid: id,
        };
        setAllAuthUsers((previous) =>
          existing
            ? previous.map((user) => (user.id === existing.id ? cloudUser : user))
            : [...previous, cloudUser]
        );
        setUsers((previous) => {
          const existingAccount = previous.find(
            (user) => user.id === existing?.id || user.email.toLowerCase() === normalizedEmail
          );
          return existingAccount
            ? previous.map((user) => (user.id === existingAccount.id ? { ...newAccount, id: cloudUser.id } : user))
            : [...previous, { ...newAccount, id: cloudUser.id }];
        });
        const roleName =
          newUser.role === 'admin'
            ? 'Admin'
            : newUser.role === 'driver'
              ? 'Courier'
              : newUser.role === 'staff'
                ? 'Staff'
                : 'Manager';
        addNotification('account', 'Staff account created', 'A {role} account was created for {name}.', {
          role: roleName,
          name: newUser.name,
        });
        showToast(`${roleName} account created. Share the temporary password securely.`, 'success');
        return { success: true };
      }

      setAllAuthUsers((previous) =>
        existing
          ? previous.map((user) => (user.id === existing.id ? newUser : user))
          : [...previous, newUser]
      );
      setUsers((previous) => {
        const existingAccount = previous.find(
          (user) => user.id === existing?.id || user.email.toLowerCase() === normalizedEmail
        );
        return existingAccount
          ? previous.map((user) => (user.id === existingAccount.id ? newAccount : user))
          : [...previous, newAccount];
      });
      const roleName =
        newUser.role === 'admin'
          ? 'Admin'
          : newUser.role === 'driver'
            ? 'Courier'
            : newUser.role === 'staff'
              ? 'Staff'
              : 'Manager';
      addNotification('account', 'Staff account created', 'A {role} account was created for {name}.', {
        role: roleName,
        name: newUser.name,
      });
      showToast(`${roleName} account created. Share the temporary password securely.`, 'success');
      return { success: true };
    },
    [addNotification, allAuthUsers, currentUser, showToast]
  );

  const setAndConfirmPin = useCallback(
    (pin: string, confirmPin: string) => {
      const check = validatePinSetup(pin, confirmPin);
      if (!check.valid) {
        return { success: false, error: check.error || 'Invalid PIN' };
      }

      if (!currentUser) {
        return { success: false, error: 'No active user found. Please log in first.' };
      }

      const updatedUser: AuthUser = {
        ...currentUser,
        pin: pin.trim(),
        hasPin: true,
      };

      setCurrentUser(updatedUser);
      setAllAuthUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setIsLocked(true);
      setAuthView('enter_pin');
      setAuthModalOpen(true);
      showToast('Security PIN configured. Enter it to continue.', 'success');
      return { success: true };
    },
    [currentUser, showToast]
  );

  const unlockWithPin = useCallback(
    (enteredPin: string) => {
      if (!currentUser) {
        return { success: false, error: 'No active session. Please log in with your email and password.' };
      }

      const ok = verifyUserPin(currentUser.pin, enteredPin);
      if (!ok) {
        return { success: false, error: 'Incorrect PIN. Please try again.' };
      }

      setIsLocked(false);
      setAuthModalOpen(false);
      showToast(`Welcome back, ${currentUser.name}! System unlocked.`, 'success');
      return { success: true };
    },
    [currentUser, showToast]
  );

  const lockSystem = useCallback(() => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    setIsLocked(true);
    setAuthView('enter_pin');
    setAuthModalOpen(true);
    showToast('Session locked. Enter your PIN to access.', 'info');
  }, [currentUser, openAuthModal, showToast]);

  const logout = useCallback(() => {
    void signOutIdentityProvider().catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : 'Could not sign out from the identity provider.', 'error');
    });
    // When a user logs out, they will be required to log in again before they can enter their PIN
    setCurrentUser(null);
    setIsLocked(false);
    setAuthView('login');
    setAuthModalOpen(true);
    showToast('Logged out. Please log in with your credentials to access.', 'info');
  }, [showToast]);

  const changePin = useCallback(
    async (oldPin: string, newPin: string, confirmPin: string) => {
      if (!currentUser) {
        return { success: false, error: 'No active user.' };
      }

      if (currentUser.pin !== oldPin.trim()) {
        if (!isFirebaseConfigured()) {
          return { success: false, error: 'Current PIN is incorrect.' };
        }
        try {
          await reauthenticateWithEmailPassword(
            currentUser.email,
            oldPin,
            currentUser.firebaseUid || currentUser.id
          );
        } catch (error) {
          const code =
            typeof error === 'object' && error !== null && 'code' in error
              ? String(error.code)
              : '';
          return {
            success: false,
            error:
              code === 'auth/invalid-credential' ||
              code === 'auth/wrong-password' ||
              code === 'auth/user-mismatch'
                ? 'Current password or existing PIN verification failed.'
                : getFirebaseAuthErrorMessage(error),
          };
        }
      }

      const check = validatePinSetup(newPin, confirmPin);
      if (!check.valid) {
        return { success: false, error: check.error || 'Invalid new PIN' };
      }

      const updatedUser: AuthUser = {
        ...currentUser,
        pin: newPin.trim(),
        hasPin: true,
      };

      setCurrentUser(updatedUser);
      setAllAuthUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      showToast('Security PIN updated successfully!', 'success');
      return { success: true };
    },
    [currentUser, showToast]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      if (!currentUser) {
        return { success: false, error: 'No active user.' };
      }
      if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters.' };
      }
      if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match.' };
      }

      if (!isFirebaseConfigured()) {
        if (currentUser.password !== currentPassword.trim()) {
          return { success: false, error: 'Current password is incorrect.' };
        }
        const updatedUser: AuthUser = {
          ...currentUser,
          password: newPassword,
        };
        setCurrentUser(updatedUser);
        setAllAuthUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
        showToast('Password changed successfully.', 'success');
        return { success: true };
      }

      try {
        await changeEmailPassword(
          currentUser.email,
          currentPassword,
          newPassword,
          currentUser.firebaseUid || currentUser.id
        );
        showToast('Password changed successfully.', 'success');
        return { success: true };
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : '';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
          return { success: false, error: 'Current password is incorrect.' };
        }
        return {
          success: false,
          error: getFirebaseAuthErrorMessage(error),
        };
      }
    },
    [currentUser, showToast]
  );

  return (
    <StoreContext.Provider
      value={{
        currentView,
        setCurrentView,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        appliedPromo,
        setAppliedPromo,
        discounts,
        createDiscount,
        deleteDiscount,
        orders,
        createOrder,
        updateOrderStatus,
        updateOrderPaymentStatus,
        setInvoiceReadiness,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        publishAnnouncement,
        assignOrderDriver,
        updateOrderDetails,
        stockRequests,
        approveStockRequest,
        denyStockRequest,
        createStockRequest,
        adjustProductStock,
        inventoryLogs,
        bottlenecks,
        resolveBottleneck,
        addBottleneck,
        users,
        updateUser,
        addUser,
        updateCurrentUserProfile,
        toggleClockIn,
        dashboardWidgets,
        reorderWidgets,
        toggleWidgetVisibility,
        updateWidgetColSpan,
        resetDashboardLayout,
        addWidget,
        memberPoints,
        redeemPoints,
        settings,
        updateSettings,
        languagePreference,
        setLanguagePreference,
        darkMode,
        setDarkMode,
        fontSizePreference,
        setFontSizePreference,
        toast,
        showToast,
        currentUser,
        allAuthUsers,
        isLocked,
        authModalOpen,
        authView,
        setAuthView,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        createStaffAccount,
        setAndConfirmPin,
        unlockWithPin,
        lockSystem,
        logout,
        changePin,
        changePassword,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
