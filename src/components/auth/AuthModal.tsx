import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    isLocked,
    authModalOpen,
    authView,
    setAuthView,
    closeAuthModal,
    login,
    register,
    setAndConfirmPin,
    unlockWithPin,
    logout,
  } = useStore();

  // Tab & Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');

  // PIN inputs
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [unlockPin, setUnlockPin] = useState('');
  const [showPinDigits, setShowPinDigits] = useState(false);

  // Error and UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // Clear errors when view changes
  useEffect(() => {
    setErrorMessage(null);
    setPin('');
    setConfirmPin('');
    setUnlockPin('');
    setPinStep('create');
  }, [authView]);

  // Focus PIN input when view changes to PIN
  useEffect(() => {
    if (authModalOpen && (authView === 'enter_pin' || authView === 'set_pin')) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [authModalOpen, authView, pinStep]);

  if (!authModalOpen && !isLocked) {
    return null;
  }

  // Submit Password Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        triggerShake();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regPin || !regConfirmPin) {
      setErrorMessage('Please complete your name, email, password, PIN, and PIN confirmation.');
      triggerShake();
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password should be at least 6 characters long.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        pin: regPin,
        confirmPin: regConfirmPin,
      });
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        triggerShake();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keypad click for PIN
  const handleKeypadPress = (digit: string) => {
    setErrorMessage(null);
    if (authView === 'enter_pin') {
      const requiredLength = currentUser?.pin?.length ?? 6;
      if (unlockPin.length < requiredLength) {
        const next = unlockPin + digit;
        setUnlockPin(next);
        if (next.length === requiredLength) {
          submitUnlockPin(next);
        }
      }
    } else if (authView === 'set_pin') {
      if (pinStep === 'create') {
        if (pin.length < 6) {
          setPin((prev) => prev + digit);
        }
      } else {
        if (confirmPin.length < pin.length) {
          const next = confirmPin + digit;
          setConfirmPin(next);
          if (next.length === pin.length) {
            submitSetAndConfirmPin(pin, next);
          }
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    setErrorMessage(null);
    if (authView === 'enter_pin') {
      setUnlockPin((prev) => prev.slice(0, -1));
    } else if (authView === 'set_pin') {
      if (pinStep === 'create') {
        setPin((prev) => prev.slice(0, -1));
      } else {
        if (confirmPin.length > 0) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          // Go back to create step
          setPinStep('create');
        }
      }
    }
  };

  const handleKeypadClear = () => {
    setErrorMessage(null);
    if (authView === 'enter_pin') {
      setUnlockPin('');
    } else if (authView === 'set_pin') {
      setPin('');
      setConfirmPin('');
      setPinStep('create');
    }
  };

  const submitUnlockPin = (pinToTest: string) => {
    setIsSubmitting(true);
    const res = unlockWithPin(pinToTest);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      setErrorMessage(res.error);
      triggerShake();
      setUnlockPin('');
    }
  };

  const submitSetAndConfirmPin = (pin1: string, pin2: string) => {
    setIsSubmitting(true);
    const res = setAndConfirmPin(pin1, pin2);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      setErrorMessage(res.error);
      triggerShake();
      setConfirmPin('');
      setPinStep('confirm');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Active PIN string for visual rendering
  const activePinValue =
    authView === 'enter_pin'
      ? unlockPin
      : pinStep === 'create'
      ? pin
      : confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#130805]/75 backdrop-blur-md">
      <div
        className={`w-full max-w-md bg-[#fcf9f3] text-[#1c1c18] rounded-3xl shadow-2xl border border-[#e5e2dc] overflow-hidden transition-all duration-200 ${
          isShaking ? 'animate-[wiggle_0.2s_ease-in-out_infinite]' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-[#2c1e1a] to-[#1c1412] text-white">
          {/* Close button if user is already logged in and not locked */}
          {currentUser && !isLocked && (
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ab3425] text-white flex items-center justify-center shadow-md">
              {authView === 'enter_pin' || authView === 'set_pin' ? (
                <KeyRound className="w-6 h-6 text-[#ffdad4]" />
              ) : (
                <Lock className="w-6 h-6 text-[#ffdad4]" />
              )}
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg leading-tight">
                {authView === 'enter_pin'
                  ? 'PIN Access Lock'
                  : authView === 'set_pin'
                  ? 'Configure Security PIN'
                  : authView === 'register'
                  ? 'Create New Account'
                  : 'Sip & Snack Portal'}
              </h2>
              <p className="text-xs text-[#d2c3bf]">
                {authView === 'enter_pin'
                  ? 'Enter your security PIN to access the system'
                  : authView === 'set_pin'
                  ? 'Set a 4- or 6-digit PIN for your account'
                  : authView === 'register'
                  ? 'Create a Customer account'
                  : 'Sign in to continue'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Only in login/register view) */}
          {(authView === 'login' || authView === 'register') && (
            <div className="flex items-center gap-2 mt-5 p-1 bg-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authView === 'login'
                    ? 'bg-white text-[#130805] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setAuthView('register')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authView === 'register'
                    ? 'bg-white text-[#130805] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: ENTER PIN (LOCKED STATE)                                */}
          {/* ============================================================== */}
          {authView === 'enter_pin' && currentUser && (
            <div className="space-y-5">
              {/* User Identity Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f0eee8] border border-[#e5e2dc]">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#ab3425]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#2c1e1a] text-white flex items-center justify-center font-bold text-lg">
                    {currentUser.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#130805] truncate">
                      {currentUser.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#ab3425] text-white">
                      {currentUser.role === 'driver' ? 'Courier' : currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#817471] truncate">{currentUser.email}</p>
                </div>
              </div>

              {/* PIN Circles Display */}
              <div className="text-center">
                <div className="text-xs font-semibold text-[#817471] mb-2">
                  Enter your {currentUser.pin?.length ?? 6}-digit security PIN
                </div>

                <div className="flex items-center justify-center gap-3 my-2">
                  {Array.from({ length: currentUser.pin?.length ?? 6 }, (_, index) => {
                    const isFilled = index < unlockPin.length;
                    const digit = unlockPin[index];
                    return (
                      <div
                        key={index}
                        className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all ${
                          isFilled
                            ? 'border-[#ab3425] bg-[#ab3425]/10 text-[#130805]'
                            : 'border-[#d2c3bf] bg-white text-[#817471]'
                        }`}
                      >
                        {isFilled ? (showPinDigits ? digit : '•') : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden input for physical keyboard entry */}
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={currentUser.pin?.length ?? 6}
                  value={unlockPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, currentUser?.pin?.length ?? 6);
                    setUnlockPin(val);
                    if (val.length === (currentUser?.pin?.length ?? 6)) {
                      submitUnlockPin(val);
                    }
                  }}
                  className="opacity-0 absolute -z-10 h-0 w-0"
                />

                <div className="flex items-center justify-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinDigits(!showPinDigits)}
                    className="text-[11px] text-[#817471] hover:text-[#130805] font-medium flex items-center gap-1"
                  >
                    {showPinDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPinDigits ? 'Hide digits' : 'Show digits'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="text-[11px] text-[#ab3425] hover:underline font-semibold"
                  >
                    Clear PIN
                  </button>
                </div>
              </div>

              {/* Interactive On-Screen Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-white hover:bg-[#f0eee8] active:scale-95 border border-[#e5e2dc] text-lg font-bold text-[#130805] shadow-xs transition-all flex items-center justify-center select-none"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] active:scale-95 text-xs font-bold text-[#817471] transition-all flex items-center justify-center select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-white hover:bg-[#f0eee8] active:scale-95 border border-[#e5e2dc] text-lg font-bold text-[#130805] shadow-xs transition-all flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-12 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] active:scale-95 text-sm font-bold text-[#817471] transition-all flex items-center justify-center select-none"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              </div>

              {/* Unlock Action Button */}
              <button
                type="button"
                disabled={unlockPin.length !== (currentUser.pin?.length ?? 6) || isSubmitting}
                onClick={() => submitUnlockPin(unlockPin)}
                className="w-full py-3 rounded-2xl bg-[#ab3425] hover:bg-[#8f2b1e] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock System with PIN</span>
              </button>

              {/* Explicit Log Out to switch account */}
              <div className="pt-2 text-center border-t border-[#e5e2dc]">
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-[#817471] hover:text-[#ab3425] font-semibold flex items-center justify-center gap-1.5 mx-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
                <p className="text-[10px] text-[#a89d9a] mt-1">
                  Exit to sign out. Next time, enter your email and password, then your PIN.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: SET & CONFIRM PIN                                       */}
          {/* ============================================================== */}
          {authView === 'set_pin' && currentUser && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#ab3425]/10 text-[#ab3425] flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#130805]">
                  {pinStep === 'create'
                    ? 'Step 1: Create a PIN'
                    : 'Step 2: Confirm Your PIN'}
                </h3>
                <p className="text-xs text-[#817471] max-w-xs mx-auto mt-0.5">
                  {pinStep === 'create'
                    ? `Create a 4- or 6-digit PIN for ${currentUser.name}`
                    : 'Re-enter the same PIN to confirm your security PIN'}
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2">
                <div
                  className={`flex-1 h-1.5 rounded-full ${
                    pinStep === 'create' ? 'bg-[#ab3425]' : 'bg-emerald-600'
                  }`}
                />
                <div
                  className={`flex-1 h-1.5 rounded-full ${
                    pinStep === 'confirm' ? 'bg-[#ab3425]' : 'bg-[#e5e2dc]'
                  }`}
                />
              </div>

              {/* PIN circles display */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 my-2">
                  {Array.from({ length: pin.length || 6 }, (_, index) => {
                    const currentVal = pinStep === 'create' ? pin : confirmPin;
                    const isFilled = index < currentVal.length;
                    const digit = currentVal[index];
                    return (
                      <div
                        key={index}
                        className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all ${
                          isFilled
                            ? 'border-[#ab3425] bg-[#ab3425]/10 text-[#130805]'
                            : 'border-[#d2c3bf] bg-white text-[#817471]'
                        }`}
                      >
                        {isFilled ? (showPinDigits ? digit : '•') : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden input for keyboard entry */}
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={pinStep === 'create' ? 6 : pin.length}
                  value={pinStep === 'create' ? pin : confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, pinStep === 'create' ? 6 : pin.length);
                    if (pinStep === 'create') {
                      setPin(val);
                    } else {
                      setConfirmPin(val);
                      if (val.length === pin.length) {
                        submitSetAndConfirmPin(pin, val);
                      }
                    }
                  }}
                  className="opacity-0 absolute -z-10 h-0 w-0"
                />

                <div className="flex items-center justify-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinDigits(!showPinDigits)}
                    className="text-[11px] text-[#817471] hover:text-[#130805] font-medium flex items-center gap-1"
                  >
                    {showPinDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPinDigits ? 'Hide digits' : 'Show digits'}</span>
                  </button>
                  {pinStep === 'confirm' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmPin('');
                        setPinStep('create');
                      }}
                      className="text-[11px] text-[#ab3425] hover:underline font-semibold"
                    >
                      ← Re-enter Step 1 PIN
                    </button>
                  )}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-white hover:bg-[#f0eee8] active:scale-95 border border-[#e5e2dc] text-lg font-bold text-[#130805] shadow-xs transition-all flex items-center justify-center select-none"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] active:scale-95 text-xs font-bold text-[#817471] transition-all flex items-center justify-center select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-white hover:bg-[#f0eee8] active:scale-95 border border-[#e5e2dc] text-lg font-bold text-[#130805] shadow-xs transition-all flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-12 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] active:scale-95 text-sm font-bold text-[#817471] transition-all flex items-center justify-center select-none"
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              {pinStep === 'create' ? (
                <button
                  type="button"
                  disabled={pin.length !== 4 && pin.length !== 6}
                  onClick={() => setPinStep('confirm')}
                  className="w-full py-3 rounded-2xl bg-[#ab3425] hover:bg-[#8f2b1e] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Confirm PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={confirmPin.length !== pin.length || confirmPin !== pin || isSubmitting}
                  onClick={() => submitSetAndConfirmPin(pin, confirmPin)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm PIN & Unlock Access</span>
                </button>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: LOGIN (EMAIL & PASSWORD)                                 */}
          {/* ============================================================== */}
          {authView === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#4f4542] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#817471] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yonkhemra097@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#4f4542]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#817471] hover:text-[#130805] flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#817471] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#2c1e1a] hover:bg-[#130805] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-[#ffdad4]" />
                  <span>{isSubmitting ? 'Signing in...' : 'Log In to System'}</span>
                </button>
              </form>

            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW: REGISTER                                                 */}
          {/* ============================================================== */}
          {authView === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4f4542] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#817471] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Jordan Hayes"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4f4542] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#817471] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#4f4542] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#817471] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4f4542] mb-1">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#817471] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (555) 000"
                      className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#4f4542] mb-1">PIN (4 or 6 digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="([0-9]{4}|[0-9]{6})"
                    maxLength={6}
                    required
                    value={regPin}
                    onChange={(event) => setRegPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Create PIN"
                    className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4f4542] mb-1">Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="([0-9]{4}|[0-9]{6})"
                    maxLength={6}
                    required
                    value={regConfirmPin}
                    onChange={(event) => setRegConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Re-enter PIN"
                    className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs tracking-widest"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f6f3ed] border border-[#e5e2dc] text-[#4f4542] text-[11px]">
                New accounts are registered with the Customer role. Only an administrator can create Courier or Manager accounts.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#ab3425] hover:bg-[#8f2b1e] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
