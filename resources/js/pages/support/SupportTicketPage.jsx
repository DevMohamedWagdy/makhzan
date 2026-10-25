import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Card, DetailRow, EmptyState } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { TICKET_STATUSES, TICKET_TYPES } from '@/features/support/support';
import { TicketThread } from '@/features/support/TicketThread';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { supportApi } from '@/services/supportApi';

/** One support ticket as a conversation with the platform team. */
export function SupportTicketPage() {
    const { ticketId } = useParams();
    const { can } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setError(null);
        supportApi
            .show(ticketId)
            .then(setTicket)
            .catch((loadError) => setError(loadError));
    }, [ticketId]);

    useEffect(load, [load]);

    const loadAttachment = useCallback((attachmentId) => supportApi.attachment(ticketId, attachmentId), [ticketId]);

    const reply = async (payload) => {
        const message = await supportApi.reply(ticketId, payload);

        setTicket((current) => ({ ...current, last_reply_by: 'vendor', messages: [...current.messages, message] }));
    };

    if (error) {
        return (
            <EmptyState
                icon={error.status === 404 ? 'message-square' : 'alert-triangle'}
                title={error.status === 404 ? t('التذكرة غير موجودة') : t('تعذر تحميل التذكرة')}
                description={error.status === 404 ? undefined : error.message}
                action={<Button to="/dashboard/support" variant="secondary" icon="arrow-right">{t('كل التذاكر')}</Button>}
            />
        );
    }

    if (!ticket) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    const type = TICKET_TYPES[ticket.type];
    const status = TICKET_STATUSES[ticket.status];

    return (
        <>
            <PageHeader
                breadcrumbs={[t('الدعم الفني'), `#${ticket.ticket_id}`]}
                title={ticket.subject}
                description={t('فُتحت في {date}', { date: formatDate(ticket.created_at) })}
                actions={
                    <Button to="/dashboard/support" variant="secondary" size="sm" icon="arrow-right">
                        {t('كل التذاكر')}
                    </Button>
                }
            />

            {/* The conversation leads; the ticket's type and status stay in view beside it. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <aside className="lg:sticky lg:top-24 lg:order-last">
                    <Card bodyClassName="py-2">
                        <dl className="divide-y divide-line">
                            <DetailRow label={t('نوع التذكرة')}>
                                <Badge tone={type?.tone} icon={type?.icon}>
                                    {type?.label}
                                </Badge>
                            </DetailRow>
                            <DetailRow label={t('الحالة')}>
                                <Badge tone={status?.tone} dot>
                                    {status?.label}
                                </Badge>
                            </DetailRow>
                        </dl>
                    </Card>
                </aside>
                <TicketThread
                    ticket={ticket}
                    viewer="vendor"
                    loadAttachment={loadAttachment}
                    onReply={reply}
                    canReply={can('support.create')}
                    closedNotice={
                        <Alert tone="info" icon="lock" title={t('أُغلقت هذه التذكرة')}>
                            {t('لا يمكن الرد عليها إلا إذا أعاد فريق الدعم فتحها. إن احتجت مساعدة أخرى افتح تذكرة جديدة.')}
                        </Alert>
                    }
                />
            </div>
        </>
    );
}
