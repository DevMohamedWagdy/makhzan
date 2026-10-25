import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Badge, Card, DetailRow, EmptyState } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { TICKET_STATUSES, TICKET_TYPES } from '@/features/support/support';
import { TicketThread } from '@/features/support/TicketThread';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

/** A merchant's ticket: read the thread, reply, close or reopen it. */
export function AdminTicketPage() {
    const { ticketId } = useParams();
    const { can } = useAdminAuth();
    const toast = useToast();
    const { reloadNotifications } = useOutletContext() ?? {};
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState(null);
    const [closing, setClosing] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        adminApi
            .ticket(ticketId)
            .then(setTicket)
            .catch((loadError) => setError(loadError));
    }, [ticketId]);

    useEffect(load, [load]);

    const loadAttachment = useCallback((attachmentId) => adminApi.ticketAttachment(ticketId, attachmentId), [ticketId]);

    const reply = async (payload) => {
        const message = await adminApi.replyToTicket(ticketId, payload);

        setTicket((current) => ({ ...current, last_reply_by: 'admin', messages: [...current.messages, message] }));
        toast.success(t('تم إرسال الرد'), t('أبلغنا التاجر بردك.'));
    };

    const changeStatus = async (action, message) => {
        setBusy(true);

        try {
            setTicket(await action(ticketId));
            toast.success(message);
            setClosing(false);
            reloadNotifications?.();
        } catch (actionError) {
            toast.error(t('تعذر تنفيذ الإجراء'), Object.values(actionError.errors ?? {})[0] ?? actionError.message);
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return (
            <EmptyState
                icon={error.status === 404 ? 'message-square' : 'alert-triangle'}
                title={error.status === 404 ? t('التذكرة غير موجودة') : t('تعذر تحميل التذكرة')}
                description={error.status === 404 ? undefined : error.message}
                action={<Button to="/admin/support" variant="secondary" icon="arrow-right">{t('كل التذاكر')}</Button>}
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
    const canReply = can('tickets.reply');

    return (
        <>
            <PageHeader
                breadcrumbs={[t('تذاكر الدعم الفني'), `#${ticket.ticket_id}`]}
                title={ticket.subject}
                description={
                    <>
                        {can('stores.view') ? (
                            <Link to={`/admin/stores/${ticket.store.store_id}`} className="font-medium text-primary hover:underline">
                                {ticket.store.name}
                            </Link>
                        ) : (
                            <span className="font-medium text-ink-2">{ticket.store.name}</span>
                        )}
                        {ticket.opened_by && ` · ${ticket.opened_by}`} · {t('فُتحت في {date}', { date: formatDate(ticket.created_at) })}
                    </>
                }
                actions={
                    <Button to="/admin/support" variant="ghost" size="sm" icon="arrow-right">
                        {t('كل التذاكر')}
                    </Button>
                }
            />

            {/* The conversation leads; type, status and the close / reopen action stay in view beside it. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <aside className="lg:sticky lg:top-24 lg:order-last">
                    <Card bodyClassName="flex flex-col gap-4 py-2">
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
                        {canReply &&
                            (ticket.status === 'open' ? (
                                <Button size="sm" variant="secondary" icon="lock" className="mb-3 w-full" onClick={() => setClosing(true)}>
                                    {t('إغلاق التذكرة')}
                                </Button>
                            ) : (
                                <Button size="sm" variant="soft" icon="refresh" className="mb-3 w-full" loading={busy} onClick={() => changeStatus(adminApi.reopenTicket, t('تمت إعادة فتح التذكرة'))}>
                                    {t('إعادة فتح')}
                                </Button>
                            ))}
                    </Card>
                </aside>
                <TicketThread
                    ticket={ticket}
                    viewer="admin"
                    loadAttachment={loadAttachment}
                    onReply={reply}
                    canReply={canReply}
                    closedNotice={
                        <Alert tone="info" icon="lock" title={t('التذكرة مغلقة')}>
                            {canReply ? t('أعد فتحها لتتمكن أنت والتاجر من الرد عليها.') : t('لا يمكن الرد على تذكرة مغلقة.')}
                        </Alert>
                    }
                />
            </div>

            <ConfirmDialog
                open={closing}
                onClose={() => setClosing(false)}
                onConfirm={() => changeStatus(adminApi.closeTicket, t('تم إغلاق التذكرة'))}
                title={t('إغلاق التذكرة؟')}
                description={t('لن يتمكن التاجر من الرد عليها حتى تعيد فتحها، وسنبلغه بإغلاقها.')}
                icon="lock"
                tone="primary"
                confirmLabel={t('إغلاق التذكرة')}
                loading={busy}
            />
        </>
    );
}
