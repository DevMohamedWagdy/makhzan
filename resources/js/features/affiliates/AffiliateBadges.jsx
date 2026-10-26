import { Badge } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { AFFILIATE_STATUSES, AFFILIATE_TIERS, CURRENCY, PAYOUT_METHODS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

export function TierBadge({ tier }) {
    const config = AFFILIATE_TIERS[tier];

    return (
        <Badge tone={config.tone} icon={tier === 'vip' ? 'sparkles' : undefined}>
            {config.label}
        </Badge>
    );
}

export function StatusBadge({ status }) {
    const config = AFFILIATE_STATUSES[status];

    return (
        <Badge tone={config.tone} dot icon={status === 'frozen' ? 'snowflake' : undefined}>
            {config.label}
        </Badge>
    );
}

const PAYOUT_COLORS = {
    vodafone_cash: 'bg-red-500',
    instapay: 'bg-violet-500',
    bank_account: 'bg-slate-500',
    orange_cash: 'bg-orange-500',
    we_cash: 'bg-purple-700',
    etisalat_cash: 'bg-lime-600',
};

export function PayoutMethodLabel({ type }) {
    return (
        <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-ink-2">
            <span className={`grid size-6 place-items-center rounded-md text-white ${PAYOUT_COLORS[type]}`}>
                <Icon name={type === 'bank_account' ? 'building' : 'wallet'} className="size-3.5" />
            </span>
            {PAYOUT_METHODS[type].label}
        </span>
    );
}

/** Effective commission: custom override wins over the tier default. */
export function getEffectiveCommission(affiliate) {
    const override = affiliate.commission_override;

    if (override) {
        return { ...override, isCustom: true };
    }

    return { type: 'percentage', value: AFFILIATE_TIERS[affiliate.tier].default_commission, note: null, isCustom: false };
}

export function formatCommission({ type, value }) {
    return type === 'percentage' ? `${formatNumber(value)}%` : t('{value} {CURRENCY} / طلب', { value: formatNumber(value), CURRENCY });
}

export function CommissionCell({ affiliate }) {
    const commission = getEffectiveCommission(affiliate);

    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-sm font-semibold text-ink">{formatCommission(commission)}</span>
            {commission.isCustom && (
                <span className="rounded bg-warning-soft px-1.5 py-0.5 text-3xs font-medium text-warning" title={commission.note ?? t('عمولة مخصصة')}>
                    {t('مخصصة')}
                </span>
            )}
        </span>
    );
}
