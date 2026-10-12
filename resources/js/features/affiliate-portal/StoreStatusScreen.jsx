import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Icon } from '@/components/ui/Icon';

const TONES = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    primary: 'bg-primary-soft text-primary',
};

/** Centered icon + message screen inside the store-branded layout. */
export function StoreStatusScreen({ store, icon, tone = 'primary', title, children, actions }) {
    return (
        <StorePublicLayout store={store} narrow>
            <div className="animate-pop text-center">
                <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${TONES[tone]}`}>
                    <Icon name={icon} className="size-8" />
                </span>
                <h1 className="mt-6 text-2xl font-bold text-ink">{title}</h1>
                {children && <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>}
                {actions && <div className="mt-8 flex flex-col gap-3">{actions}</div>}
            </div>
        </StorePublicLayout>
    );
}

export function StoreNotFound() {
    return (
        <StoreStatusScreen icon="store" tone="danger" title="المتجر غير موجود">
            تأكد من الرابط الذي أرسله لك المتجر.
        </StoreStatusScreen>
    );
}
