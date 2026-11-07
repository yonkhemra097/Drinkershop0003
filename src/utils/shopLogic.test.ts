import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  calculateFulfillmentTotals,
  determineProductStatus,
  applyStockDelta,
  reorderDashboardWidgets,
  canTransitionOrderStatus,
  validatePin,
  validatePinSetup,
  isPromoCodeValid,
  verifyUserPin,
  verifyCredentials,
} from './shopLogic.ts';
import type { CartItem, DashboardWidget, Product } from '../types/index.ts';

const mockProduct: Product = {
  id: 'p1',
  sku: 'DRK-001',
  name: 'Artisan Craft Cola',
  category: 'Soft Drinks',
  description: 'Rich botanical extracts',
  price: 3.49,
  costPrice: 1.2,
  stock: 25,
  lowStockThreshold: 5,
  image: '',
  imageAlt: '',
  status: 'active',
  rating: 4.8,
  reviewCount: 42,
};

test('calculateOrderTotals applies subtotal and standard delivery correctly', () => {
  const items: CartItem[] = [{ product: mockProduct, quantity: 2 }];
  const totals = calculateOrderTotals(items, null, {
    standardDeliveryFee: 3.5,
    freeDeliveryThreshold: 35.0,
  });

  assert.equal(totals.subtotal, 6.98);
  assert.equal(totals.discount, 0);
  assert.equal(totals.deliveryFee, 3.5);
  assert.equal(totals.total, 10.48);
});

test('calculateOrderTotals applies SIP20 discount correctly', () => {
  const items: CartItem[] = [{ product: mockProduct, quantity: 10 }]; // 34.90
  const totals = calculateOrderTotals(items, 'SIP20', {
    standardDeliveryFee: 3.5,
    freeDeliveryThreshold: 35.0,
  });

  assert.equal(totals.subtotal, 34.9);
  assert.equal(totals.discount, 6.98);
  assert.equal(totals.deliveryFee, 3.5);
  assert.equal(totals.total, 31.42);
});

test('calculateOrderTotals applies manager-created percentage discounts', () => {
  const items: CartItem[] = [{ product: mockProduct, quantity: 10 }];
  const discounts = [{
    id: 'discount-1',
    code: 'WELCOME10',
    description: '10 percent off',
    type: 'percent' as const,
    value: 10,
    createdBy: 'Manager',
    createdAt: '2025-01-01T00:00:00.000Z',
  }];
  const totals = calculateOrderTotals(
    items,
    'welcome10',
    { standardDeliveryFee: 3.5, freeDeliveryThreshold: 35 },
    discounts
  );

  assert.equal(isPromoCodeValid('WELCOME10', discounts), true);
  assert.equal(isPromoCodeValid('NOTREAL', discounts), false);
  assert.equal(totals.discount, 3.49);
  assert.equal(totals.total, 34.91);
});

test('calculateOrderTotals waives delivery on free delivery threshold', () => {
  const items: CartItem[] = [{ product: mockProduct, quantity: 12 }]; // 41.88 >= 35.0
  const totals = calculateOrderTotals(items, null, {
    standardDeliveryFee: 3.5,
    freeDeliveryThreshold: 35.0,
  });

  assert.equal(totals.deliveryFee, 0);
  assert.equal(totals.total, 41.88);
});

test('calculateFulfillmentTotals waives the delivery fee for in-store orders only', () => {
  const totals = calculateOrderTotals([{ product: mockProduct, quantity: 2 }], null, {
    standardDeliveryFee: 3.5,
    freeDeliveryThreshold: 35,
  });

  assert.deepEqual(calculateFulfillmentTotals(totals, 'in_store'), {
    deliveryFee: 0,
    total: 6.98,
  });
  assert.deepEqual(calculateFulfillmentTotals(totals, 'delivery'), {
    deliveryFee: 3.5,
    total: 10.48,
  });
});

