import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/format';

/**
 * "Have a discount code?" at checkout. `coupon` is the applied result from the coupon check
 * endpoint; `onApply(code)` resolves when the code was accepted or rejects with the reason.
 */
export function CouponBox({ coupon, error, onApply, onRemove }) {
    const [code, setCode] = useState('');
    const [applying, setApplying] = useState(false);

    if (coupon) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success-soft p-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-success">
                    <Icon name="gift" className="size-4 shrink-0" />
                    <span className="ltr font-mono font-semibold">{coupon.code}</span>
                    <span className="truncate">{coupon.free_shipping ? t('شحن مجاني') : t('وفّرت {amount}', { amount: formatMoney(coupon.discount) })}</span>
                </span>
                <button type="button" onClick={onRemove} className="shrink-0 text-xs font-medium text-ink-2 hover:text-danger">
                    {t('إزالة')}
                </button>
            </div>
        );
    }

    const apply = async (event) => {
        event.preventDefault();

        if (!code.trim()) {
            return;
        }

        setApplying(true);

        try {
            await onApply(code.trim());
            setCode('');
        } catch {
            // The reason is shown through `error`.
        } finally {
            setApplying(false);
        }
    };

    return (
        <form onSubmit={apply} className="flex flex-col gap-1.5">
            <div className="flex gap-2">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder={t('كود الخصم')} aria-label={t('كود الخصم')} dir="ltr" className="text-start font-mono uppercase" maxLength={32} aria-invalid={error ? 'true' : undefined} />
                <Button type="submit" variant="secondary" loading={applying} disabled={!code.trim()}>
                    {t('تطبيق')}
                </Button>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
        </form>
    );
}
