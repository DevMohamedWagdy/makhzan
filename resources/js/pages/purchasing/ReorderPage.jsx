import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, EmptyState, StatCard, StatStrip } from '@/components/ui/Display';
import { Checkbox, Input } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Navigation';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { localized, t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';
import { purchaseOrdersApi } from '@/services/purchasingApi';

const SALES_PERIODS = [14, 30, 60, 90];
const COVER_PERIODS = [7, 14, 30, 60];

/**
 * Smart reorder: variants that will run out (at the pace they sold) before the cover period ends, or that
 * are under their low-stock threshold, grouped by the supplier of their last purchase order. Each group
 * turns into a draft purchase order with the suggested quantities, which can be adjusted first.
 */
export function ReorderPage() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const [days, setDays] = useState(30);
    const [coverDays, setCoverDays] = useState(30);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [skipped, setSkipped] = useState(() => new Set());

    const load = useCallback(() => {
        setError(null);
        setData(null);
        purchaseOrdersApi
            .reorderSuggestions({ days, cover_days: coverDays })
            .then((result) => {
                setData(result);
                setQuantities(Object.fromEntries(result.items.map((item) => [item.variant_id, String(item.suggested_quantity)])));
                setSkipped(new Set());
            })
            .catch((loadError) => setError(loadError.message));
    }, [days, coverDays]);

    useEffect(load, [load]);

    const groups = useMemo(() => {
        if (!data) {
            return [];
        }

        const bySupplier = new Map();

        data.items.forEach((item) => {
            const key = item.supplier_id ?? 0;

            if (!bySupplier.has(key)) {
                bySupplier.set(key, { supplierId: item.supplier_id, name: item.supplier_name, items: [] });
            }

            bySupplier.get(key).items.push(item);
        });

        // Suppliers first, then the variants never bought through a purchase order.
        return [...bySupplier.values()].sort((a, b) => (a.supplierId ? 0 : 1) - (b.supplierId ? 0 : 1));
    }, [data]);

    const toggle = (variantId) =>
        setSkipped((current) => {
            const next = new Set(current);
            next.has(variantId) ? next.delete(variantId) : next.add(variantId);

            return next;
        });

    const createOrder = (group) => {
        const items = group.items
            .filter((item) => !skipped.has(item.variant_id) && Number(quantities[item.variant_id]) > 0)
            .map((item) => ({
                variant_id: item.variant_id,
                label: item.variant_title ? `${localized({ name: item.product_name, name_en: item.product_name_en })} — ${item.variant_title}` : localized({ name: item.product_name, name_en: item.product_name_en }),
                sku: item.sku,
                quantity: quantities[item.variant_id],
                unit_cost: item.unit_cost == null ? '' : String(item.unit_cost),
            }));

        navigate('/dashboard/purchase-orders/new', { state: { supplierId: group.supplierId, items } });
    };

    const outOfStock = data ? data.items.filter((item) => item.stock === 0).length : 0;

    return (
        <>
            <PageHeader
                title={t('إعادة الطلب الذكية')}
                description={t('ماذا تشتري الآن وبأي كمية، حسب سرعة البيع والمخزون والبضاعة في الطريق')}
                breadcrumbs={[t('لوحة التحكم'), t('أوامر الشراء'), t('إعادة الطلب')]}
                actions={
                    <Button variant="secondary" icon="refresh" onClick={load}>
                        {t('تحديث')}
                    </Button>
                }
            />

            <section className="mk-card mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-ink-2">{t('احسب سرعة البيع من آخر')}</span>
                    <Tabs variant="segmented" tabs={SALES_PERIODS.map((value) => ({ value, label: t('{days} يوم', { days: formatNumber(value) }) }))} value={days} onChange={setDays} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-ink-2">{t('واطلب ما يكفي')}</span>
                    <Tabs variant="segmented" tabs={COVER_PERIODS.map((value) => ({ value, label: t('{days} يوم', { days: formatNumber(value) }) }))} value={coverDays} onChange={setCoverDays} />
                </div>
            </section>

            <StatStrip>
                <StatCard label={t('أصناف تحتاج طلب')} value={data ? formatNumber(data.totals.variants) : '—'} icon="sparkles" tone="primary" />
                <StatCard label={t('نفدت بالفعل')} value={data ? formatNumber(outOfStock) : '—'} icon="alert-triangle" tone="danger" />
                <StatCard label={t('قطع مقترحة')} value={data ? formatNumber(data.totals.units) : '—'} icon="box" tone="info" />
                <StatCard label={t('التكلفة التقديرية')} value={data ? formatMoney(data.totals.cost) : '—'} icon="wallet" tone="warning" hint={t('بتكلفة آخر شراء')} />
            </StatStrip>

            {error ? (
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل الاقتراحات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
            ) : !data ? (
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            ) : groups.length === 0 ? (
                <section className="mk-card p-6">
                    <EmptyState icon="check-circle" title={t('المخزون كافٍ')} description={t('لا يوجد صنف سينفد خلال {days} يوم بمعدل البيع الحالي، ولا صنف تحت حد التنبيه.', { days: formatNumber(coverDays) })} />
                </section>
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map((group) => {
                        const picked = group.items.filter((item) => !skipped.has(item.variant_id) && Number(quantities[item.variant_id]) > 0);
                        const groupCost = picked.reduce((sum, item) => sum + Number(quantities[item.variant_id]) * (item.unit_cost ?? 0), 0);

                        return (
                            <section key={group.supplierId ?? 'none'} className="mk-card overflow-hidden">
                                <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
                                    <Avatar name={group.name ?? '?'} size="md" />
                                    <div className="min-w-0 flex-1">
                                        {group.supplierId ? (
                                            <Link to={`/dashboard/suppliers/${group.supplierId}`} className="font-semibold text-ink hover:text-primary">
                                                {group.name}
                                            </Link>
                                        ) : (
                                            <p className="font-semibold text-ink">{t('بدون مورد سابق')}</p>
                                        )}
                                        <p className="text-xs text-muted">
                                            {t('{count} صنف · {amount}', { count: formatNumber(picked.length), amount: formatMoney(groupCost) })}
                                        </p>
                                    </div>
                                    {can('purchasing.create') && (
                                        <Button icon="plus" disabled={picked.length === 0} onClick={() => createOrder(group)}>
                                            {t('إنشاء أمر شراء')}
                                        </Button>
                                    )}
                                </header>
                                <div className="mk-scroll overflow-x-auto">
                                    <table className="w-full min-w-[820px] text-sm">
                                        <thead className="mk-thead">
                                            <tr>
                                                <th className="w-10 px-4 py-3" />
                                                {[t('المنتج'), t('المخزون'), t('في الطريق'), t('البيع اليومي'), t('يكفي لـ'), t('الكمية المقترحة'), t('تكلفة القطعة')].map((column) => (
                                                    <th key={column} className="px-3 py-3 text-start font-medium whitespace-nowrap">
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {group.items.map((item) => {
                                                const isSkipped = skipped.has(item.variant_id);

                                                return (
                                                    <tr key={item.variant_id} className={cn('transition-opacity', isSkipped && 'opacity-50')}>
                                                        <td className="px-4 py-3">
                                                            <Checkbox checked={!isSkipped} onChange={() => toggle(item.variant_id)} aria-label={t('تضمين في الأمر')} />
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="block font-medium text-ink">{localized({ name: item.product_name, name_en: item.product_name_en })}</span>
                                                            <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                                                                {item.variant_title && <span>{item.variant_title}</span>}
                                                                {item.sku && <span className="ltr">{item.sku}</span>}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            {item.stock === 0 ? (
                                                                <Badge tone="danger" dot>
                                                                    {t('نفد')}
                                                                </Badge>
                                                            ) : (
                                                                <span className={cn('mk-num', item.stock <= item.threshold ? 'font-semibold text-warning' : 'text-ink')}>{formatNumber(item.stock)}</span>
                                                            )}
                                                        </td>
                                                        <td className="mk-num px-3 py-3 text-ink-2">{item.incoming > 0 ? formatNumber(item.incoming) : '—'}</td>
                                                        <td className="mk-num px-3 py-3 text-ink-2">{item.daily_sales > 0 ? formatNumber(item.daily_sales) : '—'}</td>
                                                        <td className="px-3 py-3 whitespace-nowrap">
                                                            <DaysLeft item={item} coverDays={coverDays} />
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <Input
                                                                type="number"
                                                                inputMode="numeric"
                                                                min={1}
                                                                step={1}
                                                                value={quantities[item.variant_id] ?? ''}
                                                                onChange={(event) => setQuantities((current) => ({ ...current, [item.variant_id]: event.target.value }))}
                                                                disabled={isSkipped}
                                                                className="h-9 w-24 text-sm"
                                                                aria-label={t('الكمية المقترحة')}
                                                            />
                                                        </td>
                                                        <td className="mk-num px-3 py-3 whitespace-nowrap text-ink-2">{item.unit_cost == null ? '—' : formatMoney(item.unit_cost)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/** How long the current stock lasts at the recent pace, colored by urgency. */
function DaysLeft({ item, coverDays }) {
    if (item.stock === 0) {
        return <span className="text-xs font-medium text-danger">{t('نفد')}</span>;
    }

    if (item.days_left === null) {
        return <span className="text-xs text-muted">{t('تحت حد التنبيه')}</span>;
    }

    return <span className={cn('text-sm font-medium', item.days_left < coverDays / 2 ? 'text-danger' : 'text-warning')}>{t('{days} يوم', { days: formatNumber(item.days_left) })}</span>;
}