test('determineProductStatus maps threshold correctly', () => {
  assert.equal(determineProductStatus(0, 5), 'out_of_stock');
  assert.equal(determineProductStatus(4, 5), 'low_stock');
  assert.equal(determineProductStatus(5, 5), 'low_stock');
  assert.equal(determineProductStatus(6, 5), 'active');
});

test('applyStockDelta adjusts stock and status', () => {
  const res1 = applyStockDelta(10, -8, 5);
  assert.equal(res1.newStock, 2);
  assert.equal(res1.status, 'low_stock');

  const res2 = applyStockDelta(2, -5, 5);
  assert.equal(res2.newStock, 0);
  assert.equal(res2.status, 'out_of_stock');

  const res3 = applyStockDelta(0, 15, 5);
  assert.equal(res3.newStock, 15);
  assert.equal(res3.status, 'active');
});

test('reorderDashboardWidgets moves items and sets sequential orders', () => {
  const widgets: DashboardWidget[] = [
    { id: 'w1', title: 'Widget 1', type: 'kpi_stats', colSpan: 1, visible: true, order: 0 },
    { id: 'w2', title: 'Widget 2', type: 'sales_chart', colSpan: 2, visible: true, order: 1 },
    { id: 'w3', title: 'Widget 3', type: 'live_orders', colSpan: 1, visible: true, order: 2 },
  ];

  const reordered = reorderDashboardWidgets(widgets, 'w3', 'w1');
  assert.equal(reordered[0].id, 'w3');
  assert.equal(reordered[0].order, 0);
  assert.equal(reordered[1].id, 'w1');
  assert.equal(reordered[1].order, 1);
  assert.equal(reordered[2].id, 'w2');
  assert.equal(reordered[2].order, 2);
});

test('canTransitionOrderStatus enforces role permissions', () => {
  assert.equal(canTransitionOrderStatus('Ready for Pickup', 'On the Way', 'driver'), true);
  assert.equal(canTransitionOrderStatus('On the Way', 'Delivered', 'driver'), true);
  assert.equal(canTransitionOrderStatus('Preparing', 'Cancelled', 'driver'), false);
  assert.equal(canTransitionOrderStatus('Paid', 'Cancelled', 'admin'), true);
});

test('validatePin accepts exactly 4 or 6 numeric digits', () => {
  assert.equal(validatePin('123456').valid, true);
  assert.equal(validatePin('1234').valid, true);
  assert.equal(validatePin('000000').valid, true);
  assert.equal(validatePin('987654').valid, true);
  assert.equal(validatePin('123').valid, false);
  assert.equal(validatePin('12345').valid, false);
  assert.equal(validatePin('1234567').valid, false);
  assert.equal(validatePin('12a456').valid, false);
  assert.equal(validatePin('').valid, false);
});

test('validatePinSetup checks matching confirmation', () => {
  assert.equal(validatePinSetup('123456', '123456').valid, true);
  assert.equal(validatePinSetup('1234', '1234').valid, true);
  assert.equal(validatePinSetup('123456', '654321').valid, false);
  assert.equal(validatePinSetup('123', '123').valid, false);
});

test('verifyUserPin compares entered PIN with stored PIN', () => {
  assert.equal(verifyUserPin('654321', '654321'), true);
  assert.equal(verifyUserPin('654321', '123456'), false);
  assert.equal(verifyUserPin(undefined, '123456'), false);
});

test('verifyCredentials finds user by email case-insensitively and checks password', () => {
  const users = [
    { email: 'yonkhemra097@gmail.com', password: 'secretpassword' },
    { email: 'alex@example.com', password: 'userpassword' },
  ];

  const found = verifyCredentials('YONKHEMRA097@GMAIL.COM', 'secretpassword', users);
  assert.ok(found);
  assert.equal(found?.email, 'yonkhemra097@gmail.com');

  const wrongPass = verifyCredentials('yonkhemra097@gmail.com', 'wrong', users);
  assert.equal(wrongPass, null);

  const notFound = verifyCredentials('unknown@sipandsnack.com', 'secretpassword', users);
  assert.equal(notFound, null);
});
