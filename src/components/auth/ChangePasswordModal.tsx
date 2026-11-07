import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, X } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changePassword } = useStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) {
        setErrorMessage(result.error || 'Could not change the password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#130805]/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#fcf9f3] text-[#1c1c18] rounded-3xl shadow-2xl border border-[#e5e2dc] overflow-hidden">
        <div className="relative px-6 py-5 bg-[#2c1e1a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ab3425] text-white flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#ffdad4]" />
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base">
                Change Password
              </h2>
              <p className="text-xs text-[#d2c3bf]">Update the password for {currentUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4f4542] mb-1" htmlFor="current-password">
              Current Password
            </label>
            <input
              id="current-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4f4542]" htmlFor="new-password">
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords((visible) => !visible)}
                className="text-[11px] text-[#817471] hover:text-[#130805] flex items-center gap-1"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={6}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4f4542] mb-1" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#ab3425]"
            />
            {newPassword && confirmPassword && (
              <p className={`mt-1 text-[11px] font-semibold ${
                newPassword === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {newPassword === confirmPassword ? 'Passwords match.' : 'Passwords do not match.'}
              </p>
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
              disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
              className="px-5 py-2.5 rounded-xl bg-[#ab3425] hover:bg-[#8f2b1e] disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
