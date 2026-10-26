import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { formatAddress } from '@/features/storefront/AddressFields';
import { t } from '@/i18n';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import { ordersApi } from '@/services/ordersApi';

const TYPES = {
    invoice: { label: t('فاتورة'), icon: 'file-text' },
    packing: { label: t('بوليصة تغليف'), icon: 'box' },
};

/** Money the courier collects: the total, unless the order was paid online. */
function amountToCollect(order) {
    return order.payment_method !== 'cod' && order.payment_status === 'paid' ? 0 : order.total;
}

/** Opens the print view for the given orders in a new tab. */
export function openOrderPrint(orderIds, type = 'invoice') {
    const query = new URLSearchParams([...orderIds.map((id) => ['ids[]', id]), ['type', type]]);

    window.open(`/dashboard/orders/print?${query}`, '_blank', 'noopener');
}

/**
 * /dashboard/orders/print?ids[]=…&type=invoice|packing — printable invoices (with prices) or
 * packing slips (for the warehouse: items to pick, the address and what to collect), one
 * order per A4 page. Opens the browser's print dialog once loaded.
 */
export function OrderPrintPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const ids = searchParams.getAll('ids[]').map(Number).filter((id) => id > 0);
    const type = TYPES[searchParams.get('type')] ? searchParams.get('type') : 'invoice';
    const { store } = useAuth();
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState(null);
    const idsKey = ids.join(',');

    useEffect(() => {
        document.title = t('طباعة الطلبات');

        if (!idsKey) {
            setError(t('لم يتم اختيار أي طلب للطباعة.'));

            return undefined;
        }

        let cancelled = false;

        ordersApi
            .list({ ids: idsKey.split(','), per_page: 100 })
            .then((result) => !cancelled && setOrders(result.data))
            .catch((loadError) => !cancelled && setError(loadError.message));

        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    useEffect(() => {
        if (orders?.length) {
            // Let the logo and fonts settle before the dialog freezes the page.
            const timer = setTimeout(() => window.print(), 400);

            return () => clearTimeout(timer);
        }

        return undefined;
    }, [orders, type]);

    const switchType = (next) => setSearchParams((current) => {
        current.set('type', next);

        return current;
    });

    return (
        <div className="min-h-screen bg-surface-2 print:bg-white">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 print:hidden">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(TYPES).map(([key, option]) => (
                        <Button key={key} size="sm" icon={option.icon} variant={key === type ? 'primary' : 'secondary'} onClick={() => switchType(key)}>
                            {option.label}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    {orders && <span className="text-sm text-muted">{t('{count} طلب', { count: orders.length })}</span>}
                    <Button size="sm" icon="printer" onClick={() => window.print()} disabled={!orders?.length}>
                        {t('طباعة')}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mx-auto max-w-xl p-6">
                    <Alert tone="danger">{error}</Alert>
                </div>
            )}

            {!orders && !error && (
                <div className="grid place-items-center p-16">
                    <Spinner />
                </div>
            )}

            {orders?.map((order) => (
                <article key={order.order_id} className="mx-auto my-6 w-full max-w-[210mm] break-after-page bg-white p-10 text-sm leading-relaxed text-neutral-900 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
                    {type === 'invoice' ? <Invoice order={order} store={store} /> : <PackingSlip order={order} store={store} />}
                </article>
            ))}
        </div>
    );
}

function SheetHeader({ order, store, title }) {
    return (
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
            <div className="flex items-center gap-3">
                {store?.logo_url && <img src={store.logo_url} alt="" className="size-14 rounded-lg object-contain" />}
                <div>
                    <p className="text-lg font-semibold">{store?.name}</p>
                    {store?.contact_phone && <p dir="ltr" className="text-end text-neutral-600">{store.contact_phone}</p>}
                    {store?.address && <p className="text-neutral-600">{store.address}</p>}
                </div>
            </div>
            <div className="text-end">
                <p className="text-xl font-semibold">{title}</p>
                <p className="mt-1 font-semibold">#{order.number}</p>
                <p className="text-neutral-600">{formatDate(order.created_at)}</p>
            </div>
        </header>
    );
}

function Recipient({ order, large = false }) {
    return (
        <section className={large ? 'rounded-lg border-2 border-neutral-900 p-4 text-base' : ''}>
            <p className="mb-1 text-xs font-semibold text-neutral-500">{t('الشحن إلى')}</p>
            <p className="font-semibold">{order.address.recipient_name}</p>
            <p dir="ltr" className="text-end font-semibold">{order.address.phone}</p>
            <p>{formatAddress(order.address)}</p>
            {order.address.landmark && <p className="text-neutral-600">{t('علامة مميزة: {value}', { value: order.address.landmark })}</p>}
        </section>
    );
}

