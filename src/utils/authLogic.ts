import type { AuthMode, AuthUser, UserRole } from '../types/index.ts';

export function isValid6DigitPin(pin: string): boolean {
  return /^(?:\d{4}|\d{6})$/.test(pin.trim());
}

export function validatePinSetup(pin: string, confirmPin: string): { valid: boolean; error?: string } {
  if (!isValid6DigitPin(pin)) {
    return { valid: false, error: 'PIN must contain exactly 4 or 6 digits (0-9).' };
  }
  if (pin !== confirmPin) {
    return { valid: false, error: 'PIN and Confirm PIN do not match.' };
  }
  return { valid: true };
}

export function verifyPin(enteredPin: string, storedPin?: string): boolean {
  if (!storedPin) return false;
  return enteredPin.trim() === storedPin.trim();
}

export interface SessionState {
  currentUser: AuthUser | null;
  lockedEmail: string | null;
  authMode: AuthMode;
}

export function handleLoginSuccess(user: AuthUser): SessionState {
  if (!user.pin || !user.hasPin) {
    return {
      currentUser: user,
      lockedEmail: user.email,
      authMode: 'set_pin',
    };
  }
  return {
    currentUser: user,
    lockedEmail: user.email,
    authMode: 'authenticated',
  };
}

export function handleLockSession(currentState: SessionState): SessionState {
  if (!currentState.currentUser) {
    return {
      currentUser: null,
      lockedEmail: null,
      authMode: 'login',
    };
  }
  return {
    currentUser: null, // screen locked, user object hidden until unlocked
    lockedEmail: currentState.currentUser.email,
    authMode: 'enter_pin',
  };
}

export function handleUnlockWithPin(
  enteredPin: string,
  userList: AuthUser[],
  lockedEmail: string | null
): { success: boolean; state: SessionState; error?: string } {
  if (!lockedEmail) {
    return {
      success: false,
      state: { currentUser: null, lockedEmail: null, authMode: 'login' },
      error: 'No active locked session. Please log in.',
    };
  }

  const user = userList.find((u) => u.email.toLowerCase() === lockedEmail.toLowerCase());
  if (!user || !user.pin) {
    return {
      success: false,
      state: { currentUser: null, lockedEmail: null, authMode: 'login' },
      error: 'User account or PIN not found. Please log in.',
    };
  }

  if (verifyPin(enteredPin, user.pin)) {
    return {
      success: true,
      state: {
        currentUser: user,
        lockedEmail: user.email,
        authMode: 'authenticated',
      },
    };
  }

  return {
    success: false,
    state: {
      currentUser: null,
      lockedEmail,
      authMode: 'enter_pin',
    },
    error: 'Incorrect PIN. Please try again.',
  };
}

export function handleExplicitLogout(): SessionState {
  // Clearing lockedEmail ensures PIN bypass is impossible after logout
  return {
    currentUser: null,
    lockedEmail: null,
    authMode: 'login',
  };
}
