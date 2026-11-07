import React from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toast } = useStore();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-300" />;
      case 'error':
        return <AlertOctagon className="w-5 h-5 text-rose-300" />;
      case 'info':
        return <Info className="w-5 h-5 text-sky-300" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-300" />;
    }
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 max-w-sm bg-[#130805] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 animate-slide-up">
      <div className="shrink-0">{getIcon()}</div>
      <p className="text-xs font-medium text-[#fcf9f3]">{toast.message}</p>
    </div>
  );
};
