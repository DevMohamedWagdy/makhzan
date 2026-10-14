import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';

/** Read-only star rating (rounded to the nearest whole star). */
export function Stars({ rating, size = 'size-4', className }) {
    const filled = Math.round(rating ?? 0);

    return (
        <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={t('{rating} من ٥', { rating: formatNumber(rating ?? 0) })}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Icon key={star} name="star" className={cn(size, star <= filled ? 'fill-amber-400 text-amber-400' : 'text-line-strong')} />
            ))}
        </span>
    );
}

/** Clickable 1–5 star picker for review forms. */
export function StarInput({ value, onChange, size = 'size-8' }) {
    return (
        <div className="inline-flex gap-1" role="radiogroup" aria-label={t('التقييم')}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={t('{rating} من ٥', { rating: formatNumber(star) })} onClick={() => onChange(star)} className="rounded transition hover:scale-110">
                    <Icon name="star" className={cn(size, star <= value ? 'fill-amber-400 text-amber-400' : 'text-line-strong')} />
                </button>
            ))}
        </div>
    );
}
