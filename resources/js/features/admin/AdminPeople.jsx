import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, DetailRow, StatCard, StatStrip } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Form';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { AdminDataTable, storeColumn } from '@/features/admin/AdminDataTable';
import { AdminOrderDrawer } from '@/features/admin/AdminOrders';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { t } from '@/i18n';
import { AFFILIATE_STATUSES, AFFILIATE_TIERS, PAYOUT_METHODS, PAYOUT_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const options = (map, allLabel) => [{ value: '', label: allLabel }, ...Object.entries(map).map(([value, config]) => ({ value, label: config.label }))];

function Person({ name, phone, avatar }) {
    return (
        <span className="flex items-center gap-2.5">
            <Avatar name={name} src={avatar} size="sm" />
            <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{name}</span>
                <span className="ltr block text-start text-xs text-muted">{phone}</span>
            </span>
        </span>
    );
}

/** Orders inside a profile drawer; each one opens the order itself. */
function OrderList({ orders, onOpen }) {
    if (orders.length === 0) {
        return <p className="text-sm text-muted">{t('لا توجد طلبات بعد.')}</p>;
    }

    return (
        <ul className="divide-y divide-line text-sm">
            {orders.map((order) => (
                <li key={order.order_id}>
                    <button type="button" onClick={() => onOpen(order.order_id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-start hover:text-primary">
                        <span>
                            <span className="block font-semibold text-ink">#{order.number}</span>
                            <span className="text-xs text-muted">{formatRelative(order.created_at)}</span>
                        </span>
                        <span className="flex items-center gap-3">
                            <span className="font-semibold text-ink">{formatMoney(order.total)}</span>
                            <OrderStatusBadge status={order.status} />
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function DrawerLoading() {
    return (
        <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    );
}

/** Loads a profile (customer or affiliate) whenever the drawer opens for a new id. */
function useProfile(id, loader, onClose) {
    const toast = useToast();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        setProfile(null);

        if (id) {
            loader(id)
                .then(setProfile)
                .catch((error) => {
                    toast.error(t('تعذر فتح البيانات'), error.message);
                    onClose();
                });
        }
    }, [id, loader, toast, onClose]);

    return [profile, setProfile];
}

export function AdminCustomersTable({ storeId = null }) {
    const [openId, setOpenId] = useState(null);

    return (
        <>
            <AdminDataTable
                load={adminApi.customers}
                storeId={storeId}
                rowKey={(customer) => customer.customer_id}
                onRowClick={(customer) => setOpenId(customer.customer_id)}
                searchPlaceholder={t('اسم العميل أو هاتفه أو بريده...')}
                filters={[{ key: 'buyers', label: t('العملاء'), options: [{ value: '', label: t('كل العملاء') }, { value: '1', label: t('اشتروا بالفعل') }] }]}
                emptyIcon="users"
                emptyTitle={t('لا يوجد عملاء مطابقون')}
                columns={[
                    { label: t('العميل'), render: (customer) => <Person name={customer.full_name} phone={customer.phone} /> },
                    storeColumn,
                    { label: t('الطلبات'), render: (customer) => formatNumber(customer.stats.orders_count) },
                    { label: t('المسلّمة'), render: (customer) => formatNumber(customer.stats.delivered_orders) },
                    { label: t('إجمالي المشتريات'), className: 'font-semibold text-ink', render: (customer) => formatMoney(customer.stats.total_spent) },
                    { label: t('النقاط'), render: (customer) => formatNumber(customer.points_balance) },
                    { label: t('آخر طلب'), className: 'text-muted whitespace-nowrap', render: (customer) => (customer.last_order_at ? formatRelative(customer.last_order_at) : '—') },
                    { label: t('تاريخ التسجيل'), className: 'text-muted whitespace-nowrap', render: (customer) => formatDate(customer.created_at) },
                ]}
            />
            <AdminCustomerDrawer customerId={openId} onClose={() => setOpenId(null)} />
        </>
    );
}

export function AdminCustomerDrawer({ customerId, onClose }) {
    const [profile] = useProfile(customerId, adminApi.customer, onClose);
    const [orderId, setOrderId] = useState(null);
    const customer = profile?.data;

    return (
        <Drawer open={Boolean(customerId)} onClose={onClose} size="lg" icon="user" title={customer?.full_name ?? t('العميل')} description={customer ? t('عميل في {store}', { store: customer.store?.name }) : undefined}>
            {!customer ? (
                <DrawerLoading />
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    <div className="mk-stat-group m-6 grid-cols-2">
                        <StatCard label={t('الطلبات')} value={formatNumber(customer.stats.orders_count)} icon="shopping-bag" />
                        <StatCard label={t('المسلّمة')} value={formatNumber(customer.stats.delivered_orders)} icon="check-circle" tone="success" />
                        <StatCard label={t('إجمالي المشتريات')} value={formatMoney(customer.stats.total_spent)} icon="wallet" tone="info" />
                        <StatCard label={t('النقاط')} value={formatNumber(customer.points_balance)} icon="star" tone="warning" />
                    </div>
                    <dl className="flex flex-col p-6">
                        <DetailRow label={t('الهاتف')} ltr>
                            {customer.phone}
                        </DetailRow>
                        <DetailRow label={t('البريد')} ltr>
                            {customer.email ?? '—'}
                        </DetailRow>
                        <DetailRow label={t('المتجر')}>{customer.store?.name}</DetailRow>
                        <DetailRow label={t('متوسط الطلب')}>{formatMoney(customer.stats.average_order)}</DetailRow>
                        <DetailRow label={t('طلبات لم تكتمل')}>{formatNumber(customer.stats.failed_orders)}</DetailRow>
                        <DetailRow label={t('تاريخ التسجيل')}>{formatDate(customer.created_at)}</DetailRow>
                    </dl>
                    {customer.addresses?.length > 0 && (
                        <section className="p-6">
                            <h3 className="mb-3 text-sm font-semibold text-ink">{t('العناوين')}</h3>
                            <ul className="mk-list text-sm text-ink-2">
                                {customer.addresses.map((address) => (
                                    <li key={address.address_id} className="px-4 py-3">
                                        {address.recipient_name} · <span className="ltr">{address.phone}</span>
                                        <span className="block text-xs text-muted">{address.address_line}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('آخر الطلبات')}</h3>
                        <OrderList orders={profile.orders} onOpen={setOrderId} />
                    </section>
                    {profile.points.length > 0 && (
                        <section className="p-6">
                            <h3 className="mb-3 text-sm font-semibold text-ink">{t('حركة النقاط')}</h3>
                            <ul className="divide-y divide-line text-sm">
                                {profile.points.map((entry) => (
                                    <li key={entry.transaction_id} className="flex items-center justify-between gap-3 py-2">
                                        <span className="text-ink-2">
                                            {entry.note ?? (entry.order_number ? `#${entry.order_number}` : '—')}
                                            <span className="block text-xs text-muted">{formatRelative(entry.created_at)}</span>
                                        </span>
                                        <span className={entry.points >= 0 ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                                            {entry.points > 0 ? '+' : ''}
                                            {formatNumber(entry.points)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}
            <AdminOrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
        </Drawer>
    );
}

export function AdminAffiliatesTable({ storeId = null }) {
    const [openId, setOpenId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    return (
        <>
            <AdminDataTable
                load={adminApi.affiliates}
                storeId={storeId}
                reloadKey={reloadKey}
                rowKey={(affiliate) => affiliate.affiliate_id}
                onRowClick={(affiliate) => setOpenId(affiliate.affiliate_id)}
                searchPlaceholder={t('اسم المسوق أو هاتفه أو بريده...')}
                filters={[{ key: 'status', label: t('الحالة'), options: options(AFFILIATE_STATUSES, t('كل الحالات')) }]}
                emptyIcon="users"
                emptyTitle={t('لا يوجد مسوقون مطابقون')}
                columns={[
                    { label: t('المسوق'), render: (affiliate) => <Person name={affiliate.full_name} phone={affiliate.phone} avatar={affiliate.avatar_url} /> },
                    storeColumn,
                    { label: t('الحالة'), render: (affiliate) => <Badge tone={AFFILIATE_STATUSES[affiliate.status]?.tone}>{AFFILIATE_STATUSES[affiliate.status]?.label}</Badge> },
                    { label: t('الشريحة'), render: (affiliate) => AFFILIATE_TIERS[affiliate.tier]?.label ?? affiliate.tier },
                    { label: t('الطلبات'), render: (affiliate) => formatNumber(affiliate.stats.orders_count) },
                    { label: t('المبيعات'), render: (affiliate) => formatMoney(affiliate.stats.sales_total) },
                    { label: t('العمولات المكتسبة'), className: 'font-semibold text-ink', render: (affiliate) => formatMoney(affiliate.stats.earned_commission) },
                    { label: t('الرصيد المستحق'), render: (affiliate) => formatMoney(affiliate.stats.pending_balance) },
                ]}
            />
            <AdminAffiliateDrawer affiliateId={openId} onClose={() => setOpenId(null)} onChanged={() => setReloadKey((key) => key + 1)} />
        </>
    );
}

export function AdminAffiliateDrawer({ affiliateId, onClose, onChanged }) {
    const { can } = useAdminAuth();
    const toast = useToast();
    const [profile, setProfile] = useProfile(affiliateId, adminApi.affiliate, onClose);
    const [orderId, setOrderId] = useState(null);
    const [freezing, setFreezing] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const affiliate = profile?.data;

    const setStatus = async (status) => {
        setBusy(true);

        try {
            const updated = await adminApi.setAffiliateStatus(affiliate.affiliate_id, status, status === 'frozen' ? reason || null : null);

            setProfile((current) => ({ ...current, data: updated }));
            setFreezing(false);
            toast.success(status === 'frozen' ? t('تم تجميد حساب المسوق') : t('تم تفعيل حساب المسوق'));
            onChanged?.();
        } catch (error) {
            toast.error(t('تعذر تنفيذ الإجراء'), error.message);
        } finally {
            setBusy(false);
        }
    };

    const payout = affiliate?.payout_method;

    return (
        <Drawer
            open={Boolean(affiliateId)}
            onClose={onClose}
            size="lg"
            icon="users"
            title={affiliate?.full_name ?? t('المسوق')}
            description={affiliate ? t('مسوق في {store}', { store: affiliate.store?.name }) : undefined}
            footer={
                affiliate &&
                can('affiliates.update') && (
                    <div className="flex justify-end gap-2">
                        {affiliate.status === 'frozen' || affiliate.status === 'pending' ? (
                            <Button icon="check-circle" variant="success" loading={busy} onClick={() => setStatus('active')}>
                                {affiliate.status === 'pending' ? t('قبول المسوق') : t('إعادة التفعيل')}
                            </Button>
                        ) : (
                            <Button icon="lock" variant="danger-soft" onClick={() => setFreezing(true)}>
                                {t('تجميد الحساب')}
                            </Button>
                        )}
                    </div>
                )
            }
        >
            {!affiliate ? (
                <DrawerLoading />
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    <div className="flex flex-wrap items-center gap-2 px-6 pt-6">
                        <Badge tone={AFFILIATE_STATUSES[affiliate.status]?.tone}>{AFFILIATE_STATUSES[affiliate.status]?.label}</Badge>
                        <Badge tone={AFFILIATE_TIERS[affiliate.tier]?.tone}>{AFFILIATE_TIERS[affiliate.tier]?.label}</Badge>
                        {affiliate.frozen_reason && <span className="text-sm text-danger">{t('سبب التجميد: {reason}', { reason: affiliate.frozen_reason })}</span>}
                    </div>
                    <div className="mk-stat-group m-6 grid-cols-2">
                        <StatCard label={t('الطلبات')} value={formatNumber(affiliate.stats.orders_count)} icon="shopping-bag" />
                        <StatCard label={t('المبيعات')} value={formatMoney(affiliate.stats.sales_total)} icon="bar-chart" tone="info" />
                        <StatCard label={t('العمولات المكتسبة')} value={formatMoney(affiliate.stats.earned_commission)} icon="award" tone="success" />
                        <StatCard label={t('الرصيد المستحق')} value={formatMoney(affiliate.stats.pending_balance)} icon="wallet" tone="warning" />
                    </div>
                    <dl className="flex flex-col p-6">
                        <DetailRow label={t('الهاتف')} ltr>
                            {affiliate.phone}
                        </DetailRow>
                        <DetailRow label={t('البريد')} ltr>
                            {affiliate.email ?? '—'}
                        </DetailRow>
                        <DetailRow label={t('المتجر')}>{affiliate.store?.name}</DetailRow>
                        <DetailRow label={t('طريقة استلام العمولة')}>{payout?.type ? `${PAYOUT_METHODS[payout.type]?.label ?? payout.type} · ${payout.account_name ?? ''} ${payout.account_number ?? ''}` : '—'}</DetailRow>
                        <DetailRow label={t('أكواد الإحالة')}>{affiliate.referral_codes?.map((code) => code.code).join('، ') || '—'}</DetailRow>
                        <DetailRow label={t('انضم في')}>{affiliate.joined_at ? formatDate(affiliate.joined_at) : '—'}</DetailRow>
                        <DetailRow label={t('آخر نشاط')}>{affiliate.last_active_at ? formatRelative(affiliate.last_active_at) : '—'}</DetailRow>
                    </dl>
                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('آخر الطلبات')}</h3>
                        <OrderList orders={profile.orders} onOpen={setOrderId} />
                    </section>
                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('التحويلات')}</h3>
                        {profile.payouts.length === 0 ? (
                            <p className="text-sm text-muted">{t('لا توجد تحويلات بعد.')}</p>
                        ) : (
                            <ul className="divide-y divide-line text-sm">
                                {profile.payouts.map((item) => (
                                    <li key={item.payout_id} className="flex items-center justify-between gap-3 py-2.5">
                                        <span className="text-muted">{formatDate(item.created_at)}</span>
                                        <span className="flex items-center gap-3">
                                            <span className="font-semibold text-ink">{formatMoney(item.amount)}</span>
                                            <Badge tone={PAYOUT_STATUSES[item.status]?.tone}>{PAYOUT_STATUSES[item.status]?.label}</Badge>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}

            <AdminOrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />
            <Modal open={freezing} onClose={() => setFreezing(false)} dismissible={!busy} icon="lock" title={t('تجميد حساب المسوق')} description={t('لن يستطيع الدخول لبوابته، ولن تُحسب له عمولات جديدة حتى إعادة تفعيله.')}>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setStatus('frozen');
                    }}
                    className="flex flex-col gap-4"
                >
                    <Field label={t('السبب')} optional>
                        {(props) => <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} rows={3} />}
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setFreezing(false)} disabled={busy}>
                            {t('إلغاء')}
                        </Button>
                        <Button type="submit" variant="danger" loading={busy} icon="lock">
                            {t('تجميد')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Drawer>
    );
}

export function AdminPayoutsTable({ storeId = null }) {
    return (
        <AdminDataTable
            load={adminApi.payouts}
            storeId={storeId}
            rowKey={(item) => item.payout_id}
            filters={[{ key: 'status', label: t('الحالة'), options: options(PAYOUT_STATUSES, t('كل الحالات')) }]}
            emptyIcon="wallet"
            emptyTitle={t('لا توجد تحويلات مطابقة')}
            renderSummary={(result) =>
                result.summary && (
                    <StatStrip className="mb-0 px-5 pt-5 pb-5">
                        {Object.entries(PAYOUT_STATUSES).map(([status, config]) => (
                            <StatCard key={status} label={config.label} value={formatMoney(result.summary[status]?.amount ?? 0)} hint={t('{count} طلب', { count: formatNumber(result.summary[status]?.count ?? 0) })} icon={config.icon} tone={config.tone === 'danger' ? 'danger' : config.tone} />
                        ))}
                    </StatStrip>
                )
            }
            columns={[
                { label: t('المسوق'), render: (item) => <span className="font-medium text-ink">{item.affiliate?.full_name ?? '—'}</span> },
                storeColumn,
                { label: t('المبلغ'), className: 'font-semibold text-ink', render: (item) => formatMoney(item.amount) },
                { label: t('الطريقة'), render: (item) => PAYOUT_METHODS[item.payout_method?.type]?.label ?? '—' },
                { label: t('الحالة'), render: (item) => <Badge tone={PAYOUT_STATUSES[item.status]?.tone}>{PAYOUT_STATUSES[item.status]?.label}</Badge> },
                { label: t('التاريخ'), className: 'text-muted whitespace-nowrap', render: (item) => formatDate(item.created_at) },
            ]}
        />
    );
}
