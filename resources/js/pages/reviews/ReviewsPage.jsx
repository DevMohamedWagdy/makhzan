import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, StatCard } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Stars } from '@/features/reviews/Stars';
import { useDebouncedValue } from '@/hooks/common';
import { localized, t } from '@/i18n';
import { REVIEW_STATUSES } from '@/lib/constants';
import { cn, formatDate, formatNumber } from '@/lib/format';
import { reviewsApi } from '@/services/reviewsApi';

const RATING_OPTIONS = [{ value: '', label: t('كل التقييمات') }, ...[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: t('{count} نجوم', { count: formatNumber(rating) }) }))];

function ReplyModal({ review, onClose, onSaved }) {
    const toast = useToast();
    const [reply, setReply] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => setReply(review?.reply ?? ''), [review]);

    const save = async () => {
        setSaving(true);

        try {
            onSaved(await reviewsApi.update(review.review_id, { reply }));
            toast.success(reply.trim() ? t('تم حفظ الرد') : t('تم حذف الرد'));
        } catch (saveError) {
            toast.error(t('تعذر حفظ الرد'), saveError.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(review)}
            onClose={onClose}
            title={t('الرد على التقييم')}
            description={t('يظهر ردك للعملاء أسفل التقييم في صفحة المنتج')}
            icon="message-square"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('إلغاء')}
                    </Button>
                    <Button loading={saving} onClick={save}>
                        {t('حفظ الرد')}
                    </Button>
                </>
            }
        >
            {review?.body && <p className="mb-4 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">{review.body}</p>}
            <Field label={t('ردك')}>
                <Textarea rows={4} maxLength={1000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t('شكراً لتقييمك...')} />
            </Field>
        </Modal>
    );
}

