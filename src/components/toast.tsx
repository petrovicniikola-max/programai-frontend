'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastContextValue = {
  error: string | null;
  showError: (msg: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);
  const clear = useCallback(() => setError(null), []);
  return (
    <ToastContext.Provider value={{ error, showError, clear }}>
      {children}
      {error && (
        <div
          className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { error: null, showError: () => {}, clear: () => {} };
}
