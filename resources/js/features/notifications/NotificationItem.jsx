import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatRelative } from '@/lib/format';

const TYPES = {
    payout_requested: { icon: 'send', className: 'bg-warning-soft text-warning' },
    affiliate_registered: { icon: 'user-plus', className: 'bg-primary-soft text-primary' },
    order_placed: { icon: 'shopping-bag', className: 'bg-success-soft text-success' },
    // Affiliate portal
    account_approved: { icon: 'check-circle', className: 'bg-success-soft text-success' },
    account_reactivated: { icon: 'check-circle', className: 'bg-success-soft text-success' },
    account_frozen: { icon: 'snowflake', className: 'bg-danger-soft text-danger' },
    payout_paid: { icon: 'wallet', className: 'bg-success-soft text-success' },
    payout_rejected: { icon: 'x', className: 'bg-danger-soft text-danger' },
    referral_order_placed: { icon: 'shopping-bag', className: 'bg-primary-soft text-primary' },
    commission_earned: { icon: 'wallet', className: 'bg-success-soft text-success' },
    commission_cancelled: { icon: 'x', className: 'bg-surface-3 text-ink-2' },
    commission_reversed: { icon: 'refresh', className: 'bg-warning-soft text-warning' },
    commission_changed: { icon: 'percent', className: 'bg-info-soft text-info' },
};

/** Where clicking a notification takes the vendor: the order, or the affiliate's profile. */
export function notificationTarget(notification) {
    return notification.type === 'order_placed' ? `/dashboard/orders?order=${notification.details.order_id}` : `/dashboard/affiliates?affiliate=${notification.details.affiliate_id}`;
}

/** Where clicking a notification takes the affiliate: their orders, payouts, account or home. */
export function affiliateNotificationTarget(notification) {
    if (notification.type.startsWith('commission_') && notification.type !== 'commission_changed') {
        return '/affiliate/orders';
    }

    return { referral_order_placed: '/affiliate/orders', payout_paid: '/affiliate/payouts', payout_rejected: '/affiliate/payouts', account_frozen: '/affiliate/account' }[notification.type] ?? '/affiliate';
}

export function NotificationItem({ notification, onOpen, compact = false }) {
    const config = TYPES[notification.type] ?? { icon: 'bell', className: 'bg-surface-3 text-ink-2' };
    const unread = !notification.read_at;

    return (
        <button
            type="button"
            onClick={() => onOpen(notification)}
            className={cn('flex w-full items-start gap-3 rounded-xl text-start transition hover:bg-surface-3', compact ? 'p-2.5' : 'p-4', unread && 'bg-primary-soft/40')}
        >
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', config.className)}>
                <Icon name={config.icon} className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
                <span className={cn('block text-sm leading-relaxed', unread ? 'font-semibold text-ink' : 'text-ink-2')}>{notification.message}</span>
                <span className="mt-0.5 block text-xs text-muted">{formatRelative(notification.created_at)}</span>
            </span>
            {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label={t('غير مقروء')} />}
        </button>
    );
}
