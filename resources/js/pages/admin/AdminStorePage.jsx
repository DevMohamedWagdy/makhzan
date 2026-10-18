import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, Badge, Card, DetailRow, EmptyState, StatCard } from '@/components/ui/Display';
import { Field, Input, Switch, Textarea } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { ActivityLogList } from '@/features/activity/ActivityLogList';
import { ActivateSubscriptionModal } from '@/features/admin/ActivateSubscriptionModal';
import { AdminOrdersTable } from '@/features/admin/AdminOrders';
import { AdminVendorsTable } from '@/features/admin/AdminVendors';
import { BILLING_METHODS } from '@/features/billing/billing';
import { ProductStatusBadge } from '@/features/products/ProductBadges';
import { localized, t } from '@/i18n';
import { formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { adminApi } from '@/services/adminApi';
import { sessionStore } from '@/services/session';
import { BillingBadge } from './AdminOverviewPage';
import { StoreStatus } from './AdminStoresPage';

const TABS = [
    { value: 'overview', label: t('نظرة عامة'), icon: 'grid' },
    { value: 'orders', label: t('الطلبات'), icon: 'shopping-bag', permission: 'orders.view' },
    { value: 'products', label: t('المنتجات'), icon: 'box' },
    { value: 'customers', label: t('العملاء'), icon: 'user' },
    { value: 'team', label: t('الحسابات'), icon: 'users', permission: 'vendors.view' },
    { value: 'billing', label: t('الاشتراك'), icon: 'zap' },
    { value: 'activity', label: t('السجل'), icon: 'clock', permission: 'logs.view' },
];

/** Everything about one store, with the platform's controls over it. */
export function AdminStorePage() {
    const { storeId } = useParams();
    const { can } = useAdminAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabs = TABS.filter((tab) => !tab.permission || can(tab.permission));
    const tab = tabs.some((item) => item.value === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
    const [store, setStore] = useState(null);
    const [plans, setPlans] = useState([]);
    const [error, setError] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .store(storeId)
            .then(setStore)
            .catch((loadError) => setError(loadError.message));
    }, [storeId]);

    useEffect(load, [load]);

    useEffect(() => {
        if (can('plans.view')) {
            adminApi.plans().then(setPlans).catch(() => {});
        }
    }, [can]);

    const act = async (action, message) => {
        setBusy(true);

        try {
            setStore(await action());
            toast.success(message);
            setDialog(null);
        } catch (actionError) {
            toast.error(t('تعذر تنفيذ الإجراء'), Object.values(actionError.errors ?? {})[0] ?? actionError.message);
        } finally {
            setBusy(false);
        }
    };

    /** Opens the store's dashboard as its owner in a new tab (a one-hour session). */
    const impersonate = async () => {
        const tab = window.open('', '_blank');

        try {
            const { token, vendor } = await adminApi.impersonate(store.store_id);

            sessionStore.handoff({ token, vendor });
            tab.location.href = '/impersonate';
        } catch (actionError) {
            tab?.close();
            toast.error(t('تعذر الدخول بحساب المتجر'), actionError.message);
        }
    };

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل المتجر')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />;
    }

    if (!store) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title={store.name}
                description={`/${store.slug}`}
                breadcrumbs={[t('الإدارة'), t('المتاجر'), store.name]}
                actions={
                    <>
                        <Button variant="secondary" icon="external-link" onClick={() => window.open(store.url, '_blank', 'noopener')}>
                            {t('زيارة المتجر')}
                        </Button>
                        {can('stores.impersonate') && (
                            <Button variant="secondary" icon="log-in" onClick={impersonate}>
                                {t('الدخول كصاحب المتجر')}
                            </Button>
                        )}
                    </>
                }
            />

            <section className="mk-card mb-6 flex flex-wrap items-center gap-4 p-5">
                <Avatar name={store.name} src={store.logo_url} size="lg" />
                <div className="min-w-64 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink">
                        {store.name}
                        <StoreStatus store={store} />
                        {!store.accepting_orders && <Badge tone="warning">{t('لا يستقبل طلبات')}</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                        {store.owner?.full_name} · <span className="ltr">{store.owner?.phone}</span> · {findGovernorate(store.governorate_id)?.name} · {t('منذ {date}', { date: formatDate(store.created_at) })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {can('subscriptions.manage') && (
                        <>
                            <Button size="sm" icon="zap" onClick={() => setDialog('activate')} disabled={plans.length === 0}>
                                {t('تفعيل / تجديد اشتراك')}
                            </Button>
                            <Button size="sm" variant="secondary" icon="clock" onClick={() => setDialog('trial')}>
                                {t('تمديد التجربة')}
                            </Button>
                        </>
                    )}
                    {can('stores.update') && (
                        <Button size="sm" variant="secondary" icon="edit" onClick={() => setDialog('edit')}>
                            {t('تعديل المتجر')}
                        </Button>
                    )}
                    {can('stores.suspend') &&
                        (store.suspended_at ? (
                            <Button size="sm" variant="success" icon="check-circle" loading={busy} onClick={() => act(() => adminApi.unsuspend(store.store_id), t('تمت إعادة تفعيل المتجر'))}>
                                {t('إعادة التفعيل')}
                            </Button>
                        ) : (
                            <Button size="sm" variant="danger-soft" icon="lock" onClick={() => setDialog('suspend')}>
                                {t('إيقاف المتجر')}
                            </Button>
                        ))}
                </div>
                {store.suspended_at && <p className="w-full rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{t('موقوف منذ {date}: {reason}', { date: formatDate(store.suspended_at), reason: store.suspension_reason })}</p>}
            </section>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={tab} onChange={(value) => setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true })} className="px-3" />
                {tab === 'overview' && <OverviewTab store={store} />}
                {tab === 'orders' && <AdminOrdersTable storeId={store.store_id} />}
                {tab === 'products' && <ProductsTab storeId={store.store_id} />}
                {tab === 'customers' && <CustomersTab storeId={store.store_id} />}
                {tab === 'team' && <AdminVendorsTable storeId={store.store_id} />}
                {tab === 'billing' && <BillingTab store={store} />}
                {tab === 'activity' && <ActivityLogList load={adminApi.logs} fixed={{ store_id: store.store_id }} />}
            </section>

            {dialog === 'activate' && (
                <ActivateSubscriptionModal
                    store={store}
                    plans={plans}
                    onClose={() => setDialog(null)}
                    onSaved={(next) => {
                        setDialog(null);
                        setStore(next);
                        toast.success(t('تم تفعيل الاشتراك'));
                    }}
                />
            )}
            {dialog === 'trial' && <TrialModal busy={busy} onClose={() => setDialog(null)} onSubmit={(days) => act(() => adminApi.extendTrial(store.store_id, days), t('تم تمديد الفترة التجريبية'))} />}
            {dialog === 'edit' && <EditStoreModal store={store} busy={busy} onClose={() => setDialog(null)} onSubmit={(payload) => act(() => adminApi.updateStore(store.store_id, payload), t('تم حفظ المتجر'))} />}
            <SuspendDialog open={dialog === 'suspend'} busy={busy} onClose={() => setDialog(null)} onConfirm={(reason) => act(() => adminApi.suspend(store.store_id, reason), t('تم إيقاف المتجر'))} />
        </>
    );
}

