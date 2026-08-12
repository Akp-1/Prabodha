'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

// ── Context ────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx.toast;
}

// ── Variant styles ─────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    icon: '✕',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    icon: 'ℹ',
  },
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-blue-600',
};

// ── Provider ───────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);

      const timer = setTimeout(() => {
        removeToast(id);
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: '420px' }}
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={`
                pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg
                ${style.bg} ${style.border}
                transition-all duration-300 ease-in-out
                ${t.exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
              `}
              style={{ animation: t.exiting ? undefined : 'slideInRight 0.3s ease-out' }}
              role="alert"
            >
              <span className={`text-lg font-bold ${ICON_COLORS[t.variant]} flex-shrink-0 mt-0.5`}>
                {style.icon}
              </span>
              <p className="text-sm text-gray-800 leading-snug flex-1">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none mt-0.5"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Keyframes for slide-in animation */}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(2rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
