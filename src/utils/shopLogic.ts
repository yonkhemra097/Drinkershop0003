import type { CartItem, DashboardWidget, Discount, FulfillmentType, OrderStatus, Product, StoreSettings, UserRole } from '../types/index.ts';

const BUILT_IN_PROMO_CODES = ['SIP20', 'SNACKTIME', 'FREESHIPGOLD', 'FRUITBOX'];

export function isPromoCodeValid(code: string, discounts: Discount[] = []): boolean {
  const normalizedCode = code.trim().toUpperCase();
  return (
    BUILT_IN_PROMO_CODES.includes(normalizedCode) ||
    discounts.some((discount) => discount.code.toUpperCase() === normalizedCode)
  );
}

export function calculateOrderTotals(
  items: CartItem[],
  promoCode: string | null,
  settings: Pick<StoreSettings, 'standardDeliveryFee' | 'freeDeliveryThreshold'>,
  discounts: Discount[] = []
) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  let discount = 0;
  if (promoCode) {
    const code = promoCode.trim().toUpperCase();
    if (code === 'SIP20') {
      discount = subtotal * 0.2;
    } else if (code === 'SNACKTIME' || code === 'FREESHIPGOLD') {
      // 100% off delivery fee
      discount = 0;
    } else if (code === 'FRUITBOX') {
      discount = Math.min(subtotal, 4.29); // Free juice equivalent
    } else {
      const customDiscount = discounts.find((item) => item.code.toUpperCase() === code);
      if (customDiscount) {
        discount =
          customDiscount.type === 'percent'
            ? (subtotal * customDiscount.value) / 100
            : Math.min(subtotal, customDiscount.value);
      }
    }
  }

  let deliveryFee = 0;
  if (subtotal > 0) {
    if (promoCode?.toUpperCase() === 'SNACKTIME' || promoCode?.toUpperCase() === 'FREESHIPGOLD') {
      deliveryFee = 0;
    } else if (subtotal >= settings.freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = settings.standardDeliveryFee;
    }
  }

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedDiscount = Math.round(discount * 100) / 100;
  const roundedDeliveryFee = Math.round(deliveryFee * 100) / 100;
  const total = Math.max(0, Math.round((roundedSubtotal - roundedDiscount + roundedDeliveryFee) * 100) / 100);

  return {
    subtotal: roundedSubtotal,
    discount: roundedDiscount,
    deliveryFee: roundedDeliveryFee,
    total,
  };
}

export function calculateFulfillmentTotals(
  totals: ReturnType<typeof calculateOrderTotals>,
  fulfillmentType: FulfillmentType
) {
  const deliveryFee = fulfillmentType === 'delivery' ? totals.deliveryFee : 0;
  const total = Math.max(0, Math.round((totals.subtotal - totals.discount + deliveryFee) * 100) / 100);
  return { deliveryFee, total };
}

export function determineProductStatus(stock: number, lowStockThreshold: number): Product['status'] {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= lowStockThreshold) return 'low_stock';
  return 'active';
}

export function applyStockDelta(currentStock: number, delta: number, lowStockThreshold: number) {
  const newStock = Math.max(0, currentStock + delta);
  const status = determineProductStatus(newStock, lowStockThreshold);
  return { newStock, status };
}

export function reorderDashboardWidgets(
  widgets: DashboardWidget[],
  activeId: string,
  overId: string
): DashboardWidget[] {
  if (activeId === overId) return widgets;

  const activeIndex = widgets.findIndex((w) => w.id === activeId);
  const overIndex = widgets.findIndex((w) => w.id === overId);

  if (activeIndex === -1 || overIndex === -1) return widgets;

  const result = [...widgets];
  const [removed] = result.splice(activeIndex, 1);
  result.splice(overIndex, 0, removed);

  // Reassign order sequential index
  return result.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export function canTransitionOrderStatus(
  current: OrderStatus,
  target: OrderStatus,
  role: UserRole
): boolean {
  if (role === 'admin' || role === 'manager') return true;

  if (role === 'driver') {
    if (current === 'Ready for Pickup' && target === 'On the Way') return true;
    if (current === 'On the Way' && (target === 'Delivered' || target === 'Failed')) return true;
    return false;
  }

  if (role === 'customer') {
    if (current === 'Pending' && target === 'Cancelled') return true;
    return false;
  }

  return false;
}

export function validatePin(pin: string): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a 4- or 6-digit PIN' };
  }
  if (!/^(?:\d{4}|\d{6})$/.test(trimmed)) {
    return { valid: false, error: 'PIN must contain exactly 4 or 6 digits (0-9)' };
  }
  // Check against overly trivial PINs like 000000 or 123456 warning (optional or allowed, but check format)
  return { valid: true };
}

export function validatePinSetup(
  pin: string,
  confirmPin: string
): { valid: boolean; error?: string } {
  const pinCheck = validatePin(pin);
  if (!pinCheck.valid) return pinCheck;

  if (pin !== confirmPin) {
    return { valid: false, error: 'Confirmation PIN does not match the entered PIN' };
  }

  return { valid: true };
}

export function verifyUserPin(storedPin: string | undefined, enteredPin: string): boolean {
  if (!storedPin) return false;
  return storedPin === enteredPin.trim();
}

export function verifyCredentials(
  email: string,
  password: string,
  users: Array<{ email: string; password?: string }>
): { email: string; password?: string } | null {
  const normalizedEmail = email.trim().toLowerCase();
  const found = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );
  return found || null;
}
