import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: {
        success: (title: string) => console.log('[Toast Success]', title),
        error: (title: string) => console.error('[Toast Error]', title),
        warning: (title: string) => console.warn('[Toast Warning]', title),
        info: (title: string) => console.info('[Toast Info]', title),
      },
    };
  }
  return ctx;
}
