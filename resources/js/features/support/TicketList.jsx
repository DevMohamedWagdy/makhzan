import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { t } from '@/i18n';
import { cn, formatNumber, formatRelative } from '@/lib/format';
import { TICKET_STATUSES, TICKET_TYPES } from './support';

/**
 * Ticket rows for the merchant's list and the admin panel. `viewer` decides whose turn
 * "waiting" describes; admins also see the store's name.
 */
export function TicketList({ tickets, viewer, linkTo }) {
    return (
        <ul className="divide-y divide-line border-t border-line">
            {tickets.map((ticket) => {
                const type = TICKET_TYPES[ticket.type];
                const status = TICKET_STATUSES[ticket.status];
                const waitingOnViewer = ticket.status === 'open' && ticket.last_reply_by && ticket.last_reply_by !== viewer;

                return (
                    <li key={ticket.ticket_id}>
                        <Link to={linkTo(ticket)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 transition hover:bg-surface-2 sm:px-5">
                            <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', type?.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info')}>
                                <Icon name={type?.icon ?? 'message-square'} className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex min-w-0 items-center gap-2">
                                    <span className="truncate font-semibold text-ink">{ticket.subject}</span>
                                    {waitingOnViewer && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t('بانتظار ردك')} />}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                                    <span className="ltr">#{ticket.ticket_id}</span>
                                    {ticket.store && (
                                        <>
                                            <span>·</span>
                                            <span className="font-medium text-ink-2">{ticket.store.name}</span>
                                        </>
                                    )}
                                    {ticket.opened_by && (
                                        <>
                                            <span>·</span>
                                            <span>{ticket.opened_by}</span>
                                        </>
                                    )}
                                    <span>·</span>
                                    <span>{t('{count} رسالة', { count: formatNumber(ticket.messages_count ?? 0) })}</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={type?.tone}>{type?.label}</Badge>
                                <Badge tone={status?.tone} dot>
                                    {status?.label}
                                </Badge>
                                {ticket.status === 'open' && (
                                    <Badge tone={waitingOnViewer ? 'warning' : 'neutral'}>
                                        {viewer === 'admin'
                                            ? waitingOnViewer ? t('بانتظار رد الدعم') : t('بانتظار التاجر')
                                            : waitingOnViewer ? t('بانتظار ردك') : t('بانتظار رد الدعم')}
                                    </Badge>
                                )}
                                <span className="w-24 text-end text-xs text-muted">{formatRelative(ticket.last_activity_at ?? ticket.created_at)}</span>
                            </div>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
