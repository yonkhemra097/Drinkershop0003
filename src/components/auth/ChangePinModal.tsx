import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changePin } = useStore();

  const [currentVerification, setCurrentVerification] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentVerification.trim()) {
      setErrorMessage('Please enter your current account password or existing PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePin(currentVerification, newPin, confirmNewPin);
      if (res.success) {
        setCurrentVerification('');
        setNewPin('');
        setConfirmNewPin('');
        onClose();
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#130805]/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#fcf9f3] text-[#1c1c18] rounded-3xl shadow-2xl border border-[#e5e2dc] overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 bg-[#2c1e1a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ab3425] text-white flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#ffdad4]" />
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base">
                Change Security PIN
              </h2>
              <p className="text-xs text-[#d2c3bf]">Update security PIN for {currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4f4542] mb-1">
              Current Password or Existing PIN
            </label>
            <input
              type="password"
              required
              value={currentVerification}
              onChange={(e) => setCurrentVerification(e.target.value)}
              placeholder="Verify identity"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4f4542]">New PIN (4 or 6 digits)</label>
              <button
                type="button"
                onClick={() => setShowDigits(!showDigits)}
                className="text-[11px] text-[#817471] hover:text-[#130805] flex items-center gap-1"
              >
                {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showDigits ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 4 or 6 numbers"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] tracking-widest font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4f4542] mb-1">
              Confirm New PIN
            </label>
            <input
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Re-enter the same PIN"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs text-[#1c1c18] tracking-widest font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
            {newPin && confirmNewPin && (
              <div className="mt-1 text-[11px] flex items-center gap-1">
                {newPin === confirmNewPin ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PINs match!
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold">PINs do not match</span>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-xs font-bold text-[#4f4542]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (newPin.length !== 4 && newPin.length !== 6) ||
                confirmNewPin.length !== newPin.length
              }
              className="px-5 py-2.5 rounded-xl bg-[#ab3425] hover:bg-[#8f2b1e] disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save New PIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
