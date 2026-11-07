import { getDatabase } from 'firebase/database';
import { getFirebaseApp } from './identityAuth.ts';

export function getStoreRealtimeDatabase() {
  const databaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Set VITE_FIREBASE_DATABASE_URL to enable live location sharing.');
  }
  return getDatabase(getFirebaseApp(), databaseUrl);
}
