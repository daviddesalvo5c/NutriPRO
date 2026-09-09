import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Trophy, 
  Crown, 
  X 
} from 'lucide-react';
import { 
  notificationService, 
  ToastItem, 
  ToastType 
} from '../utils/notificationService';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((list) => {
      setToasts(list);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'vip':
        return <Crown className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getCardBorder = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 dark:border-emerald-500/40 bg-white/95 dark:bg-zinc-900/95 shadow-emerald-500/10';
      case 'achievement':
        return 'border-amber-500/40 dark:border-amber-500/50 bg-white/95 dark:bg-zinc-900/95 shadow-amber-500/10';
      case 'vip':
        return 'border-amber-400/50 dark:border-amber-400/60 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-amber-500/20';
      case 'warning':
        return 'border-rose-500/30 dark:border-rose-500/40 bg-white/95 dark:bg-zinc-900/95 shadow-rose-500/10';
      case 'info':
      default:
        return 'border-blue-500/30 dark:border-blue-500/40 bg-white/95 dark:bg-zinc-900/95 shadow-blue-500/10';
    }
  };

  return (
    <div 
      id="toast-notification-region"
      aria-live="polite"
      className="fixed top-4 sm:top-auto sm:bottom-6 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100%-1.5rem)] sm:w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 sm:slide-in-from-bottom-5 fade-in ${getCardBorder(toast.type)}`}
        >
          <div className="mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {toast.title}
            </h4>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => notificationService.removeToast(toast.id)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