function Invoice({ order, store }) {
    const rows = [
        [t('المجموع الفرعي'), order.subtotal],
        order.discount > 0 && [order.coupon_code ? t('خصم ({code})', { code: order.coupon_code }) : t('خصم'), -order.discount],
        [t('الشحن'), order.shipping_fee - (order.shipping_discount ?? 0)],
    ].filter(Boolean);

    return (
        <>
            <SheetHeader order={order} store={store} title={t('فاتورة')} />

            <div className="mt-6 grid grid-cols-2 gap-6">
                <Recipient order={order} />
                <section className="text-end">
                    <p className="mb-1 text-xs font-semibold text-neutral-500">{t('طريقة الدفع')}</p>
                    <p className="font-semibold">{PAYMENT_METHODS[order.payment_method]?.label ?? '—'}</p>
                    <p className="text-neutral-600">{order.payment_status === 'paid' ? t('مدفوع') : t('غير مدفوع')}</p>
                </section>
            </div>

            <table className="mt-8 w-full border-collapse">
                <thead>
                    <tr className="border-b border-neutral-300 text-xs text-neutral-500">
                        <th className="py-2 text-start font-semibold">{t('المنتج')}</th>
                        <th className="py-2 text-center font-semibold">{t('الكمية')}</th>
                        <th className="py-2 text-end font-semibold">{t('السعر')}</th>
                        <th className="py-2 text-end font-semibold">{t('الإجمالي')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item) => (
                        <tr key={item.item_id} className="border-b border-neutral-200">
                            <td className="py-2">
                                <p className="font-medium">{item.product_name}</p>
                                {(item.variant_title || item.sku) && <p className="text-xs text-neutral-500">{[item.variant_title, item.sku].filter(Boolean).join(' · ')}</p>}
                            </td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-end">{formatMoney(item.unit_price)}</td>
                            <td className="py-2 text-end">{formatMoney(item.line_total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <dl className="ms-auto mt-6 w-full max-w-xs">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1">
                        <dt className="text-neutral-600">{label}</dt>
                        <dd>{formatMoney(value)}</dd>
                    </div>
                ))}
                <div className="mt-2 flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-semibold">
                    <dt>{t('الإجمالي')}</dt>
                    <dd>{formatMoney(order.total)}</dd>
                </div>
            </dl>

            {order.customer_note && (
                <p className="mt-8 rounded-lg bg-neutral-100 p-3">
                    <span className="font-semibold">{t('ملاحظة العميل:')} </span>
                    {order.customer_note}
                </p>
            )}

            <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">{t('شكراً لتسوقك من {name}', { name: store?.name ?? '' })}</footer>
        </>
    );
}

function PackingSlip({ order, store }) {
    const collect = amountToCollect(order);

    return (
        <>
            <SheetHeader order={order} store={store} title={t('بوليصة تغليف')} />

            <div className="mt-6 grid grid-cols-2 gap-6">
                <Recipient order={order} large />
                <section className="flex flex-col items-center justify-center rounded-lg border-2 border-neutral-900 p-4 text-center">
                    <p className="text-xs font-semibold text-neutral-500">{collect > 0 ? t('المبلغ المطلوب تحصيله') : t('مدفوع مسبقاً')}</p>
                    <p className="mt-1 text-3xl font-semibold">{formatMoney(collect)}</p>
                </section>
            </div>

            <table className="mt-8 w-full border-collapse">
                <thead>
                    <tr className="border-b border-neutral-300 text-xs text-neutral-500">
                        <th className="w-10 py-2" />
                        <th className="py-2 text-start font-semibold">{t('المنتج')}</th>
                        <th className="py-2 text-start font-semibold">{t('كود المنتج')}</th>
                        <th className="py-2 text-center font-semibold">{t('الكمية')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item) => (
                        <tr key={item.item_id} className="border-b border-neutral-200">
                            <td className="py-3">
                                <span className="inline-block size-5 rounded border-2 border-neutral-400" />
                            </td>
                            <td className="py-3">
                                <p className="font-medium">{item.product_name}</p>
                                {item.variant_title && <p className="text-xs text-neutral-500">{item.variant_title}</p>}
                            </td>
                            <td dir="ltr" className="py-3 text-end font-mono text-xs">{item.sku ?? '—'}</td>
                            <td className="py-3 text-center text-lg font-semibold">{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="mt-4 text-neutral-600">{t('عدد القطع: {count}', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}</p>

            {order.customer_note && (
                <p className="mt-6 rounded-lg border border-neutral-300 p-3">
                    <span className="font-semibold">{t('ملاحظة العميل:')} </span>
                    {order.customer_note}
                </p>
            )}
        </>
    );
}
