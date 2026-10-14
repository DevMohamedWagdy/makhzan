import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatMoney, formatNumber } from '@/lib/format';

/** "×1.5", isolated left-to-right so it doesn't flip to "1.5×" inside Arabic text. */
export function formatMultiplier(multiplier) {
    return `\u2066×${formatNumber(multiplier)}\u2069`;
}

/**
 * A customer's loyalty tier and how far they are from the next one, from the API's
 * `tier: { spent, current, next, remaining, progress }`. `inverted` is for a coloured background.
 */
export function TierProgress({ tier, inverted = false, className }) {
    if (!tier) {
        return null;
    }

    const { current, next } = tier;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Icon name="award" className="size-4" />
                    {current ? current.name : t('بدون مستوى بعد')}
                    {current && current.multiplier > 1 && <span className={cn('rounded-md px-1.5 py-0.5 text-xs', inverted ? 'bg-white/20' : 'bg-warning-soft text-warning')}>{t('نقاط {multiplier}', { multiplier: formatMultiplier(current.multiplier) })}</span>}
                </span>
                <span className={cn('text-xs', inverted ? 'opacity-80' : 'text-muted')}>{t('مشتريات مسلّمة {amount}', { amount: formatMoney(tier.spent) })}</span>
            </div>
            <div className={cn('h-2 overflow-hidden rounded-full', inverted ? 'bg-white/25' : 'bg-surface-3')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tier.progress}>
                <div className={cn('h-full rounded-full', inverted ? 'bg-white' : 'bg-warning')} style={{ width: `${tier.progress}%` }} />
            </div>
            <p className={cn('text-xs', inverted ? 'opacity-90' : 'text-ink-2')}>
                {next
                    ? t('باقي {amount} للوصول إلى {name} (نقاط {multiplier})', { amount: formatMoney(tier.remaining), name: next.name, multiplier: formatMultiplier(next.multiplier) })
                    : t('تم الوصول لأعلى مستوى')}
            </p>
        </div>
    );
}