function ReviewCard({ review, canUpdate, canDelete, busy, onStatus, onReply, onDelete }) {
    const status = REVIEW_STATUSES[review.status];

    return (
        <li className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {review.product?.image_url ? <img src={review.product.image_url} alt="" className="size-12 shrink-0 rounded-lg object-cover" /> : <span className="size-12 shrink-0 rounded-lg bg-surface-3" />}
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{localized(review.product)}</p>
                        <p className="text-xs text-muted">
                            {review.customer_name}
                            {review.order_number && (
                                <>
                                    {' · '}
                                    <Link to={`/dashboard/orders?search=${review.order_number}`} className="hover:text-primary hover:underline">
                                        {t('طلب #{number}', { number: review.order_number })}
                                    </Link>
                                </>
                            )}
                            {' · '}
                            {formatDate(review.created_at)}
                        </p>
                    </div>
                </div>
                <Badge tone={status.tone} dot>
                    {status.label}
                </Badge>
            </div>

            <Stars rating={review.rating} />
            {review.body ? <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{review.body}</p> : <p className="text-sm text-muted">{t('تقييم بدون تعليق')}</p>}
            {review.image_urls.length > 0 && (
                <div className="flex gap-2">
                    {review.image_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="size-16 overflow-hidden rounded-lg border border-line">
                            <img src={url} alt="" className="size-full object-cover" />
                        </a>
                    ))}
                </div>
            )}
            {review.reply && (
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold text-ink">{t('ردك')}</p>
                    <p className="whitespace-pre-line text-ink-2">{review.reply}</p>
                </div>
            )}

            {(canUpdate || canDelete) && (
                <div className="flex flex-wrap gap-2">
                    {canUpdate && review.status !== 'approved' && (
                        <Button size="sm" icon="check-circle" disabled={busy} onClick={() => onStatus(review, 'approved')}>
                            {t('نشر')}
                        </Button>
                    )}
                    {canUpdate && review.status !== 'rejected' && (
                        <Button size="sm" variant="secondary" icon="eye-off" disabled={busy} onClick={() => onStatus(review, 'rejected')}>
                            {review.status === 'approved' ? t('إخفاء') : t('رفض')}
                        </Button>
                    )}
                    {canUpdate && (
                        <Button size="sm" variant="secondary" icon="message-square" disabled={busy} onClick={() => onReply(review)}>
                            {review.reply ? t('تعديل الرد') : t('رد')}
                        </Button>
                    )}
                    {canDelete && (
                        <Button size="sm" variant="ghost" icon="trash" disabled={busy} onClick={() => onDelete(review)} className="text-danger">
                            {t('حذف')}
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}

/** Customer reviews of the store's products: approve before they show, hide, reply or delete. */
export function ReviewsPage() {
    const { can } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? 'pending';
    const rating = searchParams.get('rating') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const searchQuery = searchParams.get('search') ?? '';
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const search = useDebouncedValue(searchTerm, 300);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [replying, setReplying] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const setQuery = useCallback(
        (patch) =>
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);

                    Object.entries({ ...patch, ...(!('page' in patch) && { page: 1 }) }).forEach(([key, value]) => (value == null || (value === '' && key !== 'status') || (key === 'page' && value === 1) ? next.delete(key) : next.set(key, value)));

                    return next;
                },
                { replace: true },
            ),
        [setSearchParams],
    );

    useEffect(() => {
        if (search !== searchQuery) {
            setQuery({ search });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setResult(await reviewsApi.list({ status, rating, search: searchQuery, page }));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [status, rating, searchQuery, page]);

    useEffect(() => {
        load();
    }, [load]);

    const changeStatus = async (review, nextStatus) => {
        setBusyId(review.review_id);

        try {
            await reviewsApi.update(review.review_id, { status: nextStatus });
            toast.success(nextStatus === 'approved' ? t('تم نشر التقييم') : t('تم إخفاء التقييم'));
            load();
        } catch (updateError) {
            toast.error(t('تعذر تحديث التقييم'), updateError.message);
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        setBusyId(deleting.review_id);

        try {
            await reviewsApi.remove(deleting.review_id);
            toast.success(t('تم حذف التقييم'));
            setDeleting(null);
            load();
        } catch (removeError) {
            toast.error(t('تعذر حذف التقييم'), removeError.message);
        } finally {
            setBusyId(null);
        }
    };

    const summary = result?.summary;
    const tabs = useMemo(() => [...Object.entries(REVIEW_STATUSES).map(([value, config]) => ({ value, label: config.label, count: summary?.[value] })), { value: '', label: t('الكل'), count: summary?.total }], [summary]);
    const reviews = result?.data ?? [];

    return (
        <>
            <PageHeader title={t('التقييمات')} description={t('تقييمات العملاء الذين استلموا منتجاتك، لا يظهر أي تقييم قبل موافقتك')} breadcrumbs={[t('لوحة التحكم'), t('المبيعات'), t('التقييمات')]} />

            <div className="mb-6 mk-stat-group sm:grid-cols-3">
                <StatCard label={t('متوسط تقييم المتجر')} value={summary?.average != null ? t('{rating} من ٥', { rating: formatNumber(summary.average) }) : '—'} icon="star" tone="warning" />
                <StatCard label={t('تقييمات منشورة')} value={summary ? formatNumber(summary.approved) : '—'} icon="check-circle" tone="success" />
                <StatCard label={t('بانتظار مراجعتك')} value={summary ? formatNumber(summary.pending) : '—'} icon="clock" tone="info" />
            </div>

            <section className="mk-card overflow-hidden">
                <Tabs tabs={tabs} value={status} onChange={(value) => setQuery({ status: value })} className="px-3" />
                <div className="flex flex-col gap-3 p-4 sm:flex-row">
                    <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث باسم المنتج أو العميل...')} aria-label={t('بحث في التقييمات')} className="sm:w-72" />
                    <Select value={rating} onChange={(event) => setQuery({ rating: event.target.value })} options={RATING_OPTIONS} aria-label={t('التقييم')} className="sm:w-44" />
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل التقييمات')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : loading && reviews.length === 0 ? (
                    <div className="flex flex-col gap-3 p-4">
                        {Array.from({ length: 3 }, (_, index) => (
                            <Skeleton key={index} className="h-32 rounded-xl" />
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="star"
                            title={status === 'pending' && !rating && !searchQuery ? t('لا توجد تقييمات بانتظار المراجعة') : t('لا توجد تقييمات مطابقة')}
                            description={t('يستطيع العملاء تقييم المنتجات بعد استلام طلباتهم.')}
                        />
                    </div>
                ) : (
                    <ul className={cn('divide-y divide-line border-t border-line transition-opacity', loading && 'opacity-60')}>
                        {reviews.map((review) => (
                            <ReviewCard
                                key={review.review_id}
                                review={review}
                                canUpdate={can('reviews.update')}
                                canDelete={can('reviews.delete')}
                                busy={busyId === review.review_id}
                                onStatus={changeStatus}
                                onReply={setReplying}
                                onDelete={setDeleting}
                            />
                        ))}
                    </ul>
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={(nextPage) => setQuery({ page: nextPage })} />
                    </div>
                )}
            </section>

            <ReplyModal
                review={replying}
                onClose={() => setReplying(null)}
                onSaved={() => {
                    setReplying(null);
                    load();
                }}
            />
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={Boolean(deleting) && busyId === deleting?.review_id}
                icon="trash"
                title={t('حذف التقييم؟')}
                description={t('سيتم حذف التقييم وصوره نهائياً. لإخفائه فقط استخدم "إخفاء".')}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
