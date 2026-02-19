import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default', action }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);

    const newToast: Toast = {
      id,
      title,
      description,
      variant,
      action,
    };

    setToasts((prev) => [...prev, newToast]);

    // 5초 후 자동으로 닫기
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}

// Toast 컴포넌트
export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border ${
            toast.variant === 'destructive'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-gray-50 border-gray-200 text-gray-900'
          } animate-in slide-in-from-right-5 duration-300`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h4 className={`font-medium ${toast.variant === 'destructive' ? 'text-red-800' : 'text-gray-900'}`}>
                {toast.title}
              </h4>
              {toast.description && (
                <p className={`text-sm mt-1 ${toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-600'}`}>
                  {toast.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {toast.action && (
                <button
                  onClick={() => {
                    if (typeof toast.action === 'function') {
                      toast.action();
                    }
                  }}
                  className="text-sm underline"
                >
                  {toast.action}
                </button>
              )}
              <button
                onClick={() => dismiss(toast.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};