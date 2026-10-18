import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { TierProgress } from '@/features/loyalty/TierProgress';
import { t } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/format';
import { loyaltyApi } from '@/services/loyaltyApi';

const REASONS = {
    earned: t('طلب تم توصيله'),
    redeemed: t('استخدمها في طلب'),
    refunded: t('استرجاع طلب ملغي'),
    reversed: t('طلب مرتجع'),
    adjusted: t('تعديل يدوي'),
};

/** A customer's points balance, tier and history in their drawer, with a manual give/take form. */
export function CustomerPoints({ customerId }) {
    const { can } = useAuth();
    const toast = useToast();
    const [result, setResult] = useState(null);
    const [points, setPoints] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        loyaltyApi.customerPoints(customerId).then(setResult).catch(() => setResult({ data: [], balance: 0 }));
    }, [customerId]);

    useEffect(load, [load]);

    const adjust = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            await loyaltyApi.adjust(customerId, { points: Number(points), note });
            toast.success(t('تم تعديل رصيد النقاط'));
            setPoints('');
            setNote('');
            setErrors({});
            load();
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر تعديل النقاط'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!result) {
        return null;
    }

    return (
        <section>
            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
                {t('نقاط الولاء')}
                <span className="rounded-lg bg-warning-soft px-2.5 py-1 text-xs text-warning">{t('{count} نقطة', { count: formatNumber(result.balance) })}</span>
            </h3>
            <TierProgress tier={result.tier} className="mb-3 rounded-xl border border-line p-3 text-ink" />
            {result.data.length > 0 && (
                <ul className="mb-3 flex flex-col divide-y divide-line rounded-xl border border-line text-sm">
                    {result.data.slice(0, 5).map((row) => (
                        <li key={row.transaction_id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="min-w-0 truncate text-ink-2">
                                {REASONS[row.type]}
                                {row.order_number && ` #${row.order_number}`}
                                {row.note && ` · ${row.note}`}
                                <span className="ms-1 text-xs text-muted">{formatDate(row.created_at)}</span>
                            </span>
                            <span className={row.points > 0 ? 'ltr font-semibold text-success' : 'ltr font-semibold text-danger'}>{row.points > 0 ? `+${row.points}` : row.points}</span>
                        </li>
                    ))}
                </ul>
            )}
            {can('loyalty.update') && (
                <form onSubmit={adjust} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-start">
                    <Field error={errors.points}>
                        {(props) => <Input {...props} type="number" value={points} onChange={(event) => setPoints(event.target.value)} placeholder={t('+100 أو -50')} aria-label={t('عدد النقاط')} dir="ltr" />}
                    </Field>
                    <Field error={errors.note}>
                        {(props) => <Input {...props} value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder={t('السبب: هدية، تعويض...')} aria-label={t('سبب التعديل')} />}
                    </Field>
                    <Button type="submit" variant="secondary" loading={saving} disabled={!points || Number(points) === 0}>
                        {t('تعديل')}
                    </Button>
                </form>
            )}
        </section>
    );
}
