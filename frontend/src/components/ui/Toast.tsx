import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastContext, type ToastType, type ToastItem } from './useToast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 3500) => {
      setToasts((prev) => {
        // Deduplicate identical toasts within active queue
        const isDuplicate = prev.some((t) => t.title === title && t.message === message);
        if (isDuplicate) return prev;

        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        if (duration > 0) {
          setTimeout(() => removeToast(id), duration);
        }
        // Cap visible toasts at 3 maximum
        const next = [...prev, { id, type, title, message, duration }];
        return next.slice(-3);
      });
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (title: string, message?: string) => addToast('success', title, message),
      error: (title: string, message?: string) => addToast('error', title, message),
      warning: (title: string, message?: string) => addToast('warning', title, message),
      info: (title: string, message?: string) => addToast('info', title, message),
    }),
    [addToast]
  );

  const icons = {
    success: <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={16} />,
    error: <AlertCircle className="text-rose-600 dark:text-rose-400 flex-shrink-0" size={16} />,
    warning: <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={16} />,
    info: <Info className="text-stone-700 dark:text-stone-300 flex-shrink-0" size={16} />,
  };

  const typeLabels = {
    success: 'SUCCESS',
    error: 'SYSTEM NOTICE',
    warning: 'WARNING',
    info: 'TELEMETRY',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3 bg-white dark:bg-stone-900 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#0c0a09] animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                  [{typeLabels[t.type]}]
                </span>
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{t.title}</p>
              </div>
              {t.message && (
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-normal">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-0.5 rounded-[2px] cursor-pointer"
              aria-label="Dismiss Notification"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
