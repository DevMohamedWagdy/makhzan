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
                <article
                    key={order.order_id}
                    className="mx-auto my-6 flex min-h-[297mm] w-full max-w-[210mm] break-after-page flex-col bg-white p-[14mm] text-[13px] leading-relaxed text-neutral-900 shadow-sm [print-color-adjust:exact] last:break-after-auto print:my-0 print:min-h-0 print:max-w-none print:shadow-none"
                >
                    {type === 'invoice' ? <Invoice order={order} store={store} /> : <PackingSlip order={order} store={store} />}
                </article>
            ))}

            {/* No browser header/footer (date, URL, page count): the sheets carry their own margins. */}
            <style>{'@page { size: A4; margin: 0; }'}</style>
        </div>
    );
}

/** The store (logo, name, contact) on one side; the document's title, number and date on the other, over a brand rule. */
function SheetHeader({ order, store, title }) {
    return (
        <header>
            <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-3.5">
                    {store?.logo_url ? (
                        <img src={store.logo_url} alt="" className="size-16 rounded-xl border border-neutral-200 object-contain" />
                    ) : (
                        <span className="grid size-16 place-items-center rounded-xl bg-brand text-2xl font-bold text-white">{store?.name?.charAt(0)}</span>
                    )}
                    <div>
                        <p className="text-lg font-bold">{store?.name}</p>
                        {store?.contact_phone && (
                            <p dir="ltr" className="text-end text-neutral-600">
                                {store.contact_phone}
                            </p>
                        )}
                        {store?.address && <p className="text-neutral-600">{store.address}</p>}
                    </div>
                </div>
                <div className="text-end">
                    <p className="text-[28px] leading-none font-bold tracking-tight text-brand">{title}</p>
                    <dl className="mt-3 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-0.5 text-xs">
                        <dt className="text-neutral-500">{t('رقم الطلب')}</dt>
                        <dd className="font-bold">#{order.number}</dd>
                        <dt className="text-neutral-500">{t('التاريخ')}</dt>
                        <dd className="font-semibold">{formatDate(order.created_at)}</dd>
                    </dl>
                </div>
            </div>
            <div className="mt-6 flex h-1 overflow-hidden rounded-full">
                <span className="flex-1 bg-brand" />
                <span className="w-24 bg-gold" />
            </div>
        </header>
    );
}

/** A labelled box on a light tint, for the blocks under the header. */
function InfoBox({ label, children, className = '' }) {
    return (
        <section className={`rounded-xl bg-neutral-100 p-4 ${className}`}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-neutral-500">{label}</p>
            {children}
        </section>
    );
}

function Recipient({ order, large = false }) {
    return (
        <>
            <p className={large ? 'text-lg font-bold' : 'font-bold'}>{order.address.recipient_name}</p>
            <p dir="ltr" className={`text-end font-semibold ${large ? 'text-base' : ''}`}>
                {order.address.phone}
            </p>
            <p className="mt-1">{formatAddress(order.address)}</p>
            {order.address.landmark && <p className="text-neutral-600">{t('علامة مميزة: {value}', { value: order.address.landmark })}</p>}
        </>
    );
}

function CustomerNote({ note }) {
    return (
        <section className="mt-6 rounded-xl border border-dashed border-neutral-400 p-4">
            <p className="mb-1 text-[11px] font-semibold text-neutral-500">{t('ملاحظة العميل')}</p>
            <p>{note}</p>
        </section>
    );
}

function Invoice({ order, store }) {
    const isPaid = order.payment_status === 'paid';
    const rows = [
        [t('المجموع الفرعي'), order.subtotal],
        order.discount > 0 && [order.coupon_code ? t('خصم ({code})', { code: order.coupon_code }) : t('خصم'), -order.discount],
        order.points_discount > 0 && [t('خصم النقاط ({count} نقطة)', { count: order.points_redeemed }), -order.points_discount],
        [t('الشحن'), order.shipping_fee - (order.shipping_discount ?? 0)],
    ].filter(Boolean);

    return (
        <>
            <SheetHeader order={order} store={store} title={t('فاتورة')} />

            <div className="mt-6 grid grid-cols-[1.4fr_1fr] gap-4">
                <InfoBox label={t('فاتورة إلى')}>
                    <Recipient order={order} />
                </InfoBox>
                <InfoBox label={t('الدفع')}>
                    <p className="font-bold">{PAYMENT_METHODS[order.payment_method]?.label ?? '—'}</p>
                    <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isPaid ? t('مدفوع') : t('غير مدفوع')}
                    </span>
                </InfoBox>
            </div>

            <table className="mt-7 w-full border-separate border-spacing-0">
                <thead>
                    <tr className="bg-brand text-xs text-white">
                        <th className="w-10 rounded-s-lg py-2.5 ps-3 text-start font-semibold">#</th>
                        <th className="py-2.5 text-start font-semibold">{t('المنتج')}</th>
                        <th className="py-2.5 text-center font-semibold">{t('الكمية')}</th>
                        <th className="py-2.5 text-end font-semibold">{t('سعر الوحدة')}</th>
                        <th className="rounded-e-lg py-2.5 pe-3 text-end font-semibold">{t('الإجمالي')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr key={item.item_id} className="[&>td]:border-b [&>td]:border-neutral-200">
                            <td className="py-3 ps-3 text-neutral-500">{index + 1}</td>
                            <td className="py-3">
                                <p className="font-semibold">{item.product_name}</p>
                                {(item.variant_title || item.sku) && <p className="text-xs text-neutral-500">{[item.variant_title, item.sku].filter(Boolean).join(' · ')}</p>}
                            </td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-end whitespace-nowrap">{formatMoney(item.unit_price)}</td>
                            <td className="py-3 pe-3 text-end font-semibold whitespace-nowrap">{formatMoney(item.line_total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-6 flex items-start justify-between gap-8">
                <div className="max-w-[45%] pt-1 text-xs text-neutral-500">{order.customer_note && <CustomerNote note={order.customer_note} />}</div>
                <dl className="w-72 shrink-0">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5">
                            <dt className="text-neutral-600">{label}</dt>
                            <dd className="whitespace-nowrap">{formatMoney(value)}</dd>
                        </div>
                    ))}
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-white">
                        <dt className="font-semibold">{t('الإجمالي')}</dt>
                        <dd className="text-lg font-bold whitespace-nowrap">{formatMoney(order.total)}</dd>
                    </div>
                </dl>
            </div>

            <footer className="mt-auto border-t border-neutral-200 pt-5 text-center">
                <p className="font-semibold">{t('شكراً لتسوقك من {name}', { name: store?.name ?? '' })}</p>
                {store?.contact_phone && (
                    <p className="mt-0.5 text-xs text-neutral-500">
                        {t('للاستفسار:')} <span dir="ltr">{store.contact_phone}</span>
                    </p>
                )}
            </footer>
        </>
    );
}

