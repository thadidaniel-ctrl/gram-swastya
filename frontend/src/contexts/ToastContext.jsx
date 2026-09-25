import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, kind = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-atomic="true" aria-label={t('toast.notifications')}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.kind === 'error' ? 'toast-error' : t.kind === 'warning' ? 'toast-warning' : t.kind === 'success' ? 'toast-success' : 'toast-info'}`}
            role="alert"
          >
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(t.id)}
              aria-label={t('toast.dismiss')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}