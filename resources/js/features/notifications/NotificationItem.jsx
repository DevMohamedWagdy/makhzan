import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatRelative } from '@/lib/format';

const TYPES = {
    payout_requested: { icon: 'send', className: 'bg-warning-soft text-warning' },
    affiliate_registered: { icon: 'user-plus', className: 'bg-primary-soft text-primary' },
    order_placed: { icon: 'shopping-bag', className: 'bg-success-soft text-success' },
};

/** Where clicking a notification takes the vendor: the order, or the affiliate's profile. */
export function notificationTarget(notification) {
    return notification.type === 'order_placed' ? `/dashboard/orders?order=${notification.details.order_id}` : `/dashboard/affiliates?affiliate=${notification.details.affiliate_id}`;
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
