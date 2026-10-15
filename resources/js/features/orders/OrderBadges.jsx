import { Badge } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { ORDER_SOURCES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/lib/constants';
import { cn, formatDate } from '@/lib/format';

/** The channel of an order recorded by hand (nothing for storefront orders). */
export function OrderSourceBadge({ source }) {
    if (!source || source === 'store' || !ORDER_SOURCES[source]) {
        return null;
    }

    return (
        <Badge tone="neutral" icon={ORDER_SOURCES[source].icon}>
            {ORDER_SOURCES[source].label}
        </Badge>
    );
}

export function OrderStatusBadge({ status }) {
    const config = ORDER_STATUSES[status];

    return (
        <Badge tone={config.tone} icon={config.icon}>
            {config.label}
        </Badge>
    );
}

/** How the order is paid, plus where an online payment stands. */
export function PaymentBadge({ order }) {
    const status = PAYMENT_STATUSES[order.payment_status];

    if (!status) {
        return <Badge icon={PAYMENT_METHODS[order.payment_method]?.icon ?? 'wallet'}>{PAYMENT_METHODS[order.payment_method]?.short ?? t('عند الاستلام')}</Badge>;
    }

    return (
        <Badge tone={status.tone} icon={status.icon}>
            {`${PAYMENT_METHODS[order.payment_method]?.short ?? ''} · ${status.label}`}
        </Badge>
    );
}

const PROGRESS = ['pending', 'confirmed', 'shipped', 'delivered'];

/**
 * Delivery progress (placed → confirmed → shipped → delivered). Cancelled and returned orders
 * show where they stopped instead.
 */
export function OrderProgress({ order }) {
    const ended = order.status === 'cancelled' || order.status === 'returned';
    const reached = PROGRESS.indexOf(ended ? (order.shipped_at ? 'shipped' : order.confirmed_at ? 'confirmed' : 'pending') : order.status);
    const dates = { pending: order.created_at, confirmed: order.confirmed_at, shipped: order.shipped_at, delivered: order.delivered_at };
    const labels = { pending: t('تم استلام الطلب'), confirmed: t('تم التأكيد'), shipped: t('تم الشحن'), delivered: t('تم التوصيل') };

    return (
        <div className="flex flex-col gap-4">
            <ol className="grid grid-cols-4 gap-2">
                {PROGRESS.map((step, index) => {
                    const done = index <= reached;

                    return (
                        <li key={step} className="flex flex-col items-center gap-2 text-center">
                            <span className="flex w-full items-center">
                                <span className={cn('h-1 flex-1 rounded-full', index === 0 ? 'invisible' : done ? 'bg-primary' : 'bg-line')} />
                                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full border-2', done ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-muted')}>
                                    <Icon name={ORDER_STATUSES[step].icon} className="size-4" />
                                </span>
                                <span className={cn('h-1 flex-1 rounded-full', index === PROGRESS.length - 1 ? 'invisible' : index < reached ? 'bg-primary' : 'bg-line')} />
                            </span>
                            <span className={cn('text-xs font-medium', done ? 'text-ink' : 'text-muted')}>{labels[step]}</span>
                            {done && dates[step] && <span className="text-[11px] text-muted">{formatDate(dates[step])}</span>}
                        </li>
                    );
                })}
            </ol>
            {ended && (
                <p className={cn('rounded-xl px-4 py-3 text-sm', order.status === 'cancelled' ? 'bg-danger-soft text-danger' : 'bg-surface-3 text-ink-2')}>
                    {order.status === 'cancelled' ? t('تم إلغاء الطلب في {date}', { date: formatDate(order.cancelled_at) }) : t('تم تسجيل الطلب كمرتجع في {date}', { date: formatDate(order.returned_at) })}
                    {order.cancel_reason && ` — ${order.cancel_reason}`}
                </p>
            )}
        </div>
    );
}
