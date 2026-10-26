import { useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, DetailRow } from '@/components/ui/Display';
import { Drawer } from '@/components/ui/Overlay';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { AdminDataTable } from '@/features/admin/AdminDataTable';
import { t } from '@/i18n';
import { formatDate, formatNumber, formatRelative, formatTime } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

/** Messages visitors sent from the landing page's contact form. Opening one marks it read. */
export function AdminContactMessagesPage() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const [reloadKey, setReloadKey] = useState(0);
    const [selected, setSelected] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const reload = () => setReloadKey((key) => key + 1);

    const open = async (message) => {
        setSelected(message);

        if (!message.is_read) {
            try {
                setSelected(await adminApi.updateContactMessage(message.contact_message_id, true));
                reload();
            } catch {
                // Still readable; it just stays unread.
            }
        }
    };

    const toggleRead = async (message) => {
        setBusy(true);

        try {
            const updated = await adminApi.updateContactMessage(message.contact_message_id, !message.is_read);

            setSelected((current) => (current?.contact_message_id === updated.contact_message_id ? updated : current));
            toast.success(updated.is_read ? t('تم تعليم الرسالة كمقروءة') : t('تم تعليم الرسالة كغير مقروءة'));
            reload();
        } catch (error) {
            toast.error(t('تعذر تنفيذ الإجراء'), error.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);

        try {
            await adminApi.deleteContactMessage(deleting.contact_message_id);
            toast.success(t('تم حذف الرسالة'));
            setSelected(null);
            reload();
        } catch (error) {
            toast.error(t('تعذر تنفيذ الإجراء'), error.message);
        } finally {
            setBusy(false);
            setDeleting(null);
        }
    };

    return (
        <>
            <PageHeader title={t('رسائل التواصل')} description={t('الرسائل التي يرسلها الزوار من نموذج "تواصل معنا" في الصفحة الرئيسية')} />
            <section className="mk-card overflow-hidden">
                <AdminDataTable
                    load={adminApi.contactMessages}
                    withStoreFilter={false}
                    reloadKey={reloadKey}
                    rowKey={(message) => message.contact_message_id}
                    onRowClick={open}
                    searchPlaceholder={t('الاسم أو الهاتف أو البريد أو نص الرسالة...')}
                    filters={[
                        {
                            key: 'status',
                            label: t('الحالة'),
                            options: [
                                { value: '', label: t('كل الرسائل') },
                                { value: 'unread', label: t('غير مقروءة') },
                                { value: 'read', label: t('مقروءة') },
                            ],
                        },
                    ]}
                    renderSummary={(result) => (
                        <p className="border-b border-line px-4 py-3 text-sm text-muted">
                            {t('{unread} غير مقروءة من {total} رسالة', { unread: formatNumber(result.summary.unread), total: formatNumber(result.summary.total) })}
                        </p>
                    )}
                    emptyIcon="mail"
                    emptyTitle={t('لا توجد رسائل')}
                    minWidth="860px"
                    columns={[
                        {
                            label: t('المرسل'),
                            render: (message) => (
                                <span className="flex items-center gap-2.5">
                                    <span className={message.is_read ? 'size-2 shrink-0' : 'size-2 shrink-0 rounded-full bg-brand-accent'} aria-hidden="true" />
                                    <span>
                                        <span className={message.is_read ? 'block text-ink-2' : 'block font-semibold text-ink'}>{message.full_name}</span>
                                        <span className="ltr mk-num block text-xs text-muted">{message.phone}</span>
                                    </span>
                                </span>
                            ),
                        },
                        { label: t('الرسالة'), render: (message) => <span className="line-clamp-2 max-w-md text-ink-2">{message.message}</span> },
                        { label: t('التاريخ'), className: 'whitespace-nowrap text-muted', render: (message) => formatRelative(message.created_at) },
                        { label: t('الحالة'), render: (message) => <Badge tone={message.is_read ? 'neutral' : 'info'}>{message.is_read ? t('مقروءة') : t('جديدة')}</Badge> },
                    ]}
                />
            </section>

            <Drawer
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                icon="mail"
                title={selected?.full_name}
                description={selected ? `${formatDate(selected.created_at)} ${formatTime(selected.created_at)}` : undefined}
                footer={
                    selected && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="secondary" icon={selected.is_read ? 'eye-off' : 'eye'} disabled={busy} onClick={() => toggleRead(selected)}>
                                {selected.is_read ? t('تعليم كغير مقروءة') : t('تعليم كمقروءة')}
                            </Button>
                            {can('messages.delete') && (
                                <Button variant="danger-soft" icon="trash" disabled={busy} onClick={() => setDeleting(selected)} className="ms-auto">
                                    {t('حذف')}
                                </Button>
                            )}
                        </div>
                    )
                }
            >
                {selected && (
                    <div className="flex flex-col gap-6 p-6">
                        <dl className="divide-y divide-line">
                            <DetailRow label={t('رقم الهاتف')} ltr>
                                <a href={`tel:${selected.phone}`} className="text-primary hover:underline">
                                    {selected.phone}
                                </a>
                            </DetailRow>
                            <DetailRow label={t('البريد الإلكتروني')} ltr>
                                <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                                    {selected.email}
                                </a>
                            </DetailRow>
                        </dl>
                        <div>
                            <h3 className="text-sm font-medium text-muted">{t('الرسالة')}</h3>
                            <p className="mt-2 rounded-xl border border-line bg-surface-2 p-4 leading-relaxed whitespace-pre-line text-ink">{selected.message}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button to={`https://wa.me/${selected.phone.replace(/\D/g, '').replace(/^0/, '20')}`} target="_blank" rel="noopener noreferrer" variant="soft" icon="message-square">
                                {t('رد عبر واتساب')}
                            </Button>
                            <Button to={`mailto:${selected.email}`} variant="secondary" icon="mail">
                                {t('رد بالبريد')}
                            </Button>
                        </div>
                    </div>
                )}
            </Drawer>

            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                tone="danger"
                icon="trash"
                title={t('حذف الرسالة نهائياً؟')}
                description={t('لا يمكن استرجاع الرسالة بعد حذفها.')}
                confirmLabel={t('حذف')}
            />
        </>
    );
}
