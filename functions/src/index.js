const { createHash } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { defineString } = require('firebase-functions/params');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();
const bootstrapAdminEmail = defineString('BOOTSTRAP_ADMIN_EMAIL', {
  default: 'yonkhemra2108@gmail.com',
});
const validRoles = new Set(['admin', 'manager', 'staff', 'driver']);

function requireAdmin(request) {
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function getProductStatus(stock, threshold) {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= threshold) return 'low_stock';
  return 'active';
}

function validateText(value, name, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new HttpsError('invalid-argument', `${name} is required and must be under ${maxLength} characters.`);
  }
  return value.trim();
}

exports.bootstrapInitialAdmin = onCall(async (request) => {
  const email = request.auth?.token.email?.toLowerCase();
  if (!request.auth || email !== bootstrapAdminEmail.value().toLowerCase()) {
    throw new HttpsError('permission-denied', 'Sign in with the configured bootstrap administrator email.');
  }

  const bootstrapRef = db.collection('_system').doc('initialAdmin');
  await db.runTransaction(async (transaction) => {
    const bootstrapSnapshot = await transaction.get(bootstrapRef);
    if (bootstrapSnapshot.exists && bootstrapSnapshot.data().uid !== request.auth.uid) {
      throw new HttpsError('already-exists', 'The initial administrator has already been provisioned.');
    }
    if (!bootstrapSnapshot.exists) {
      transaction.create(bootstrapRef, {
        uid: request.auth.uid,
        email,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  await getAuth().setCustomUserClaims(request.auth.uid, { role: 'admin' });
  await db.collection('users').doc(request.auth.uid).set({
    id: request.auth.uid,
    email,
    name: request.auth.token.name || email,
    role: 'admin',
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { role: 'admin' };
});

exports.createStaffAccount = onCall(async (request) => {
  requireAdmin(request);
  const name = validateText(request.data?.name, 'Name', 100);
  const email = validateText(request.data?.email, 'Email', 254).toLowerCase();
  const password = validateText(request.data?.password, 'Temporary password', 128);
  const phone = typeof request.data?.phone === 'string' ? request.data.phone.trim().slice(0, 40) : '';
  const role = request.data?.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Temporary passwords must be at least 8 characters.');
  }
  if (!validRoles.has(role)) {
    throw new HttpsError('invalid-argument', 'Select a valid staff role.');
  }

  let account;
  try {
    account = await getAuth().createUser({ email, password, displayName: name });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', 'Firebase could not create this account.');
  }

  try {
    await getAuth().setCustomUserClaims(account.uid, { role });
    await db.collection('users').doc(account.uid).set({
      id: account.uid,
      name,
      email,
      phone,
      role,
      status: 'active',
      shiftStatus: 'clocked_out',
      assignment: role === 'driver' ? 'Courier' : role === 'staff' ? 'Staff' : role === 'manager' ? 'Manager' : 'Admin',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await getAuth().deleteUser(account.uid);
    throw error;
  }
  return { uid: account.uid };
});

exports.changeUserRole = onCall(async (request) => {
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }
  const email = validateText(request.data?.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  const role = request.data?.role;
  if (role !== 'customer' && !validRoles.has(role)) {
    throw new HttpsError('invalid-argument', 'Select a valid user role.');
  }
  let target;
  try {
    target = await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No Firebase account exists for that email.');
    }
    throw error;
  }
  if (target.uid === request.auth.uid && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'You cannot remove your own administrator access.');
  }

  const uid = target.uid;
  const currentClaims = target.customClaims || {};
  const { role: _oldRole, ...otherClaims } = currentClaims;
  await getAuth().setCustomUserClaims(uid, role === 'customer' ? otherClaims : { ...otherClaims, role });
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  return { uid, email: target.email || email, role };
});

exports.listFirebaseUsers = onCall(async (request) => {
  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }

  const pageToken = typeof request.data?.pageToken === 'string'
    ? request.data.pageToken
    : undefined;
  const page = await getAuth().listUsers(100, pageToken);
  const profiles = page.users.length > 0
    ? await db.getAll(...page.users.map((user) => db.collection('users').doc(user.uid)))
    : [];
  const accounts = page.users.map((user, index) => {
    const profile = profiles[index].data() || {};
    const role = user.customClaims?.role;
    return {
      id: user.uid,
      name: user.displayName || profile.name || user.email || 'Unnamed account',
      email: user.email || '',
      phone: user.phoneNumber || profile.phone || '',
      role: ['admin', 'manager', 'staff', 'driver'].includes(role) ? role : 'customer',
      status: user.disabled ? 'inactive' : 'active',
      shiftStatus: profile.shiftStatus || 'clocked_out',
      createdAt: profile.createdAt?.toDate?.().toISOString() || user.metadata.creationTime || null,
    };
  });
  return { accounts, nextPageToken: page.pageToken || null };
});

exports.placeOrder = onCall(async (request) => {
  const input = request.data;
  const customerName = validateText(input?.customerName, 'Customer name', 100);
  const customerPhone = validateText(input?.customerPhone, 'Customer phone', 40);
  const fulfillmentType = input?.fulfillmentType;
  const paymentMethod = input?.paymentMethod;
  if (!['delivery', 'in_store'].includes(fulfillmentType)) {
    throw new HttpsError('invalid-argument', 'Select a valid fulfillment method.');
  }
  if (!['COD', 'ABA PayWay', 'Card'].includes(paymentMethod)) {
    throw new HttpsError('invalid-argument', 'Select a valid payment method.');
  }
  const customerAddress = fulfillmentType === 'delivery'
    ? validateText(input?.customerAddress, 'Delivery address', 300)
    : 'In-store purchase';
  const customerNotes = typeof input?.customerNotes === 'string' ? input.customerNotes.trim().slice(0, 500) : '';
  const promoCode = typeof input?.promoCode === 'string' ? input.promoCode.trim().toUpperCase() : '';
  const items = input?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw new HttpsError('invalid-argument', 'An order must contain between 1 and 20 items.');
  }
  const normalizedItems = items.map((item) => {
    if (typeof item?.productId !== 'string' || !/^[\w-]{1,100}$/.test(item.productId)) {
      throw new HttpsError('invalid-argument', 'An order contains an invalid product.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new HttpsError('invalid-argument', 'Item quantities must be between 1 and 50.');
    }
    return { productId: item.productId, quantity: item.quantity };
  });
  if (new Set(normalizedItems.map((item) => item.productId)).size !== normalizedItems.length) {
    throw new HttpsError('invalid-argument', 'Remove duplicate product lines and try again.');
  }

  const ip = request.rawRequest.ip || 'unknown';
  const timeWindow = Math.floor(Date.now() / (15 * 60 * 1000));
  const throttleId = createHash('sha256').update(`${ip}:${timeWindow}`).digest('hex');
  const throttleRef = db.collection('_rateLimits').doc(throttleId);
  const orderRef = db.collection('orders').doc();
  const notificationRef = db.collection('notifications').doc();
  const customerRef = request.auth ? db.collection('users').doc(request.auth.uid) : null;
  const settingsRef = db.collection('storeSettings').doc('main');
  const sequenceRef = db.collection('_counters').doc('orders');

  const response = await db.runTransaction(async (transaction) => {
    const reads = [
      transaction.get(throttleRef),
      transaction.get(settingsRef),
      transaction.get(sequenceRef),
    ];
    if (customerRef) reads.push(transaction.get(customerRef));
    const [throttleSnapshot, settingsSnapshot, sequenceSnapshot, customerSnapshot] = await Promise.all(reads);
    if ((throttleSnapshot.data()?.count || 0) >= 12) {
      throw new HttpsError('resource-exhausted', 'Too many orders from this network. Please try again later.');
    }
    if (!settingsSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Store settings are not configured yet. Please contact the store.');
    }

    const productRefs = normalizedItems.map((item) => db.collection('products').doc(item.productId));
    const productSnapshots = await Promise.all(productRefs.map((reference) => transaction.get(reference)));
    const settings = settingsSnapshot.data();
    const orderItems = [];
    let subtotal = 0;
    const productUpdates = [];

    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) throw new HttpsError('failed-precondition', 'A product in this order is no longer available.');
      const product = snapshot.data();
      const quantity = normalizedItems[index].quantity;
      if (product.status === 'hidden' || product.status === 'out_of_stock' || product.stock < quantity) {
        throw new HttpsError('failed-precondition', `${product.name || 'A product'} does not have enough stock.`);
      }
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new HttpsError('failed-precondition', 'A product has an invalid price.');
      }
      subtotal += price * quantity;
      orderItems.push({ productId: snapshot.id, productName: product.name, quantity, price });
      const stock = product.stock - quantity;
      productUpdates.push({
        reference: productRefs[index],
        product,
        stock,
        status: getProductStatus(stock, product.lowStockThreshold || 0),
      });
    });
    subtotal = roundMoney(subtotal);

    let discount = 0;
    let freeDelivery = ['SNACKTIME', 'FREESHIPGOLD'].includes(promoCode);
    if (promoCode === 'SIP20') discount = roundMoney(subtotal * 0.2);
    else if (promoCode === 'FRUITBOX') discount = Math.min(subtotal, 4.29);
    else if (promoCode && !freeDelivery) {
      const discountQuery = db.collection('discounts').where('code', '==', promoCode);
      const discountSnapshot = await transaction.get(discountQuery);
      const customDiscount = discountSnapshot.docs.find((entry) => entry.data().code?.toUpperCase() === promoCode)?.data();
      if (!customDiscount) throw new HttpsError('invalid-argument', 'That discount code is not valid.');
      discount = customDiscount.type === 'percent'
        ? roundMoney(subtotal * customDiscount.value / 100)
        : Math.min(subtotal, Number(customDiscount.value) || 0);
    }
    const deliveryFee = fulfillmentType === 'delivery' && !freeDelivery && subtotal < Number(settings.freeDeliveryThreshold)
      ? Number(settings.standardDeliveryFee)
      : 0;
    const total = Math.max(0, roundMoney(subtotal - discount + deliveryFee));
    const memberPoints = customerRef
      ? Number(customerSnapshot?.data()?.memberPoints || 0) + Math.floor(total * 10)
      : undefined;
    const sequence = Number(sequenceSnapshot.data()?.value || 0) + 1;
    const now = new Date().toISOString();
    const order = {
      id: orderRef.id,
      orderNumber: `#ORD-${String(sequence).padStart(6, '0')}`,
      customerName,
      customerPhone,
      customerAddress,
      fulfillmentType,
      customerNotes,
      items: orderItems,
      subtotal,
      discount: roundMoney(discount),
      deliveryFee: roundMoney(deliveryFee),
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'COD' : 'Pending',
      status: 'Pending',
      invoiceReady: false,
      createdAt: now,
      updatedAt: now,
    };
    if (request.auth?.uid) order.customerId = request.auth.uid;

    transaction.set(throttleRef, {
      count: (throttleSnapshot.data()?.count || 0) + 1,
      expiresAt: Timestamp.fromMillis((timeWindow + 2) * 15 * 60 * 1000),
    });
    transaction.set(sequenceRef, { value: sequence });
    transaction.create(orderRef, order);
    transaction.create(notificationRef, {
      id: notificationRef.id,
      category: 'order',
      title: 'New order',
      message: 'Order {orderNumber} was placed by {customerName}.',
      values: { orderNumber: order.orderNumber, customerName },
      createdAt: now,
      readBy: [],
    });
    if (customerRef && memberPoints !== undefined) {
      transaction.set(customerRef, { memberPoints }, { merge: true });
    }
    for (const update of productUpdates) {
      transaction.update(update.reference, { stock: update.stock, status: update.status });
      const logRef = db.collection('inventoryLogs').doc();
      transaction.create(logRef, {
        id: logRef.id,
        productId: update.reference.id,
        productName: update.product.name,
        previousQuantity: update.product.stock,
        changeQuantity: -normalizedItems.find((item) => item.productId === update.reference.id).quantity,
        newQuantity: update.stock,
        reason: `Order ${order.orderNumber} fulfillment deduction`,
        actor: 'Order Checkout',
        timestamp: now,
      });
    }
    return { order, memberPoints };
  });
  return response;
});
