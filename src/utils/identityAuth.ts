import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';

let firebaseAuth: ReturnType<typeof getAuth> | null = null;
function hasFirebaseConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
}

export function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  const app = getFirebaseApp();
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

function getFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error('Authentication requires Firebase configuration. Add the VITE_FIREBASE_* values.');
  }

  return config;
}

export function getFirebaseApp() {
  const config = getFirebaseConfig();
  return getApps().find((app) => app.name === '[DEFAULT]') ?? initializeApp(config);
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return result.user;
}

export async function createEmailPasswordAccount(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return result.user;
}

export async function reauthenticateWithEmailPassword(
  email: string,
  password: string,
  expectedUid: string
): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) {
    throw new Error('Unable to verify the active account. Sign in again and retry.');
  }

  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function changeEmailPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  expectedUid: string
): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) {
    throw new Error('Your session is no longer active. Sign in again and retry.');
  }
  if (!user.providerData.some((provider) => provider.providerId === EmailAuthProvider.PROVIDER_ID)) {
    throw new Error('This account does not have an email and password sign-in method.');
  }

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function signOutIdentityProvider(): Promise<void> {
  if (firebaseAuth || hasFirebaseConfig()) {
    await signOut(firebaseAuth ?? getFirebaseAuth());
  }
}
