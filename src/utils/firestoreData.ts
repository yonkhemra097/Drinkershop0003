import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  collection,
  arrayUnion,
  doc,
  documentId,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { AuthUser, UserRole } from '../types/index.ts';
import { getFirebaseApp } from './identityAuth.ts';

export interface StoreRecord {
  id: string;
}

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => entry === undefined ? null : removeUndefinedValues(entry));
  }
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, removeUndefinedValues(entry)])
    );
  }
  return value;
}

function firestoreDocument(value: object): DocumentData {
  return removeUndefinedValues(value) as DocumentData;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
}

export function getStoreFirestore() {
  return getFirestore(getFirebaseApp());
}

export async function saveAuthenticatedProfile(user: AuthUser): Promise<string> {
  const reference = doc(getStoreFirestore(), 'users', user.firebaseUid || user.id);
  const existing = await getDoc(reference);
  const profile = {
    id: user.firebaseUid || user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    role: user.role,
    createdByAdmin: Boolean(user.createdByAdmin),
    ...(user.avatar ? { avatar: user.avatar } : {}),
    status: 'active',
  };
  const existingCreatedAt = existing.data()?.createdAt;
  const existingCreatedAtDate =
    existingCreatedAt && typeof existingCreatedAt.toDate === 'function'
      ? existingCreatedAt.toDate()
      : existingCreatedAt instanceof Date
        ? existingCreatedAt
        : typeof existingCreatedAt === 'string'
          ? new Date(existingCreatedAt)
          : null;

  if (existing.exists()) {
    const hasExistingCreatedAt =
      existingCreatedAtDate !== null && Number.isFinite(existingCreatedAtDate.getTime());
    const createdAt = hasExistingCreatedAt
      ? existingCreatedAtDate.toISOString()
      : user.createdAt || new Date().toISOString();
    await updateDoc(reference, firestoreDocument({
      ...profile,
      ...(!hasExistingCreatedAt ? { createdAt } : {}),
    }));
    return createdAt;
  }
  const createdAt = user.createdAt || new Date().toISOString();
  await setDoc(reference, firestoreDocument({ ...profile, createdAt }));
  return createdAt;
}

export async function getAuthenticatedRole(user: User): Promise<UserRole> {
  const { claims } = await user.getIdTokenResult(true);
  const role = claims.role;
  if (
    role === 'admin' ||
    role === 'manager' ||
    role === 'staff' ||
    role === 'driver'
  ) {
    return role;
  }
  return 'customer';
}

export function subscribeStoreRecords<T extends StoreRecord>(
  collectionName: string,
  uid: string | undefined,
  role: UserRole | undefined,
  receive: (records: T[]) => void,
  fail: (error: Error) => void
): Unsubscribe {
  const records = collection(getStoreFirestore(), collectionName);
  let source = query(records);

  if (collectionName === 'orders' && uid) {
    if (role === 'customer') source = query(records, where('customerId', '==', uid));
    if (role === 'driver') source = query(records, where('driverId', '==', uid));
  } else if (
    collectionName === 'users' &&
    uid &&
    role !== 'admin' &&
    role !== 'manager' &&
    role !== 'staff'
  ) {
    source = query(records, where(documentId(), '==', uid));
  } else if (collectionName === 'notifications' && uid && role === 'customer') {
    source = query(records, where('category', '==', 'announcement'));
  }

  return onSnapshot(
    source,
    (snapshot) => receive(snapshot.docs.map((entry) => ({
      ...entry.data(),
      id: entry.id,
    }) as T)),
    (error) => fail(error)
  );
}

export async function syncStoreRecords<T extends StoreRecord>(
  collectionName: string,
  before: T[],
  after: T[]
): Promise<void> {
  const db = getStoreFirestore();
  const previous = new Map(before.map((record) => [record.id, record]));
  const next = new Map(after.map((record) => [record.id, record]));
  const changed = after.filter((record) =>
    JSON.stringify(previous.get(record.id)) !== JSON.stringify(record)
  );
  const removed = before.filter((record) => !next.has(record.id));
  const operations = [
    ...changed.map((record) => ({ type: 'set' as const, record })),
    ...removed.map((record) => ({ type: 'delete' as const, record })),
  ];

  for (let offset = 0; offset < operations.length; offset += 450) {
    const batch = writeBatch(db);
    for (const operation of operations.slice(offset, offset + 450)) {
      const reference = doc(db, collectionName, operation.record.id);
      if (operation.type === 'set') {
        const record = collectionName === 'products'
          ? (({ costPrice: _costPrice, ...publicProduct }) => publicProduct)(operation.record as T & { costPrice?: number })
          : operation.record;
        batch.set(reference, firestoreDocument(record));
      }
      else batch.delete(reference);
    }
    await batch.commit();
  }
}

export async function saveStoreSettings(settings: object): Promise<void> {
  await setDoc(doc(getStoreFirestore(), 'storeSettings', 'main'), firestoreDocument(settings));
}

