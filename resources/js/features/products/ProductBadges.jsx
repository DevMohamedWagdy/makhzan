import { Badge } from '@/components/ui/Display';
import { t } from '@/i18n';
import { PRODUCT_STATUSES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

export const LOW_STOCK_THRESHOLD = 5;

export function ProductStatusBadge({ status }) {
    const config = PRODUCT_STATUSES[status];

    return (
        <Badge tone={config.tone} dot>
            {config.label}
        </Badge>
    );
}

export function StockBadge({ stock }) {
    if (stock === 0) {
        return <Badge tone="danger">{t('نفد المخزون')}</Badge>;
    }

    return <Badge tone={stock <= LOW_STOCK_THRESHOLD ? 'warning' : 'success'}>{t('{stock} قطعة', { stock })}</Badge>;
}

/** "450 ج.م" or "450 – 520 ج.م" across variants, with the pre-discount price struck through. */
export function PriceCell({ product }) {
    const isRange = product.price_max !== null && product.price_max !== product.price;

    return (
        <span className="flex flex-col whitespace-nowrap">
            <span className="font-semibold text-ink">{isRange ? `${formatMoney(product.price)} – ${formatMoney(product.price_max)}` : formatMoney(product.price)}</span>
            {product.compare_at_price && <span className="text-xs text-muted line-through">{formatMoney(product.compare_at_price)}</span>}
        </span>
    );
}

export function ProductThumb({ src, name, className = 'size-12' }) {
    return src ? (
        <img src={src} alt={name} className={`${className} shrink-0 rounded-xl border border-line object-cover`} />
    ) : (
        <span className={`${className} grid shrink-0 place-items-center rounded-xl border border-dashed border-line-strong bg-surface-2 text-muted`}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="m21 16-5-5-9 9" />
            </svg>
        </span>
    );
}
