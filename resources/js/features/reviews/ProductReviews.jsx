import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCustomerAuth } from '@/features/storefront/CustomerAuthContext';
import { t } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/format';
import { storefrontApi } from '@/services/storefrontApi';
import { StarInput, Stars } from './Stars';

const MAX_IMAGES = 3;

function RatingSummary({ summary }) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
                <span className="text-4xl font-semibold text-ink">{formatNumber(summary.average ?? 0)}</span>
                <div>
                    <Stars rating={summary.average} />
                    <p className="mt-1 text-xs text-muted">{t('{count} تقييم', { count: formatNumber(summary.count) })}</p>
                </div>
            </div>
            <ul className="flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.stars[star] ?? 0;

                    return (
                        <li key={star} className="flex items-center gap-2 text-xs text-muted">
                            <span className="w-3 text-center">{formatNumber(star)}</span>
                            <Icon name="star" className="size-3.5 fill-amber-400 text-amber-400" />
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }} />
                            </span>
                            <span className="w-6 text-end">{formatNumber(count)}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function ReviewItem({ review, storeName }) {
    return (
        <li className="flex flex-col gap-2 py-5 first:pt-0">
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{review.customer_name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                        <Icon name="check-circle" className="size-3.5" />
                        {t('مشتري موثّق')}
                    </span>
                </span>
                <span className="text-xs text-muted">{formatDate(review.created_at)}</span>
            </div>
            <Stars rating={review.rating} size="size-3.5" />
            {review.body && <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{review.body}</p>}
            {review.image_urls.length > 0 && (
                <div className="flex gap-2">
                    {review.image_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="size-20 overflow-hidden rounded-xl border border-line">
                            <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                        </a>
                    ))}
                </div>
            )}
            {review.reply && (
                <div className="mt-1 rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold text-ink">{t('رد {store}', { store: storeName })}</p>
                    <p className="whitespace-pre-line text-ink-2">{review.reply}</p>
                </div>
            )}
        </li>
    );
}

/** The signed-in customer's review form, or why they can't review yet. */
function ReviewForm({ storeSlug, productSlug }) {
    const { isAuthenticated, api } = useCustomerAuth();
    const toast = useToast();
    const [status, setStatus] = useState(null);
    const [rating, setRating] = useState(0);
    const [body, setBody] = useState('');
    const [images, setImages] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            api.reviewStatus(productSlug).then(setStatus).catch(() => setStatus({ can_review: false, review: null }));
        }
    }, [isAuthenticated, api, productSlug]);

    if (!isAuthenticated) {
        return (
            <p className="rounded-2xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">
                {t('اشتريت هذا المنتج؟')}{' '}
                <Link to={`/${storeSlug}/account/login?next=${encodeURIComponent(`p/${productSlug}`)}`} className="font-semibold text-primary hover:underline">
                    {t('سجّل دخولك لتقييمه')}
                </Link>
            </p>
        );
    }

    if (!status) {
        return <Skeleton className="h-16 rounded-2xl" />;
    }

    if (status.review) {
        return (
            <p className="flex items-center gap-2 rounded-2xl bg-success-soft p-4 text-sm text-success">
                <Icon name="check-circle" className="size-4 shrink-0" />
                {status.review.status === 'pending' ? t('شكراً لتقييمك! سيظهر بعد مراجعة المتجر.') : t('شكراً لتقييمك لهذا المنتج.')}
            </p>
        );
    }

    if (!status.can_review) {
        return <p className="rounded-2xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">{t('يمكنك تقييم المنتج بعد استلامه.')}</p>;
    }

    const submit = async (event) => {
        event.preventDefault();

        if (!rating) {
            setErrors({ rating: t('اختر تقييماً من 1 إلى 5 نجوم') });

            return;
        }

        setSubmitting(true);

        try {
            const review = await api.submitReview(productSlug, { rating, body: body || null, images });
            setStatus({ can_review: false, review });
            toast.success(t('تم إرسال تقييمك'), t('سيظهر بعد مراجعة المتجر.'));
        } catch (submitError) {
            setErrors(submitError.errors ?? {});
            toast.error(t('تعذر إرسال التقييم'), submitError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">{t('قيّم المنتج')}</h3>
            <Field label={t('تقييمك')} error={errors.rating} required>
                <StarInput value={rating} onChange={(value) => { setRating(value); setErrors({}); }} />
            </Field>
            <Field label={t('رأيك في المنتج')} error={errors.body} optional>
                <Textarea rows={3} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={t('ما الذي أعجبك؟ كيف كانت الخامة والمقاس؟')} />
            </Field>
            <Field label={t('صور (حتى {max})', { max: formatNumber(MAX_IMAGES) })} error={errors.images ?? errors['images.0']} optional>
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, MAX_IMAGES))}
                    className="text-sm text-ink-2 file:me-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
                />
            </Field>
            <Button type="submit" icon="send" loading={submitting} className="self-start">
                {t('إرسال التقييم')}
            </Button>
        </form>
    );
}

/** Reviews section of the product page: rating summary, approved reviews and the review form. */
export function ProductReviews({ storeSlug, productSlug, storeName }) {
    const [page, setPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(
        async (pageNumber = 1) => {
            const response = await storefrontApi.reviews(storeSlug, productSlug, pageNumber);
            setPage((current) => (pageNumber > 1 && current ? { ...response, data: [...current.data, ...response.data] } : response));
        },
        [storeSlug, productSlug],
    );

    useEffect(() => {
        setPage(null);
        load().catch(() => setPage({ data: [], meta: { current_page: 1, last_page: 1 }, summary: { average: null, count: 0, stars: {} } }));
    }, [load]);

    const loadMore = async () => {
        setLoadingMore(true);

        try {
            await load(page.meta.current_page + 1);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <section id="reviews" className="scroll-mt-36">
            <h2 className="mb-4 text-lg font-semibold text-ink sm:text-xl">{t('تقييمات العملاء')}</h2>
            {!page ? (
                <Skeleton className="h-40 rounded-2xl" />
            ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
                    <div className="flex flex-col gap-4">
                        {page.summary.count > 0 && <RatingSummary summary={page.summary} />}
                        <ReviewForm storeSlug={storeSlug} productSlug={productSlug} />
                    </div>
                    {page.data.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-muted">{t('لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج.')}</p>
                    ) : (
                        <div>
                            <ul className="flex flex-col divide-y divide-line">
                                {page.data.map((review) => (
                                    <ReviewItem key={review.review_id} review={review} storeName={storeName} />
                                ))}
                            </ul>
                            {page.meta.current_page < page.meta.last_page && (
                                <Button variant="secondary" loading={loadingMore} onClick={loadMore} className="mt-2">
                                    {t('عرض المزيد من التقييمات')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
