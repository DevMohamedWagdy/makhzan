import { Avatar, Badge, EmptyState } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { CommissionCell, PayoutMethodLabel, StatusBadge, TierBadge } from './AffiliateBadges';

const COLUMNS = [t('المسوق'), t('الهاتف'), t('الشريحة'), t('العمولة'), t('وسيلة السحب'), t('المبيعات'), t('الحالة'), t('آخر نشاط'), ''];

/** The row menu, limited to what the account's role allows (`can` from useAuth). */
export function buildRowActions(affiliate, actions, can) {
    const canUpdate = can('affiliates.update');

    if (affiliate.status === 'pending') {
        return [
            { label: t('عرض الطلب'), icon: 'eye', onClick: () => actions.view(affiliate) },
            { label: t('قبول المسوق'), icon: 'check', tone: 'success', onClick: () => actions.approve(affiliate), hidden: !canUpdate },
            { divider: true },
            { label: t('رفض الطلب'), icon: 'x', tone: 'danger', onClick: () => actions.reject(affiliate), hidden: !canUpdate },
        ];
    }

    return [
        { label: t('عرض الملف'), icon: 'eye', onClick: () => actions.view(affiliate) },
        { label: t('تعديل البيانات'), icon: 'edit', onClick: () => actions.edit(affiliate), hidden: !canUpdate },
        { label: t('تخصيص عمولة استثنائية'), icon: 'percent', onClick: () => actions.commission(affiliate), hidden: !canUpdate },
        { label: affiliate.payout_request ? t('تأكيد طلب التحويل') : t('تسجيل دفعة عمولة'), icon: 'wallet', onClick: () => actions.payout(affiliate), hidden: affiliate.stats.pending_balance <= 0 || !can('payouts.update') },
        { label: t('الدخول بصفة المسوق'), icon: 'log-in', onClick: () => actions.impersonate(affiliate), hidden: !can('affiliates.impersonate') },
        { divider: true },
        affiliate.status === 'frozen'
            ? { label: t('إلغاء التجميد'), icon: 'zap', tone: 'success', onClick: () => actions.activate(affiliate), hidden: !canUpdate }
            : { label: t('تجميد / إيقاف الحساب'), icon: 'snowflake', onClick: () => actions.freeze(affiliate), hidden: !canUpdate },
        { label: t('حذف نهائي'), icon: 'trash', tone: 'danger', onClick: () => actions.remove(affiliate), hidden: !can('affiliates.delete') },
    ];
}

function LoadingRows({ count }) {
    return Array.from({ length: count }, (_, index) => (
        <tr key={index}>
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            </td>
            {COLUMNS.slice(1).map((column, cell) => (
                <td key={cell} className="px-4 py-4">
                    <Skeleton className="h-4 w-16" />
                </td>
            ))}
        </tr>
    ));
}

export function AffiliatesTable({ items, loading, error, perPage, actions, hasActiveFilters, onResetFilters, onAdd, onRetry }) {
    const { can } = useAuth();
    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل المسوقين')} description={error} action={<Button variant="secondary" icon="refresh" onClick={onRetry}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!loading && items.length === 0) {
        return hasActiveFilters ? (
            <EmptyState icon="search" title={t('لا توجد نتائج مطابقة')} description={t('جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر.')} action={<Button variant="secondary" icon="x" onClick={onResetFilters}>{t('مسح الفلاتر')}</Button>} />
        ) : (
            <EmptyState icon="users" title={t('لم تضف أي مسوق بعد')} description={t('ابدأ ببناء فريق المسوقين الخاص بمتجرك وتابع مبيعات كل واحد منهم.')} action={<Button icon="user-plus" onClick={onAdd}>{t('إضافة أول مسوق')}</Button>} />
        );
    }

    return (
        <div className="mk-scroll relative overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
                <thead className="mk-thead">
                    <tr>
                        {COLUMNS.map((column, index) => (
                            <th key={index} scope="col" className={cn('px-4 py-3 text-start font-medium whitespace-nowrap', !column && 'sticky end-0 bg-surface-2')}>
                                {column || <span className="sr-only">{t('الإجراءات')}</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                {/* Skeleton on first load only; later refreshes keep rows visible to avoid flicker. */}
                <tbody className={cn('divide-y divide-line transition-opacity', loading && items.length > 0 && 'opacity-60')} aria-busy={loading}>
                    {loading && items.length === 0 ? (
                        <LoadingRows count={Math.min(perPage, 8)} />
                    ) : (
                        items.map((affiliate) => (
                            <tr key={affiliate.affiliate_id} className="group cursor-pointer transition hover:bg-surface-2" onClick={() => actions.view(affiliate)}>
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={affiliate.full_name} src={affiliate.avatar_url} />
                                        <div className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    actions.view(affiliate);
                                                }}
                                                className="block truncate text-start font-semibold text-ink group-hover:text-primary hover:underline"
                                            >
                                                {affiliate.full_name}
                                            </button>
                                            <span className="ltr block truncate text-start text-xs text-muted">{affiliate.email ?? `#${affiliate.affiliate_id}`}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="ltr px-4 py-3.5 text-start whitespace-nowrap text-ink-2">{affiliate.phone}</td>
                                <td className="px-4 py-3.5">
                                    <TierBadge tier={affiliate.tier} />
                                </td>
                                <td className="px-4 py-3.5">
                                    <CommissionCell affiliate={affiliate} />
                                </td>
                                <td className="px-4 py-3.5">
                                    <PayoutMethodLabel type={affiliate.payout_method.type} />
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className="block font-semibold text-ink">{formatMoney(affiliate.stats.sales_total)}</span>
                                    <span className="text-xs text-muted">{t('{value} طلب', { value: formatNumber(affiliate.stats.orders_count) })}</span>
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex flex-col items-start gap-1">
                                        <StatusBadge status={affiliate.status} />
                                        {affiliate.payout_request && (
                                            <Badge tone="warning" icon="send">
                                                {t('طلب تحويل')}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-xs whitespace-nowrap text-muted">{formatRelative(affiliate.last_active_at)}</td>
                                {/* Actions stay pinned to the inline-end edge while the table scrolls horizontally. */}
                                <td className="sticky end-0 bg-surface px-4 py-3.5 shadow-[8px_0_12px_-10px_rgb(0_0_0/0.25)] ltr:shadow-[-8px_0_12px_-10px_rgb(0_0_0/0.25)] transition group-hover:bg-surface-2" onClick={(event) => event.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                        {affiliate.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => actions.approve(affiliate)}
                                                className="grid size-8 place-items-center rounded-lg bg-success-soft text-success hover:bg-success hover:text-white"
                                                aria-label={t('قبول {full_name}', { full_name: affiliate.full_name })}
                                                title={t('قبول')}
                                            >
                                                <Icon name="check" className="size-4" />
                                            </button>
                                        )}
                                        <Dropdown
                                            label={t('إجراءات {full_name}', { full_name: affiliate.full_name })}
                                            items={buildRowActions(affiliate, actions, can)}
                                            trigger={(props) => (
                                                <button type="button" {...props} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink aria-expanded:bg-surface-3 aria-expanded:text-ink">
                                                    <Icon name="more-vertical" className="size-[18px]" />
                                                </button>
                                            )}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