function PackingSlip({ order, store }) {
    const collect = amountToCollect(order);
    const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            <SheetHeader order={order} store={store} title={t('بوليصة تغليف')} />

            <div className="mt-6 grid grid-cols-[1.4fr_1fr] gap-4">
                <section className="rounded-xl border-2 border-neutral-900 p-4">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-neutral-500">{t('الشحن إلى')}</p>
                    <Recipient order={order} large />
                </section>
                <section className={`flex flex-col items-center justify-center rounded-xl p-4 text-center ${collect > 0 ? 'bg-brand text-white' : 'border-2 border-neutral-900'}`}>
                    <p className={`text-xs font-semibold ${collect > 0 ? 'text-white/70' : 'text-neutral-500'}`}>{collect > 0 ? t('المبلغ المطلوب تحصيله') : t('مدفوع مسبقاً')}</p>
                    <p className="mt-1 text-[32px] leading-tight font-bold">{formatMoney(collect)}</p>
                    <p className={`mt-1 text-xs ${collect > 0 ? 'text-white/70' : 'text-neutral-500'}`}>{PAYMENT_METHODS[order.payment_method]?.label}</p>
                </section>
            </div>

            <dl className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-xl bg-neutral-100 py-3 text-center rtl:divide-x-reverse">
                <div>
                    <dt className="text-[11px] text-neutral-500">{t('عدد الأصناف')}</dt>
                    <dd className="text-base font-bold">{order.items.length}</dd>
                </div>
                <div>
                    <dt className="text-[11px] text-neutral-500">{t('عدد القطع')}</dt>
                    <dd className="text-base font-bold">{units}</dd>
                </div>
                <div>
                    <dt className="text-[11px] text-neutral-500">{t('رقم التتبع')}</dt>
                    <dd dir="ltr" className="font-mono text-sm font-bold">{order.shipment?.tracking_number ?? '—'}</dd>
                </div>
            </dl>

            <table className="mt-7 w-full border-separate border-spacing-0">
                <thead>
                    <tr className="bg-brand text-xs text-white">
                        <th className="w-12 rounded-s-lg py-2.5 ps-3 text-start font-semibold">{t('تم')}</th>
                        <th className="py-2.5 text-start font-semibold">{t('المنتج')}</th>
                        <th className="py-2.5 text-start font-semibold">{t('كود المنتج')}</th>
                        <th className="w-24 rounded-e-lg py-2.5 pe-3 text-center font-semibold">{t('الكمية')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item) => (
                        <tr key={item.item_id} className="[&>td]:border-b [&>td]:border-neutral-200">
                            <td className="py-3.5 ps-3">
                                <span className="inline-block size-6 rounded-md border-2 border-neutral-500" />
                            </td>
                            <td className="py-3.5">
                                <p className="font-semibold">{item.product_name}</p>
                                {item.variant_title && <p className="text-xs text-neutral-500">{item.variant_title}</p>}
                            </td>
                            <td dir="ltr" className="py-3.5 text-end font-mono text-xs">
                                {item.sku ?? '—'}
                            </td>
                            <td className="py-3.5 pe-3 text-center">
                                <span className="inline-grid min-w-10 place-items-center rounded-lg border-2 border-neutral-900 px-2 py-0.5 text-lg font-bold">{item.quantity}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {order.customer_note && <CustomerNote note={order.customer_note} />}

            <footer className="mt-auto grid grid-cols-3 gap-6 pt-12 text-center text-xs text-neutral-500">
                {[t('جهّزه'), t('راجعه'), t('استلمه المندوب')].map((label) => (
                    <div key={label}>
                        <div className="h-10 border-b border-neutral-400" />
                        <p className="mt-1.5">{label}</p>
                    </div>
                ))}
            </footer>
        </>
    );
}
