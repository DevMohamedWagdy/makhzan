import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

const ToastContext = createContext(null);

const TONES = {
    success: { icon: 'check-circle', className: 'text-success' },
    error: { icon: 'alert-circle', className: 'text-danger' },
    info: { icon: 'info', className: 'text-info' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

    const push = useCallback(
        (tone, title, description) => {
            const id = crypto.randomUUID();

            setToasts((current) => [...current.slice(-3), { id, tone, title, description }]);
            setTimeout(() => dismiss(id), 4200);
        },
        [dismiss],
    );

    const toast = useMemo(
        () => ({
            success: (title, description) => push('success', title, description),
            error: (title, description) => push('error', title, description),
            info: (title, description) => push('info', title, description),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="pointer-events-none fixed bottom-4 end-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
                {toasts.map(({ id, tone, title, description }) => (
                    <div key={id} role="status" className="mk-card animate-pop pointer-events-auto flex items-start gap-3 p-4 shadow-pop">
                        <Icon name={TONES[tone].icon} className={cn('mt-0.5 size-5 shrink-0', TONES[tone].className)} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink">{title}</p>
                            {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{description}</p>}
                        </div>
                        <button type="button" onClick={() => dismiss(id)} className="text-muted hover:text-ink" aria-label={t('إغلاق التنبيه')}>
                            <Icon name="x" className="size-4" />
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
        throw new Error('useToast must be used within ToastProvider');
    }

    return context;
}
