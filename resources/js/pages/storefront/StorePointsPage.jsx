import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { formatMultiplier, TierProgress } from '@/features/loyalty/TierProgress';
import { useStorefront } from '@/features/storefront/StorefrontLayout';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/format';

export const POINT_REASONS = {
    earned: t('نقاط طلب تم توصيله'),
    redeemed: t('استخدام نقاط في طلب'),
    refunded: t('استرجاع نقاط طلب ملغي'),
    reversed: t('خصم نقاط طلب مرتجع'),
    adjusted: t('من المتجر'),
};

/** The shopper's points balance, their tier, how the program works and their points history. */
export function StorePointsPage() {
    const { storeSlug } = useParams();
    const { store } = useStorefront();
    const { isAuthenticated, api } = useCustomerAuth();
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (store) {
            document.title = `${t('نقاطي')} | ${store.name}`;
        }
    }, [store]);

    useEffect(() => {
        if (isAuthenticated) {
            api.points().then(setResult).catch((loadError) => setError(loadError.message));
        }
    }, [isAuthenticated, api]);

    if (!isAuthenticated) {
        return <Navigate to={`/${storeSlug}/account/login?next=account/points`} replace />;
    }

    const loadMore = async () => {
        setLoadingMore(true);

        try {
            const response = await api.points(result.meta.current_page + 1);
            setResult((current) => ({ ...response, data: [...current.data, ...response.data] }));
        } finally {
            setLoadingMore(false);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل النقاط')} description={error} />;
    }

    if (!result) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <Skeleton className="h-36 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    const { summary } = result;

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <h1 className="mk-page-title">{t('نقاطي')}</h1>

            <section className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-panel p-6 text-white shadow-raise">
                <div className="mk-grid-texture absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
                <div className="relative">
                    <p className="text-sm text-panel-text">{t('رصيدك')}</p>
                    <p className="mk-num mt-1 text-[34px] leading-[44px] font-semibold text-brand-green">{t('{count} نقطة', { count: formatNumber(summary.balance) })}</p>
                    <p className="mt-1 text-sm text-panel-text">{t('تساوي خصم {amount} على طلبك القادم', { amount: formatMoney(summary.balance_value) })}</p>
                </div>
                <Icon name="star" className="relative size-14 fill-brand-green/15 text-brand-green/70" />
            </section>

            {summary.enabled && summary.tier && (
                <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
                    <h2 className="font-semibold text-ink">{t('مستواك')}</h2>
                    <TierProgress tier={summary.tier} className="text-ink" />
                    <ul className="grid gap-2 text-sm sm:grid-cols-3">
                        {summary.tier.tiers.map((tier) => {
                            const isCurrent = summary.tier.current?.name === tier.name;

                            return (
                                <li key={tier.name} className={cn('rounded-xl border p-3', isCurrent ? 'border-warning bg-warning-soft' : 'border-line')}>
                                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                                        <Icon name="award" className={cn('size-4', isCurrent ? 'text-warning' : 'text-muted')} />
                                        {tier.name}
                                    </p>
                                    <p className="mt-1 text-xs text-ink-2">
                                        {tier.min_spend > 0 ? t('من {amount} مشتريات', { amount: formatMoney(tier.min_spend) }) : t('من أول طلب')}
                                        {' · '}
                                        {t('نقاط {multiplier}', { multiplier: formatMultiplier(tier.multiplier) })}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {summary.enabled && (
                <ul className="grid gap-3 text-sm sm:grid-cols-3">
                    <li className="rounded-2xl border border-line bg-surface p-4">
                        <p className="font-semibold text-ink">{t('اكسب')}</p>
                        <p className="mt-1 text-ink-2">{t('{points} نقطة عن كل ١٠٠ جنيه في طلباتك المسلّمة', { points: formatNumber(summary.earn_rate) })}</p>
                    </li>
                    <li className="rounded-2xl border border-line bg-surface p-4">
                        <p className="font-semibold text-ink">{t('استبدل')}</p>
                        <p className="mt-1 text-ink-2">{t('كل نقطة = {value} خصم عند إتمام الطلب', { value: formatMoney(summary.point_value) })}</p>
                    </li>
                    <li className="rounded-2xl border border-line bg-surface p-4">
                        <p className="font-semibold text-ink">{t('ابدأ من')}</p>
                        <p className="mt-1 text-ink-2">{t('{points} نقطة كحد أدنى للاستخدام', { points: formatNumber(summary.min_redeem) })}</p>
                    </li>
                </ul>
            )}

            <section className="rounded-2xl border border-line bg-surface">
                <h2 className="border-b border-line p-4 font-semibold text-ink">{t('سجل النقاط')}</h2>
                {result.data.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted">{t('لا توجد حركات بعد. ستُضاف نقاطك بعد توصيل أول طلب.')}</p>
                ) : (
                    <ul className="divide-y divide-line">
                        {result.data.map((row) => (
                            <li key={row.transaction_id} className="flex items-center justify-between gap-3 p-4 text-sm">
                                <span>
                                    <span className="block font-medium text-ink">{POINT_REASONS[row.type]}</span>
                                    <span className="text-xs text-muted">
                                        {formatDate(row.created_at)}
                                        {row.order_number && ` · ${t('طلب #{number}', { number: row.order_number })}`}
                                        {row.note && ` · ${row.note}`}
                                    </span>
                                </span>
                                <span className={row.points > 0 ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                                    <span className="ltr inline-block">{row.points > 0 ? `+${formatNumber(row.points)}` : `-${formatNumber(-row.points)}`}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {result.meta.current_page < result.meta.last_page && (
                    <div className="border-t border-line p-3">
                        <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                            {t('عرض المزيد')}
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );
}