function OverviewTab({ store }) {
    return (
        <div className="grid gap-6 p-5 xl:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label={t('المبيعات المسلّمة')} value={formatMoney(store.delivered_sales)} icon="bar-chart" tone="success" />
                <StatCard label={t('الطلبات')} value={formatNumber(store.orders_count)} icon="shopping-bag" hint={store.last_order_at ? t('آخر طلب {time}', { time: formatRelative(store.last_order_at) }) : t('لا طلبات بعد')} />
                <StatCard label={t('المنتجات')} value={formatNumber(store.products_count)} icon="box" tone="warning" />
                <StatCard label={t('فريق العمل')} value={formatNumber(store.staff_count)} icon="users" tone="info" />
            </div>
            <dl className="divide-y divide-line">
                <DetailRow label={t('المالك')}>{store.owner?.full_name}</DetailRow>
                <DetailRow label={t('الهاتف')} ltr>
                    {store.owner?.phone}
                </DetailRow>
                <DetailRow label={t('البريد')} ltr>
                    {store.owner?.email}
                </DetailRow>
                <DetailRow label={t('الاشتراك')}>
                    <BillingBadge billing={store.billing} />
                </DetailRow>
                <DetailRow label={t('ينتهي الاشتراك')}>{store.billing.plan_expires_at ? formatDate(store.billing.plan_expires_at) : '—'}</DetailRow>
                <DetailRow label={t('نهاية الفترة التجريبية')}>{store.billing.trial_ends_at ? formatDate(store.billing.trial_ends_at) : '—'}</DetailRow>
                <DetailRow label={t('رابط المتجر')} ltr>
                    {store.url}
                </DetailRow>
            </dl>
        </div>
    );
}

