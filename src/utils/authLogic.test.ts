import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValid6DigitPin,
  validatePinSetup,
  verifyPin,
  handleLoginSuccess,
  handleLockSession,
  handleUnlockWithPin,
  handleExplicitLogout,
} from './authLogic.ts';
import type { AuthUser } from '../types/index.ts';

const mockUserWithPin: AuthUser = {
  id: 'u-1',
  name: 'Alex Mercer',
  email: 'alex@example.com',
  role: 'customer',
  pin: '123456',
  hasPin: true,
};

const mockUserNoPin: AuthUser = {
  id: 'u-2',
  name: 'Sarah Connor',
  email: 'sarah@example.com',
  role: 'manager',
  hasPin: false,
};

test('isValid6DigitPin accepts exactly 4 or 6 numeric digits', () => {
  assert.equal(isValid6DigitPin('123456'), true);
  assert.equal(isValid6DigitPin('1234'), true);
  assert.equal(isValid6DigitPin('000000'), true);
  assert.equal(isValid6DigitPin('987654'), true);
  assert.equal(isValid6DigitPin('12345'), false); // 5 digits
  assert.equal(isValid6DigitPin('123'), false); // 3 digits
  assert.equal(isValid6DigitPin('1234567'), false); // 7 digits
  assert.equal(isValid6DigitPin('12a456'), false); // letters
  assert.equal(isValid6DigitPin(''), false);
});

test('validatePinSetup checks pin validity and confirmation match', () => {
  assert.deepEqual(validatePinSetup('123456', '123456'), { valid: true });
  assert.deepEqual(validatePinSetup('1234', '1234'), { valid: true });
  assert.equal(validatePinSetup('12345', '12345').valid, false);
  assert.equal(validatePinSetup('123456', '654321').valid, false);
});

test('verifyPin matches stored pin correctly', () => {
  assert.equal(verifyPin('123456', '123456'), true);
  assert.equal(verifyPin('123456', '654321'), false);
  assert.equal(verifyPin('123456', undefined), false);
});

test('handleLoginSuccess routes to set_pin if user has no PIN, or authenticated if user has PIN', () => {
  const res1 = handleLoginSuccess(mockUserWithPin);
  assert.equal(res1.authMode, 'authenticated');
  assert.equal(res1.currentUser?.email, 'alex@example.com');
  assert.equal(res1.lockedEmail, 'alex@example.com');

  const res2 = handleLoginSuccess(mockUserNoPin);
  assert.equal(res2.authMode, 'set_pin');
  assert.equal(res2.currentUser?.email, 'sarah@example.com');
});

test('handleLockSession sets mode to enter_pin and keeps lockedEmail', () => {
  const loggedInState = handleLoginSuccess(mockUserWithPin);
  const lockedState = handleLockSession(loggedInState);

  assert.equal(lockedState.authMode, 'enter_pin');
  assert.equal(lockedState.currentUser, null);
  assert.equal(lockedState.lockedEmail, 'alex@example.com');
});

test('handleUnlockWithPin unlocks session only with valid PIN', () => {
  const users = [mockUserWithPin];
  
  // Wrong PIN fails
  const failRes = handleUnlockWithPin('999999', users, 'alex@example.com');
  assert.equal(failRes.success, false);
  assert.equal(failRes.state.authMode, 'enter_pin');

  // Correct PIN unlocks
  const successRes = handleUnlockWithPin('123456', users, 'alex@example.com');
  assert.equal(successRes.success, true);
  assert.equal(successRes.state.authMode, 'authenticated');
  assert.equal(successRes.state.currentUser?.name, 'Alex Mercer');
});

test('handleExplicitLogout clears session and lockedEmail so PIN cannot bypass login', () => {
  const loggedOutState = handleExplicitLogout();
  assert.equal(loggedOutState.authMode, 'login');
  assert.equal(loggedOutState.currentUser, null);
  assert.equal(loggedOutState.lockedEmail, null);

  // If user tries to unlock with PIN after logout, it fails because lockedEmail is null
  const unlockAfterLogout = handleUnlockWithPin('123456', [mockUserWithPin], loggedOutState.lockedEmail);
  assert.equal(unlockAfterLogout.success, false);
  assert.equal(unlockAfterLogout.state.authMode, 'login');
});
