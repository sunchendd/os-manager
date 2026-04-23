import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id, duration: toast.duration || 5000 };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const iconMap = {
    success: <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />,
    error: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />,
    warning: <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />,
    info: <Info className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />,
  };

  const borderMap: Record<string, string> = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-secondary)',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast容器 */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-80">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="rounded-xl p-4 shadow-xl animate-in slide-in-from-right fade-in duration-200 theme-transition"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${borderMap[toast.type]}40`,
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              {iconMap[toast.type]}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium theme-transition" style={{ color: 'var(--color-text-primary)' }}>{toast.title}</div>
                {toast.message && (
                  <div className="text-xs mt-1 theme-transition" style={{ color: 'var(--color-text-secondary)' }}>{toast.message}</div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="transition-colors theme-transition"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
