import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useGoalData } from '@/contexts/GoalDataContext';
import { cn } from '@/lib/utils';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useGoalData();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200',
            'bg-bg-card text-text-primary',
            toast.type === 'error'
              ? 'border-text-primary ring-1 ring-text-primary'
              : 'border-border-strong'
          )}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-text-primary" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-text-primary" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-text-secondary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fechar notificação"
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
