import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, Badge, DetailRow, EmptyState, StatCard } from '@/components/ui/Display';
import { Field, Input, Switch, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { ActivityLogList } from '@/features/activity/ActivityLogList';
import { AdminCouponsTable, AdminPaymentsTable, AdminProductsTable, AdminReviewsTable } from '@/features/admin/AdminCatalog';
import { AdminOrdersTable } from '@/features/admin/AdminOrders';
import { AdminAffiliatesTable, AdminCustomersTable, AdminPayoutsTable } from '@/features/admin/AdminPeople';
import { AdminVendorsTable } from '@/features/admin/AdminVendors';
import { t } from '@/i18n';
import { cn, formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';
import { adminApi } from '@/services/adminApi';
import { sessionStore } from '@/services/session';
import { StoreStatus } from './AdminStoresPage';

/** The store's sections, grouped for the side menu. */
const SECTION_GROUPS = [
    { title: t('عام'), items: [{ value: 'overview', label: t('نظرة عامة'), icon: 'grid' }] },
    {
        title: t('المبيعات'),
        items: [
            { value: 'orders', label: t('الطلبات'), icon: 'shopping-bag', permission: 'orders.view' },
            { value: 'payments', label: t('المدفوعات'), icon: 'credit-card', permission: 'payments.view' },
            { value: 'coupons', label: t('الكوبونات'), icon: 'percent', permission: 'coupons.view' },
        ],
    },
    {
        title: t('الكتالوج'),
        items: [
            { value: 'products', label: t('المنتجات'), icon: 'box', permission: 'products.view' },
            { value: 'reviews', label: t('التقييمات'), icon: 'star', permission: 'reviews.view' },
        ],
    },
    {
        title: t('العملاء والمسوّقين'),
        items: [
            { value: 'customers', label: t('العملاء'), icon: 'user', permission: 'customers.view' },
            { value: 'affiliates', label: t('المسوّقين'), icon: 'megaphone', permission: 'affiliates.view' },
            { value: 'payouts', label: t('التحويلات'), icon: 'wallet', permission: 'affiliates.view' },
        ],
    },
    {
        title: t('الإدارة'),
        items: [
            { value: 'team', label: t('الحسابات'), icon: 'users', permission: 'vendors.view' },
            { value: 'activity', label: t('السجل'), icon: 'clock', permission: 'logs.view' },
        ],
    },
];

/**
 * The store's sections: a grouped side menu on large screens, a grouped dropdown on small ones.
 *
 * @param {{ groups: typeof SECTION_GROUPS, value: string, onChange: (value: string) => void }} props
 */
function SectionNav({ groups, value, onChange }) {
    return (
        <>
            <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={t('أقسام المتجر')} className="mk-input cursor-pointer lg:hidden">
                {groups.map((group) => (
                    <optgroup key={group.title} label={group.title}>
                        {group.items.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>

            <nav aria-label={t('أقسام المتجر')} className="mk-card hidden flex-col gap-4 p-3 lg:sticky lg:top-24 lg:flex">
                {groups.map((group) => (
                    <div key={group.title}>
                        <p className="px-3 pb-1.5 text-[11px] font-semibold text-muted">{group.title}</p>
                        <ul className="flex flex-col gap-0.5">
                            {group.items.map((item) => (
                                <li key={item.value}>
                                    <button
                                        type="button"
                                        onClick={() => onChange(item.value)}
                                        aria-current={item.value === value ? 'page' : undefined}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                                            item.value === value ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                                        )}
                                    >
                                        <Icon name={item.icon} className="size-[18px]" />
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </>
    );
}

/** Everything about one store, with the platform's controls over it. */
export function AdminStorePage() {
    const { storeId } = useParams();
    const { can } = useAdminAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const groups = SECTION_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || can(item.permission)) })).filter((group) => group.items.length > 0);
    const tab = groups.some((group) => group.items.some((item) => item.value === searchParams.get('tab'))) ? searchParams.get('tab') : 'overview';
    const [store, setStore] = useState(null);
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

            <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <SectionNav groups={groups} value={tab} onChange={(value) => setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true })} />
                <section className="mk-card min-w-0 overflow-hidden">
                    {tab === 'overview' && <OverviewTab store={store} />}
                    {tab === 'orders' && <AdminOrdersTable storeId={store.store_id} />}
                    {tab === 'products' && <AdminProductsTable storeId={store.store_id} />}
                    {tab === 'customers' && <AdminCustomersTable storeId={store.store_id} />}
                    {tab === 'affiliates' && <AdminAffiliatesTable storeId={store.store_id} />}
                    {tab === 'payouts' && <AdminPayoutsTable storeId={store.store_id} />}
                    {tab === 'payments' && <AdminPaymentsTable storeId={store.store_id} />}
                    {tab === 'coupons' && <AdminCouponsTable storeId={store.store_id} />}
                    {tab === 'reviews' && <AdminReviewsTable storeId={store.store_id} />}
                    {tab === 'team' && <AdminVendorsTable storeId={store.store_id} />}
                    {tab === 'activity' && <ActivityLogList load={adminApi.logs} fixed={{ store_id: store.store_id }} />}
                </section>
            </div>

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
                <DetailRow label={t('رابط المتجر')} ltr>
                    {store.url}
                </DetailRow>
            </dl>
        </div>
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
        <ConfirmDialog open={open} onClose={onClose} onConfirm={() => onConfirm(reason)} loading={busy} icon="lock" title={t('إيقاف المتجر؟')} description={t('سيُغلق المتجر أمام العملاء ويُسجَّل خروج صاحبه وفريقه حتى تعيد تفعيله.')} confirmLabel={t('إيقاف')}>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('سبب الإيقاف (يظهر لصاحب المتجر)')} maxLength={255} className="mt-3" aria-label={t('سبب الإيقاف')} />
        </ConfirmDialog>
    );
}
