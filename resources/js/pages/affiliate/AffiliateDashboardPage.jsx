import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { PayoutRequestCard } from '@/features/affiliate-portal/PortalWidgets';
import { StatusBadge, TierBadge, formatCommission } from '@/features/affiliates/AffiliateBadges';
import { AffiliateOrderRow } from '@/features/affiliates/AffiliateOrdersList';
import { NotificationItem, affiliateNotificationTarget } from '@/features/notifications/NotificationItem';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

function SeeAll({ to, children }) {
    return (
        <Link to={to} className="text-sm font-medium text-primary hover:underline">
            {children}
        </Link>
    );
}

/** The first active referral link with a copy button, so the most common action is one tap away. */
function QuickShare({ codes }) {
    const { copy, copiedValue } = useCopy();
    const primary = codes.find((code) => code.is_active);

    if (!primary) {
        return null;
    }

    return (
        <div className="mk-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <span className="flex items-center gap-3 text-sm font-medium text-ink">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-brand-green ring-1 ring-primary/10 ring-inset">
                    <Icon name="link" className="size-[18px]" />
                </span>
                {t('رابطك للمشاركة')}
            </span>
            <code className="ltr flex h-8 min-w-0 flex-1 items-center truncate rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 font-mono text-xs text-ink-2">{primary.url}</code>
            <Button size="sm" variant={copiedValue === primary.url ? 'success' : 'primary'} icon={copiedValue === primary.url ? 'check' : 'copy'} onClick={() => copy(primary.url)}>
                {copiedValue === primary.url ? t('تم النسخ') : t('نسخ الرابط')}
            </Button>
        </div>
    );
}

/** The affiliate's home: earnings at a glance, balance, and the latest orders and notifications. */
export function AffiliateDashboardPage() {
    const navigate = useNavigate();
    const { affiliate, isImpersonating, notifications, openPayoutModal } = useAffiliatePortal();
    const [orders, setOrders] = useState(null);

    useEffect(() => {
        affiliatePortalApi
            .orders(1)
            .then(setOrders)
            .catch(() => setOrders({ data: [], summary: null }));
    }, [affiliate.stats.orders_count, affiliate.stats.pending_balance]);

    const expected = orders?.summary;
    const firstName = affiliate.full_name.split(' ')[0];

    return (
        <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-[22px] leading-8 font-semibold text-ink sm:text-[26px] sm:leading-9">{t('أهلاً {value} 👋', { value: firstName })}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={affiliate.status} />
                        <TierBadge tier={affiliate.tier} />
                        <span className="text-xs text-muted">{t('مسوق منذ {value}', { value: formatDate(affiliate.joined_at) })}</span>
                    </div>
                </div>
                <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-panel px-5 py-4 text-white shadow-raise">
                    <div className="mk-grid-texture absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />
                    <span className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-green">
                        <Icon name="percent" className="size-5" />
                    </span>
                    <div className="relative">
                        <p className="text-xs text-panel-text">{t('عمولتك على كل طلب')}</p>
                        <p className="mk-num text-[26px] leading-8 font-semibold text-brand-green">{formatCommission(affiliate.commission)}</p>
                    </div>
                </div>
            </div>

            <div className="mk-stat-group grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('طلباتي')} value={formatNumber(affiliate.stats.orders_count)} icon="shopping-bag" />
                <StatCard label={t('مبيعاتي')} value={formatMoney(affiliate.stats.sales_total)} icon="bar-chart" tone="info" />
                <StatCard label={t('إجمالي أرباحي')} value={formatMoney(affiliate.stats.earned_commission)} icon="wallet" tone="success" />
                <StatCard
                    label={t('رصيد مستحق')}
                    value={formatMoney(affiliate.stats.pending_balance)}
                    icon="refresh"
                    tone="warning"
                    hint={expected?.expected_orders ? t('+{amount} عند توصيل {count} طلب', { amount: formatMoney(expected.expected_commission), count: expected.expected_orders }) : undefined}
                />
            </div>

            <QuickShare codes={affiliate.referral_codes} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card title={t('أحدث الطلبات من روابطي')} description={t('العمولة تُضاف لرصيدك عند توصيل الطلب للعميل')} actions={<SeeAll to="/affiliate/orders">{t('كل الطلبات')}</SeeAll>}>
                        {!orders ? (
                            <Skeleton className="h-32 w-full rounded-xl" />
                        ) : orders.data.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{t('لا توجد طلبات من روابطك بعد.')}</p>
                        ) : (
                            <ul className="mk-list">
                                {orders.data.slice(0, 5).map((order) => (
                                    <AffiliateOrderRow key={order.order_id} order={order} />
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <PayoutRequestCard affiliate={affiliate} isImpersonating={isImpersonating} onRequest={openPayoutModal} />

                    <Card title={t('آخر الإشعارات')} actions={<SeeAll to="/affiliate/notifications">{t('عرض الكل')}</SeeAll>} bodyClassName="p-2">
                        {notifications.notifications.length === 0 ? (
                            <p className="p-4 text-center text-sm text-muted">{t('لا توجد إشعارات بعد.')}</p>
                        ) : (
                            notifications.notifications.slice(0, 4).map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    compact
                                    onOpen={(item) => {
                                        notifications.markRead(item);
                                        navigate(affiliateNotificationTarget(item));
                                    }}
                                />
                            ))
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
