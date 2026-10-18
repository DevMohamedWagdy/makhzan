import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatRelative } from '@/lib/format';

const TYPES = {
    payout_requested: { icon: 'send', className: 'bg-warning-soft text-warning' },
    affiliate_registered: { icon: 'user-plus', className: 'bg-primary-soft text-primary' },
    order_placed: { icon: 'shopping-bag', className: 'bg-success-soft text-success' },
    subscription_activated: { icon: 'zap', className: 'bg-success-soft text-success' },
    subscription_rejected: { icon: 'alert-circle', className: 'bg-danger-soft text-danger' },
    subscription_expiring: { icon: 'clock', className: 'bg-warning-soft text-warning' },
    trial_ending: { icon: 'clock', className: 'bg-warning-soft text-warning' },
    // Admin panel
    store_registered: { icon: 'store', className: 'bg-success-soft text-success' },
    subscription_requested: { icon: 'send', className: 'bg-primary-soft text-primary' },
    trial_ended: { icon: 'clock', className: 'bg-danger-soft text-danger' },
    ticket_opened: { icon: 'message-square', className: 'bg-primary-soft text-primary' },
    ticket_vendor_replied: { icon: 'message-square', className: 'bg-warning-soft text-warning' },
    // Support tickets (dashboard)
    ticket_replied: { icon: 'message-square', className: 'bg-primary-soft text-primary' },
    ticket_closed: { icon: 'lock', className: 'bg-surface-3 text-ink-2' },
    ticket_reopened: { icon: 'refresh', className: 'bg-success-soft text-success' },
    late_payment: { icon: 'credit-card', className: 'bg-warning-soft text-warning' },
    stock_low: { icon: 'warehouse', className: 'bg-warning-soft text-warning' },
    stock_out: { icon: 'box', className: 'bg-danger-soft text-danger' },
    review_submitted: { icon: 'star', className: 'bg-warning-soft text-warning' },
    store_suspended: { icon: 'lock', className: 'bg-danger-soft text-danger' },
    store_reactivated: { icon: 'check-circle', className: 'bg-success-soft text-success' },
    plan_limit_near: { icon: 'alert-triangle', className: 'bg-warning-soft text-warning' },
    plan_limit_reached: { icon: 'alert-circle', className: 'bg-danger-soft text-danger' },
    coupon_used_up: { icon: 'percent', className: 'bg-surface-3 text-ink-2' },
    coupon_expired: { icon: 'clock', className: 'bg-surface-3 text-ink-2' },
    new_sign_in: { icon: 'log-in', className: 'bg-info-soft text-info' },
    password_changed: { icon: 'lock', className: 'bg-warning-soft text-warning' },
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
    coupon_assigned: { icon: 'gift', className: 'bg-primary-soft text-primary' },
};

/** Where clicking a notification takes the vendor: the related page (order, inventory, affiliate, coupons, account…). */
export function notificationTarget(notification) {
    const fixed = {
        store_suspended: '/dashboard/support',
        store_reactivated: '/dashboard',
        plan_limit_near: '/dashboard/subscription',
        plan_limit_reached: '/dashboard/subscription',
        coupon_used_up: '/dashboard/coupons',
        coupon_expired: '/dashboard/coupons',
        new_sign_in: '/dashboard/settings?tab=account',
        password_changed: '/dashboard/settings?tab=account',
    }[notification.type];

    if (fixed) {
        return fixed;
    }

    if (notification.type.startsWith('subscription_') || notification.type === 'trial_ending') {
        return '/dashboard/subscription';
    }

    if (notification.type.startsWith('ticket_')) {
        return `/dashboard/support/${notification.details.ticket_id}`;
    }

    if (notification.type === 'review_submitted') {
        return '/dashboard/reviews';
    }

    if (notification.type === 'stock_low' || notification.type === 'stock_out') {
        return `/dashboard/inventory?level=${notification.type === 'stock_out' ? 'out' : 'low'}&search=${encodeURIComponent(notification.details.product_name)}`;
    }

    return ['order_placed', 'late_payment'].includes(notification.type) ? `/dashboard/orders?order=${notification.details.order_id}` : `/dashboard/affiliates?affiliate=${notification.details.affiliate_id}`;
}

/** Where clicking a notification takes a platform admin. */
export function adminNotificationTarget(notification) {
    if (notification.type.startsWith('ticket_')) {
        return `/admin/support/${notification.details.ticket_id}`;
    }

    return notification.type === 'subscription_requested' ? '/admin/requests' : `/admin/stores/${notification.details.store_id}`;
}

/** Where clicking a notification takes the affiliate: their orders, payouts, account or home. */
export function affiliateNotificationTarget(notification) {
    if (notification.type.startsWith('commission_') && notification.type !== 'commission_changed') {
        return '/affiliate/orders';
    }

    return { coupon_assigned: '/affiliate/links', referral_order_placed: '/affiliate/orders', payout_paid: '/affiliate/payouts', payout_rejected: '/affiliate/payouts', account_frozen: '/affiliate/account' }[notification.type] ?? '/affiliate';
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
