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
    success: <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />,
    error: <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />,
    warning: <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />,
    info: <Info className="text-sky-500 flex-shrink-0" size={18} />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 shadow-md animate-in slide-in-from-bottom-2 duration-150"
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
              {t.message && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
