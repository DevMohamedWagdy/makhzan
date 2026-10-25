import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, DetailRow, StatCard, StatStrip } from '@/components/ui/Display';
import { Drawer } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { AdminDataTable, storeColumn } from '@/features/admin/AdminDataTable';
import { Stars } from '@/features/reviews/Stars';
import { ProductImage } from '@/features/storefront/ProductCard';
import { t } from '@/i18n';
import { COUPON_STATES, PAYMENT_METHODS, PAYMENT_STATUSES, PRODUCT_STATUSES, REVIEW_STATUSES, STOCK_LEVELS } from '@/lib/constants';
import { formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const options = (map, allLabel) => [{ value: '', label: allLabel }, ...Object.entries(map).map(([value, config]) => ({ value, label: typeof config === 'string' ? config : config.label }))];

const COUPON_TYPES = { percentage: t('نسبة مئوية'), fixed: t('مبلغ ثابت'), free_shipping: t('شحن مجاني') };

export function AdminProductsTable({ storeId = null }) {
    const [openId, setOpenId] = useState(null);

    return (
        <>
            <AdminDataTable
                load={adminApi.products}
                storeId={storeId}
                rowKey={(product) => product.product_id}
                onRowClick={(product) => setOpenId(product.product_id)}
                searchPlaceholder={t('اسم المنتج أو الكود...')}
                filters={[
                    { key: 'status', label: t('الحالة'), options: options(PRODUCT_STATUSES, t('كل الحالات')) },
                    { key: 'stock', label: t('المخزون'), options: options(STOCK_LEVELS, t('كل المخزون')) },
                ]}
                emptyIcon="box"
                emptyTitle={t('لا توجد منتجات مطابقة')}
                columns={[
                    {
                        label: t('المنتج'),
                        render: (product) => (
                            <span className="flex items-center gap-3">
                                <span className="size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                                    <ProductImage src={product.image_url} alt="" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate font-medium text-ink">{product.name}</span>
                                    <span className="text-xs text-muted">{product.category?.name ?? '—'}</span>
                                </span>
                            </span>
                        ),
                    },
                    storeColumn,
                    { label: t('السعر'), className: 'font-semibold text-ink whitespace-nowrap', render: (product) => formatMoney(product.price) },
                    { label: t('المخزون'), render: (product) => formatNumber(product.stock_total) },
                    { label: t('الأنواع'), render: (product) => formatNumber(product.variants?.length ?? 0) },
                    { label: t('الحالة'), render: (product) => <Badge tone={PRODUCT_STATUSES[product.status]?.tone}>{PRODUCT_STATUSES[product.status]?.label}</Badge> },
                    { label: t('أضيف'), className: 'text-muted whitespace-nowrap', render: (product) => formatDate(product.created_at) },
                ]}
            />
            <AdminProductDrawer productId={openId} onClose={() => setOpenId(null)} />
        </>
    );
}

function AdminProductDrawer({ productId, onClose }) {
    const toast = useToast();
    const [product, setProduct] = useState(null);

    useEffect(() => {
        setProduct(null);

        if (productId) {
            adminApi
                .product(productId)
                .then(setProduct)
                .catch((error) => {
                    toast.error(t('تعذر فتح المنتج'), error.message);
                    onClose();
                });
        }
    }, [productId, toast, onClose]);

    return (
        <Drawer open={Boolean(productId)} onClose={onClose} size="lg" icon="box" title={product?.name ?? t('المنتج')} description={product ? t('في متجر {store}', { store: product.store?.name }) : undefined}>
            {!product ? (
                <div className="flex flex-col gap-4 p-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : (
                <div className="flex flex-col divide-y divide-line">
                    {product.images?.length > 0 && (
                        <div className="mk-rail flex gap-2 overflow-x-auto p-6">
                            {product.images.map((image) => (
                                <span key={image.image_id ?? image.url} className="size-24 shrink-0 overflow-hidden rounded-xl border border-line">
                                    <ProductImage src={image.url} alt="" />
                                </span>
                            ))}
                        </div>
                    )}
                    <dl className="flex flex-col p-6">
                        <DetailRow label={t('الحالة')}>
                            <Badge tone={PRODUCT_STATUSES[product.status]?.tone}>{PRODUCT_STATUSES[product.status]?.label}</Badge>
                        </DetailRow>
                        <DetailRow label={t('القسم')}>{product.category?.name ?? '—'}</DetailRow>
                        <DetailRow label={t('السعر')}>{product.price_max && product.price_max !== product.price ? `${formatMoney(product.price)} – ${formatMoney(product.price_max)}` : formatMoney(product.price)}</DetailRow>
                        <DetailRow label={t('إجمالي المخزون')}>{formatNumber(product.stock_total)}</DetailRow>
                        <DetailRow label={t('آخر تعديل')}>{formatRelative(product.updated_at)}</DetailRow>
                    </dl>
                    <section className="p-6">
                        <h3 className="mb-3 text-sm font-semibold text-ink">{t('الأنواع والمخزون')}</h3>
                        <div className="mk-scroll overflow-x-auto">
                            <table className="w-full min-w-[480px] text-sm">
                                <thead className="text-xs text-muted">
                                    <tr>
                                        {[t('النوع'), t('الكود'), t('السعر'), t('التكلفة'), t('المخزون')].map((column) => (
                                            <th key={column} className="py-2 text-start font-medium">
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {product.variants.map((variant) => (
                                        <tr key={variant.variant_id}>
                                            <td className="py-2 text-ink">{variant.title || t('أساسي')}</td>
                                            <td className="ltr py-2 text-start font-mono text-xs text-muted">{variant.sku ?? '—'}</td>
                                            <td className="py-2 font-semibold text-ink">{formatMoney(variant.price)}</td>
                                            <td className="py-2 text-ink-2">{variant.cost ? formatMoney(variant.cost) : '—'}</td>
                                            <td className="py-2 text-ink-2">{formatNumber(variant.stock)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    {product.description && (
                        <section className="p-6">
                            <h3 className="mb-2 text-sm font-semibold text-ink">{t('الوصف')}</h3>
                            <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{product.description}</p>
                        </section>
                    )}
                </div>
            )}
        </Drawer>
    );
}

export function AdminReviewsTable({ storeId = null }) {
    const { can } = useAdminAuth();
    const toast = useToast();
    const [reloadKey, setReloadKey] = useState(0);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const act = async (action, message) => {
        setBusy(true);

        try {
            await action();
            toast.success(message);
            setReloadKey((key) => key + 1);
        } catch (error) {
            toast.error(t('تعذر تنفيذ الإجراء'), error.message);
        } finally {
            setBusy(false);
            setDeleting(null);
        }
    };

    return (
        <>
            <AdminDataTable
                load={adminApi.reviews}
                storeId={storeId}
                reloadKey={reloadKey}
                rowKey={(review) => review.review_id}
                searchPlaceholder={t('اسم العميل أو المنتج أو نص التقييم...')}
                filters={[
                    { key: 'status', label: t('الحالة'), options: options(REVIEW_STATUSES, t('كل الحالات')) },
                    { key: 'rating', label: t('التقييم'), options: [{ value: '', label: t('كل التقييمات') }, ...[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: t('{count} نجوم', { count: rating }) }))] },
                ]}
                emptyIcon="star"
                emptyTitle={t('لا توجد تقييمات مطابقة')}
                minWidth="980px"
                columns={[
                    { label: t('المنتج'), render: (review) => <span className="font-medium text-ink">{review.product?.name ?? '—'}</span> },
                    storeColumn,
                    {
                        label: t('التقييم'),
                        render: (review) => (
                            <span className="block max-w-xs">
                                <Stars rating={review.rating} size="size-3.5" />
                                <span className="mt-1 line-clamp-2 text-ink-2">{review.body || '—'}</span>
                                <span className="text-xs text-muted">
                                    {review.customer_name} · {formatRelative(review.created_at)}
                                </span>
                            </span>
                        ),
                    },
                    { label: t('الحالة'), render: (review) => <Badge tone={REVIEW_STATUSES[review.status]?.tone}>{REVIEW_STATUSES[review.status]?.label}</Badge> },
                    {
                        label: t('إجراءات'),
                        render: (review) =>
                            can('reviews.update') && (
                                <span className="flex gap-1.5">
                                    {review.status !== 'approved' && (
                                        <Button size="sm" variant="soft" icon="check" disabled={busy} onClick={() => act(() => adminApi.updateReview(review.review_id, 'approved'), t('تم نشر التقييم'))}>
                                            {t('نشر')}
                                        </Button>
                                    )}
                                    {review.status !== 'rejected' && (
                                        <Button size="sm" variant="secondary" icon="eye-off" disabled={busy} onClick={() => act(() => adminApi.updateReview(review.review_id, 'rejected'), t('تم إخفاء التقييم'))}>
                                            {t('إخفاء')}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="danger-soft" icon="trash" disabled={busy} onClick={() => setDeleting(review)} aria-label={t('حذف')} />
                                </span>
                            ),
                    },
                ]}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={() => act(() => adminApi.deleteReview(deleting.review_id), t('تم حذف التقييم'))}
                loading={busy}
                tone="danger"
                icon="trash"
                title={t('حذف التقييم نهائياً؟')}
                description={t('سيُحذف التقييم وصوره، ويُعاد حساب تقييم المنتج.')}
                confirmLabel={t('حذف')}
            />
        </>
    );
}

export function AdminPaymentsTable({ storeId = null }) {
    return (
        <AdminDataTable
            load={adminApi.payments}
            storeId={storeId}
            rowKey={(payment) => payment.payment_id}
            searchPlaceholder={t('رقم الطلب أو العميل أو رقم العملية...')}
            filters={[{ key: 'status', label: t('الحالة'), options: options(PAYMENT_STATUSES, t('كل الحالات')) }]}
            emptyIcon="credit-card"
            emptyTitle={t('لا توجد مدفوعات أونلاين مطابقة')}
            renderSummary={(result) =>
                result.summary && (
                    <StatStrip className="mb-0 px-5 pt-5 pb-5">
                        <StatCard label={t('تم تحصيله أونلاين')} value={formatMoney(result.summary.collected)} icon="wallet" tone="success" />
                        <StatCard label={t('تم استرداده')} value={formatMoney(result.summary.refunded)} icon="refresh" tone="warning" />
                    </StatStrip>
                )
            }
            columns={[
                {
                    label: t('الطلب'),
                    render: (payment) => (
                        <span>
                            <span className="block font-semibold text-ink">#{payment.order?.number ?? '—'}</span>
                            <span className="text-xs text-muted">{payment.order?.customer_name}</span>
                        </span>
                    ),
                },
                storeColumn,
                { label: t('الطريقة'), render: (payment) => PAYMENT_METHODS[payment.method]?.short ?? payment.method },
                { label: t('المبلغ'), className: 'font-semibold text-ink whitespace-nowrap', render: (payment) => formatMoney(payment.amount) },
                { label: t('المسترد'), className: 'whitespace-nowrap', render: (payment) => (payment.refunded_amount > 0 ? formatMoney(payment.refunded_amount) : '—') },
                { label: t('الحالة'), render: (payment) => <Badge tone={PAYMENT_STATUSES[payment.status]?.tone}>{PAYMENT_STATUSES[payment.status]?.label ?? payment.status}</Badge> },
                { label: t('رقم العملية'), className: 'ltr text-start font-mono text-xs text-muted', render: (payment) => payment.transaction_id ?? '—' },
                { label: t('التاريخ'), className: 'text-muted whitespace-nowrap', render: (payment) => formatDate(payment.created_at) },
            ]}
        />
    );
}

export function AdminCouponsTable({ storeId = null }) {
    return (
        <AdminDataTable
            load={adminApi.coupons}
            storeId={storeId}
            rowKey={(coupon) => coupon.coupon_id}
            searchPlaceholder={t('كود الخصم...')}
            filters={[{ key: 'state', label: t('الحالة'), options: options(COUPON_STATES, t('كل الحالات')) }]}
            emptyIcon="percent"
            emptyTitle={t('لا توجد كوبونات مطابقة')}
            columns={[
                { label: t('الكود'), render: (coupon) => <span className="ltr font-mono font-semibold text-ink">{coupon.code}</span> },
                storeColumn,
                { label: t('الخصم'), render: (coupon) => (coupon.type === 'percentage' ? `${formatNumber(coupon.value)}%` : coupon.type === 'fixed' ? formatMoney(coupon.value) : COUPON_TYPES[coupon.type]) },
                { label: t('المسوق'), render: (coupon) => coupon.affiliate?.full_name ?? '—' },
                { label: t('مرات الاستخدام'), render: (coupon) => (coupon.usage_limit ? `${formatNumber(coupon.stats.uses)} / ${formatNumber(coupon.usage_limit)}` : formatNumber(coupon.stats.uses)) },
                { label: t('إجمالي الخصم'), className: 'whitespace-nowrap', render: (coupon) => formatMoney(coupon.stats.discount_total) },
                { label: t('المبيعات'), className: 'font-semibold text-ink whitespace-nowrap', render: (coupon) => formatMoney(coupon.stats.sales_total) },
                { label: t('الحالة'), render: (coupon) => <Badge tone={COUPON_STATES[coupon.state]?.tone}>{COUPON_STATES[coupon.state]?.label}</Badge> },
            ]}
        />
    );
}