export async function markCloudNotificationRead(uid: string, notificationIds: string[]): Promise<void> {
  const db = getStoreFirestore();
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, 'notifications', id), { readBy: arrayUnion(uid) });
  }
  if (notificationIds.length > 0) await batch.commit();
}

export function useFirestoreCollectionSync<T extends StoreRecord>(
  collectionName: string,
  records: T[],
  setRecords: Dispatch<SetStateAction<T[]>>,
  uid: string | undefined,
  role: UserRole | undefined,
  enabled: boolean,
  canWrite: boolean,
  onError: (message: string) => void
): void {
  const latestRecords = useRef(records);
  const remoteRecords = useRef<T[] | null>(null);
  const initialized = useRef(false);
  const onErrorRef = useRef(onError);
  latestRecords.current = records;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) return;
    if (
      !uid &&
      collectionName !== 'products' &&
      collectionName !== 'categories' &&
      collectionName !== 'storeSettings' &&
      collectionName !== 'discounts'
    ) return;

    initialized.current = false;
    remoteRecords.current = null;
    let firstSnapshot = true;
    let unsubscribe: Unsubscribe;
    try {
      unsubscribe = subscribeStoreRecords<T>(
        collectionName,
        uid,
        role,
        (cloudRecords) => {
          if (firstSnapshot) {
            firstSnapshot = false;
            if (cloudRecords.length === 0 && canWrite && latestRecords.current.length > 0) {
              const localRecords = latestRecords.current;
              remoteRecords.current = [];
              initialized.current = true;
              void syncStoreRecords(collectionName, [], localRecords)
                .then(() => {
                  remoteRecords.current = localRecords;
                })
                .catch((error: unknown) => {
                  remoteRecords.current = [];
                  onErrorRef.current(error instanceof Error ? error.message : 'Could not migrate local records to Firestore.');
                });
              return;
            }
          }
          remoteRecords.current = cloudRecords;
          initialized.current = true;
          setRecords(cloudRecords);
        },
        (error) => onErrorRef.current(`Firestore could not load ${collectionName}: ${error.message}`)
      );
    } catch (error) {
      onErrorRef.current(error instanceof Error ? error.message : `Could not connect to Firestore collection ${collectionName}.`);
      return;
    }
    return () => {
      initialized.current = false;
      unsubscribe();
    };
  }, [canWrite, collectionName, enabled, role, setRecords, uid]);

  useEffect(() => {
    const before = remoteRecords.current;
    if (!enabled || !canWrite || !initialized.current || !before) return;
    if (JSON.stringify(before) === JSON.stringify(records)) return;

    remoteRecords.current = records;
    void syncStoreRecords(collectionName, before, records).catch((error: unknown) => {
      remoteRecords.current = before;
      onErrorRef.current(error instanceof Error ? error.message : `Could not save ${collectionName} to Firestore.`);
    });
  }, [canWrite, collectionName, enabled, records]);
}

export function useFirestoreSettingsSync<T extends object>(
  settings: T,
  setSettings: Dispatch<SetStateAction<T>>,
  canWrite: boolean,
  onError: (message: string) => void
): void {
  const latestSettings = useRef(settings);
  const remoteSettings = useRef<object | null>(null);
  const initialized = useRef(false);
  const onErrorRef = useRef(onError);
  latestSettings.current = settings;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    initialized.current = false;
    let firstSnapshot = true;
    let unsubscribe: Unsubscribe;
    try {
      const settingsDoc = doc(getStoreFirestore(), 'storeSettings', 'main');
      unsubscribe = onSnapshot(
        settingsDoc,
        (snapshot) => {
          const cloudSettings = snapshot.exists()
            ? snapshot.data()
            : null;
          if (firstSnapshot) {
            firstSnapshot = false;
            if (!cloudSettings && canWrite) {
              const localSettings = latestSettings.current;
              remoteSettings.current = localSettings;
              initialized.current = true;
              void saveStoreSettings(localSettings)
                .then(() => { remoteSettings.current = localSettings; })
                .catch((error: unknown) => {
                  remoteSettings.current = null;
                  onErrorRef.current(error instanceof Error ? error.message : 'Could not save store settings to Firestore.');
                });
              return;
            }
          }
          if (cloudSettings) {
            remoteSettings.current = cloudSettings;
            initialized.current = true;
            setSettings((previous) => ({ ...previous, ...cloudSettings }));
          }
        },
        (error) => onErrorRef.current(`Firestore could not load store settings: ${error.message}`)
      );
    } catch (error) {
      onErrorRef.current(error instanceof Error ? error.message : 'Could not connect to Firestore store settings.');
      return;
    }
    return () => {
      initialized.current = false;
      unsubscribe();
    };
  }, [canWrite, setSettings]);

  useEffect(() => {
    const before = remoteSettings.current;
    if (!canWrite || !initialized.current || !before) return;
    const next = { ...settings };
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    remoteSettings.current = next;
    void saveStoreSettings(next).catch((error: unknown) => {
      remoteSettings.current = before;
      onErrorRef.current(error instanceof Error ? error.message : 'Could not save store settings to Firestore.');
    });
  }, [canWrite, settings]);
}
