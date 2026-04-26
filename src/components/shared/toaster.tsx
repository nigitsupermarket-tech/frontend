'use client';

import { useEffect } from 'react';
import { useToasts, useDismissToast } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  default: Info,
};

const colors = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  default: 'bg-white border-gray-200 text-gray-900',
};

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  default: 'text-gray-500',
};

export function Toaster() {
  const toasts = useToasts();
  const dismiss = useDismissToast();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.variant];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
              'pointer-events-auto',
              'animate-in slide-in-from-right-4 fade-in duration-200',
              colors[toast.variant]
            )}
          >
            <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', iconColors[toast.variant])} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