function usePagedList(fetcher, storeId) {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setError(null);
        fetcher(storeId, { page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [fetcher, storeId, page]);

    return { page, setPage, result, error };
}

function ProductsTab({ storeId }) {
    const { setPage, result, error } = usePagedList(adminApi.storeProducts, storeId);

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل المنتجات')} description={error} />;
    }

    return !result ? (
        <Skeleton className="m-4 h-40" />
    ) : result.data.length === 0 ? (
        <div className="p-6">
            <EmptyState icon="box" title={t('لا توجد منتجات')} />
        </div>
    ) : (
        <>
            <ul className="divide-y divide-line">
                {result.data.map((product) => (
                    <li key={product.product_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">{localized(product)}</span>
                            <span className="text-xs text-muted">
                                {localized(product.category)} · {t('المخزون {count}', { count: formatNumber(product.stock_total) })}
                            </span>
                        </span>
                        <span className="font-semibold text-ink">{formatMoney(product.price)}</span>
                        <ProductStatusBadge status={product.status} />
                    </li>
                ))}
            </ul>
            {result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}
        </>
    );
}

function CustomersTab({ storeId }) {
    const { setPage, result, error } = usePagedList(adminApi.storeCustomers, storeId);

    if (error) {
        return <EmptyState icon="alert-triangle" title={t('تعذر تحميل العملاء')} description={error} />;
    }

    return !result ? (
        <Skeleton className="m-4 h-40" />
    ) : result.data.length === 0 ? (
        <div className="p-6">
            <EmptyState icon="user" title={t('لا يوجد عملاء')} />
        </div>
    ) : (
        <>
            <ul className="divide-y divide-line">
                {result.data.map((customer) => (
                    <li key={customer.customer_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">{customer.full_name}</span>
                            <span className="ltr block text-start text-xs text-muted">{customer.phone}</span>
                        </span>
                        <span className="text-xs text-ink-2">{t('{count} طلب', { count: formatNumber(customer.stats.orders_count) })}</span>
                        <span className="font-semibold text-ink">{formatMoney(customer.stats.total_spent)}</span>
                    </li>
                ))}
            </ul>
            {result.meta.total > result.meta.per_page && (
                <div className="border-t border-line px-4 py-3">
                    <Pagination meta={result.meta} onPageChange={setPage} />
                </div>
            )}
        </>
    );
}

function BillingTab({ store }) {
    return (
        <div className="p-5">
            <Card title={t('مدفوعات الاشتراك')}>
                {store.payments.length === 0 ? (
                    <p className="text-sm text-muted">{t('لا توجد مدفوعات بعد.')}</p>
                ) : (
                    <ul className="divide-y divide-line text-sm">
                        {store.payments.map((payment) => (
                            <li key={payment.payment_id} className="flex items-center justify-between gap-3 py-2.5">
                                <span>
                                    <span className="block font-medium text-ink">
                                        {payment.plan_name} · {t('{count} شهر', { count: payment.months })}
                                    </span>
                                    <span className="text-xs text-muted">
                                        {formatDate(payment.starts_at)} ← {formatDate(payment.ends_at)} · {BILLING_METHODS[payment.method]}
                                        {payment.recorded_by && ` · ${payment.recorded_by}`}
                                    </span>
                                </span>
                                <span className="font-semibold text-ink">{formatMoney(payment.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

function TrialModal({ busy, onClose, onSubmit }) {
    const [days, setDays] = useState('7');

    return (
        <Modal open onClose={onClose} dismissible={!busy} icon="clock" title={t('تمديد الفترة التجريبية')}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit(Number(days));
                }}
                className="flex flex-col gap-4"
            >
                <Field label={t('عدد الأيام')} hint={t('تُضاف إلى نهاية التجربة الحالية، أو من اليوم إن كانت انتهت.')}>
                    {(props) => <Input {...props} type="number" min="1" max="365" value={days} onChange={(event) => setDays(event.target.value)} dir="ltr" className="text-start" />}
                </Field>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={busy} icon="check" disabled={!Number(days)}>
                        {t('تمديد')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function EditStoreModal({ store, busy, onClose, onSubmit }) {
    const [values, setValues] = useState({ name: store.name, accepting_orders: store.accepting_orders, closed_message: '' });

    return (
        <Modal open onClose={onClose} dismissible={!busy} icon="edit" title={t('تعديل المتجر')}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit({ ...values, closed_message: values.closed_message || null });
                }}
                className="flex flex-col gap-4"
            >
                <Field label={t('اسم المتجر')} required>
                    {(props) => <Input {...props} value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />}
                </Field>
                <Switch checked={values.accepting_orders} onChange={(checked) => setValues((current) => ({ ...current, accepting_orders: checked }))} label={t('يستقبل طلبات')} description={t('إيقافه يغلق إتمام الطلب في المتجر مع بقاء التصفح.')} />
                {!values.accepting_orders && (
                    <Field label={t('رسالة للعملاء')} optional>
                        {(props) => <Input {...props} value={values.closed_message} onChange={(event) => setValues((current) => ({ ...current, closed_message: event.target.value }))} maxLength={200} />}
                    </Field>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={busy} icon="check">
                        {t('حفظ')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function SuspendDialog({ open, busy, onClose, onConfirm }) {
    const [reason, setReason] = useState('');

    return (
        <ConfirmDialog open={open} onClose={onClose} onConfirm={() => onConfirm(reason)} loading={busy} icon="lock" title={t('إيقاف المتجر؟')} description={t('سيُغلق المتجر أمام العملاء ويُسجَّل خروج صاحبه وفريقه، ويمكنه فقط تجديد اشتراكه.')} confirmLabel={t('إيقاف')}>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('سبب الإيقاف (يظهر لصاحب المتجر)')} maxLength={255} className="mt-3" aria-label={t('سبب الإيقاف')} />
        </ConfirmDialog>
    );
}
