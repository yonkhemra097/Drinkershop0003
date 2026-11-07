import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Order, UserRole } from '../types/index.ts';
import { getFirebaseApp } from './identityAuth.ts';

interface PlaceOrderRequest {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  fulfillmentType: 'delivery' | 'in_store';
  customerNotes?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: 'COD' | 'ABA PayWay' | 'Card';
  promoCode?: string;
}

interface PlaceOrderResponse {
  order: Order;
  memberPoints?: number;
}

export interface FirebaseAccountRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  shiftStatus: string;
  createdAt: string | null;
}

interface FirebaseAccountsResponse {
  accounts: FirebaseAccountRecord[];
  nextPageToken: string | null;
}

export function areFirebaseFunctionsEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_FUNCTIONS_ENABLED === 'true';
}

function requireFirebaseFunctions(): void {
  if (!areFirebaseFunctionsEnabled()) {
    throw new Error('This feature is unavailable because Cloud Functions are disabled for this Firebase project.');
  }
}

function callable<TRequest, TResponse>(name: string) {
  requireFirebaseFunctions();
  return httpsCallable<TRequest, TResponse>(getFunctions(getFirebaseApp()), name);
}

export async function bootstrapInitialAdmin(): Promise<void> {
  await callable<Record<string, never>, { role: string }>('bootstrapInitialAdmin')({});
}

export async function provisionStaffAccount(request: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'manager' | 'staff' | 'driver';
}): Promise<string> {
  const result = await callable<typeof request, { uid: string }>('createStaffAccount')(request);
  return result.data.uid;
}

export async function updateCloudUserRole(email: string, role: UserRole): Promise<void> {
  await callable<{ email: string; role: UserRole }, { uid: string; email: string; role: UserRole }>(
    'changeUserRole'
  )({ email, role });
}

export async function listCloudUsers(pageToken?: string): Promise<FirebaseAccountsResponse> {
  const result = await callable<{ pageToken?: string }, FirebaseAccountsResponse>('listFirebaseUsers')({
    ...(pageToken ? { pageToken } : {}),
  });
  return result.data;
}

export async function placeOrderInCloud(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  const result = await callable<PlaceOrderRequest, PlaceOrderResponse>('placeOrder')(request);
  return result.data;
}
