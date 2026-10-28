import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, StatCard, StatStrip } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatDate, formatNumber, formatRelative, formatTime } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const BODY_LIMIT = 5000;
const EMPTY_FORM = { subject: '', body: '' };
const COLUMNS = [t('الرسالة'), t('المستلمون'), t('الوصول'), t('أرسلها'), t('التاريخ'), t('الحالة')];

const STATUSES = {
    sending: { label: t('جارٍ الإرسال'), tone: 'info' },
    sent: { label: t('تم الإرسال'), tone: 'success' },
    partial: { label: t('أُرسل جزئياً'), tone: 'warning' },
    failed: { label: t('فشل الإرسال'), tone: 'danger' },
};

/**
 * Emails from the platform team to merchants: the totals on top, the sending history as the page, and a
 * "new message" window to write one for every active store owner or the ones picked.
 */
export function AdminEmailsPage() {
    const { can } = useAdminAuth();
    const canSend = can('emails.send');
    const [history, setHistory] = useState(null);
    const [historyError, setHistoryError] = useState(null);
    const [page, setPage] = useState(1);
    const [composing, setComposing] = useState(false);
    const [viewing, setViewing] = useState(null);

    const loadHistory = useCallback(() => {
        setHistoryError(null);

        return adminApi
            .vendorEmails({ page })
            .then(setHistory)
            .catch((error) => setHistoryError(error.message));
    }, [page]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // While an email is still going out, refresh its counts every few seconds.
    const isSending = history?.data.some((campaign) => campaign.status === 'sending');

    useEffect(() => {
        if (!isSending) {
            return undefined;
        }

        const timer = setInterval(loadHistory, 3000);

        return () => clearInterval(timer);
    }, [isSending, loadHistory]);

    const summary = history?.summary;

    return (
        <>
            <PageHeader
                title={t('البريد للتجار')}
                icon="send"
                description={t('اكتب رسالة وأرسلها لكل التجار أو لتجار تختارهم، بتصميم بريد المنصة.')}
                breadcrumbs={[t('الدعم والتواصل'), t('البريد للتجار')]}
                actions={
                    canSend && (
                        <Button icon="plus" onClick={() => setComposing(true)}>
                            {t('رسالة جديدة')}
                        </Button>
                    )
                }
            />

            <StatStrip>
                <StatCard label={t('رسائل مرسلة')} value={summary ? formatNumber(summary.campaigns) : '—'} icon="send" />
                <StatCard label={t('بريد وصل للتجار')} value={summary ? formatNumber(summary.sent) : '—'} icon="check-circle" tone="success" />
                <StatCard label={t('بريد لم يصل')} value={summary ? formatNumber(summary.failed) : '—'} icon="alert-triangle" tone={summary?.failed ? 'danger' : 'neutral'} />
                <StatCard label={t('تجار يمكن مراسلتهم')} value={history ? formatNumber(history.eligible_count) : '—'} icon="users" tone="info" hint={t('أصحاب متاجر نشطون لديهم بريد')} />
            </StatStrip>

            <section className="mk-card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-ink">{t('سجل الإرسال')}</h2>
                        <p className="text-xs text-muted">{t('اضغط على أي رسالة لعرض نصها كاملاً')}</p>
                    </div>
                </header>

                {historyError ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل السجل')} description={historyError} action={<Button variant="secondary" icon="refresh" onClick={loadHistory}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !history ? (
                    <div className="flex flex-col gap-3 p-5">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-14 rounded-xl" />
                        ))}
                    </div>
                ) : history.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon="send"
                            title={t('لم تُرسل أي رسالة بعد')}
                            description={t('ستظهر هنا الرسائل التي ترسلها ونتيجة إرسال كل منها.')}
                            action={
                                canSend && (
                                    <Button icon="plus" onClick={() => setComposing(true)}>
                                        {t('رسالة جديدة')}
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : (
                    <div className="mk-scroll overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className="mk-thead">
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column} scope="col" className="px-4 py-3 text-start font-medium whitespace-nowrap">
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {history.data.map((campaign) => (
                                    <CampaignRow key={campaign.id} campaign={campaign} onOpen={() => setViewing(campaign)} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {history && history.meta.total > history.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={history.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>

            <ComposeModal
                open={composing}
                eligibleCount={history?.eligible_count ?? 0}
                onClose={() => setComposing(false)}
                onSent={() => {
                    setComposing(false);
                    setPage(1);
                    loadHistory();
                }}
            />

            <CampaignDrawer campaign={viewing ? (history?.data.find((campaign) => campaign.id === viewing.id) ?? viewing) : null} onClose={() => setViewing(null)} />
        </>
    );
}

/** How many of the recipients the email reached, as a bar with the counts. */
function DeliveryBar({ campaign }) {
    const total = Math.max(campaign.recipients_count, 1);
    const sentShare = (campaign.sent_count / total) * 100;
    const failedShare = (campaign.failed_count / total) * 100;

    return (
        <div className="min-w-36">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <span className="bg-success transition-[width] duration-500" style={{ width: `${sentShare}%` }} />
                <span className="bg-danger transition-[width] duration-500" style={{ width: `${failedShare}%` }} />
            </div>
            <p className="mk-num mt-1.5 text-xs text-muted">
                {t('{sent} من {total}', { sent: formatNumber(campaign.sent_count), total: formatNumber(campaign.recipients_count) })}
                {campaign.failed_count > 0 && <span className="text-danger"> · {t('فشل {count}', { count: formatNumber(campaign.failed_count) })}</span>}
            </p>
        </div>
    );
}

function StatusBadge({ status }) {
    const config = STATUSES[status] ?? STATUSES.sending;

    return (
        <Badge tone={config.tone} dot={status !== 'sending'}>
            {status === 'sending' && <Spinner className="size-3" />}
            {config.label}
        </Badge>
    );
}

function CampaignRow({ campaign, onOpen }) {
    return (
        <tr className="cursor-pointer transition hover:bg-surface-2" onClick={onOpen}>
            <td className="max-w-md px-4 py-3.5">
                <span className="block truncate font-semibold text-ink">{campaign.subject}</span>
                <span className="block truncate text-xs text-muted">{campaign.body}</span>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-ink-2">
                    <Icon name={campaign.audience === 'all' ? 'users' : 'user-plus'} className="size-4 text-muted" />
                    {campaign.audience === 'all' ? t('كل التجار') : t('{count} تاجر محدد', { count: formatNumber(campaign.recipients_count) })}
                </span>
            </td>
            <td className="px-4 py-3.5">
                <DeliveryBar campaign={campaign} />
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">{campaign.sent_by ?? '—'}</td>
            <td className="px-4 py-3.5 whitespace-nowrap">
                <span className="block text-ink-2">{formatDate(campaign.created_at)}</span>
                <span className="text-xs text-muted">{formatTime(campaign.created_at)}</span>
            </td>
            <td className="px-4 py-3.5">
                <StatusBadge status={campaign.status} />
            </td>
        </tr>
    );
}

/** One sent email in full: its text as the merchant reads it, and how the sending went. */
function CampaignDrawer({ campaign, onClose }) {
    return (
        <Drawer open={Boolean(campaign)} onClose={onClose} icon="mail" title={campaign?.subject ?? ''} description={campaign ? t('أُرسلت {time}', { time: formatRelative(campaign.created_at) }) : undefined}>
            {campaign && (
                <div className="flex flex-col gap-5 p-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-line p-3">
                            <p className="text-xs text-muted">{t('المستلمون')}</p>
                            <p className="mt-1 text-sm font-semibold text-ink">{campaign.audience === 'all' ? t('كل التجار') : t('{count} تاجر محدد', { count: formatNumber(campaign.recipients_count) })}</p>
                        </div>
                        <div className="rounded-xl border border-line p-3">
                            <p className="text-xs text-muted">{t('الحالة')}</p>
                            <div className="mt-1">
                                <StatusBadge status={campaign.status} />
                            </div>
                        </div>
                        <div className="col-span-2 rounded-xl border border-line p-3">
                            <p className="mb-2 text-xs text-muted">{t('الوصول')}</p>
                            <DeliveryBar campaign={campaign} />
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-medium text-muted">{t('نص الرسالة')}</p>
                        <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed whitespace-pre-wrap text-ink">{campaign.body}</div>
                    </div>
                    <p className="text-xs text-muted">
                        {campaign.sent_by && t('أرسلها {name}', { name: campaign.sent_by })} · {formatDate(campaign.created_at)} {formatTime(campaign.created_at)}
                    </p>
                </div>
            )}
        </Drawer>
    );
}

/** Write an email to every active store owner or to the ones picked, confirmed before it goes out. */
function ComposeModal({ open, eligibleCount, onClose, onSent }) {
    const toast = useToast();
    const [audience, setAudience] = useState('all');
    const [selected, setSelected] = useState([]);
    const [values, setValues] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (open) {
            setAudience('all');
            setSelected([]);
            setValues(EMPTY_FORM);
            setErrors({});
        }
    }, [open]);

    const recipientsCount = audience === 'all' ? eligibleCount : selected.length;
    const canSubmit = values.subject.trim() && values.body.trim() && recipientsCount > 0;

    const set = (key) => (event) => {
        setValues((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const send = async () => {
        setSending(true);

        try {
            const result = await adminApi.sendVendorEmail({ audience, vendor_ids: audience === 'selected' ? selected.map((vendor) => vendor.vendor_id) : undefined, ...values });

            toast.success(t('بدأ الإرسال'), result.message);
            setConfirming(false);
            onSent();
        } catch (error) {
            setConfirming(false);
            setErrors(error.errors ?? {});
            toast.error(t('تعذر إرسال البريد'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                dismissible={!sending}
                size="lg"
                icon="send"
                title={t('رسالة جديدة')}
                description={t('تبدأ بتحية التاجر باسمه وتنتهي بتوقيع فريق المنصة.')}
                footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-muted">{recipientsCount > 0 ? t('ستصل إلى {count} تاجر', { count: formatNumber(recipientsCount) }) : t('اختر تاجراً واحداً على الأقل')}</span>
                        <span className="flex gap-2">
                            <Button variant="secondary" onClick={onClose}>
                                {t('إلغاء')}
                            </Button>
                            <Button icon="send" disabled={!canSubmit} onClick={() => setConfirming(true)}>
                                {t('إرسال الرسالة')}
                            </Button>
                        </span>
                    </div>
                }
            >
                <div className="flex flex-col gap-5">
                    <div>
                        <p className="mb-2 text-sm font-medium text-ink">{t('المستلمون')}</p>
                        <Tabs
                            variant="segmented"
                            value={audience}
                            onChange={setAudience}
                            tabs={[
                                { value: 'all', label: t('كل التجار ({count})', { count: formatNumber(eligibleCount) }), icon: 'users' },
                                { value: 'selected', label: t('تجار محددين'), icon: 'user-plus' },
                            ]}
                        />
                        {audience === 'all' ? <p className="mt-2 text-xs text-muted">{t('كل أصحاب المتاجر النشطين الذين لديهم بريد إلكتروني.')}</p> : <RecipientPicker selected={selected} onChange={setSelected} error={errors.vendor_ids} />}
                    </div>

                    <Field label={t('عنوان الرسالة')} required error={errors.subject}>
                        {(props) => <Input {...props} value={values.subject} onChange={set('subject')} maxLength={150} placeholder={t('مثال: تحديث مهم بخصوص متجرك')} />}
                    </Field>

                    <Field label={t('نص الرسالة')} required error={errors.body} hint={t('سطر فارغ يبدأ فقرة جديدة.')}>
                        {(props) => <Textarea {...props} value={values.body} onChange={set('body')} rows={8} maxLength={BODY_LIMIT} className="min-h-44" />}
                    </Field>
                    <p className={cn('-mt-3 text-end text-2xs', values.body.length > BODY_LIMIT * 0.9 ? 'text-warning' : 'text-muted')}>
                        {t('{count} / {limit} حرف', { count: formatNumber(values.body.length), limit: formatNumber(BODY_LIMIT) })}
                    </p>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={send}
                loading={sending}
                icon="send"
                tone="primary"
                title={t('إرسال الرسالة إلى {count} تاجر؟', { count: formatNumber(recipientsCount) })}
                description={t('«{subject}» — لا يمكن التراجع بعد الإرسال.', { subject: values.subject })}
                confirmLabel={t('إرسال')}
            />
        </>
    );
}

/** Search active store owners and tick the ones to email; the picked ones show as removable chips. */
function RecipientPicker({ selected, onChange, error }) {
    const [searchTerm, setSearchTerm] = useState('');
    const search = useDebouncedValue(searchTerm, 300);
    const [results, setResults] = useState(null);

    useEffect(() => {
        setResults(null);
        adminApi
            .vendorEmailRecipients(search)
            .then(setResults)
            .catch(() => setResults([]));
    }, [search]);

    const isPicked = (vendor) => selected.some((picked) => picked.vendor_id === vendor.vendor_id);
    const toggle = (vendor) => onChange(isPicked(vendor) ? selected.filter((picked) => picked.vendor_id !== vendor.vendor_id) : [...selected, vendor]);

    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface-2 p-2.5">
                    {selected.map((vendor) => (
                        <span key={vendor.vendor_id} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 ps-2.5 pe-1 text-xs font-medium text-primary">
                            {vendor.full_name}
                            <button type="button" onClick={() => toggle(vendor)} className="grid size-5 place-items-center rounded-full hover:bg-primary/10" aria-label={t('إزالة {name}', { name: vendor.full_name })}>
                                <Icon name="x" className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="p-2.5">
                <Input type="search" icon="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('ابحث بالاسم أو البريد أو الهاتف أو المتجر...')} aria-label={t('بحث في التجار')} />
            </div>
            <ul className="mk-scroll max-h-56 overflow-y-auto border-t border-line">
                {results === null ? (
                    <li className="grid place-items-center p-6">
                        <Spinner className="size-5" />
                    </li>
                ) : results.length === 0 ? (
                    <li className="p-6 text-center text-sm text-muted">{t('لا يوجد تجار مطابقون')}</li>
                ) : (
                    results.map((vendor) => (
                        <li key={vendor.vendor_id}>
                            <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-surface-2', isPicked(vendor) && 'bg-primary-soft/50')}>
                                <input type="checkbox" className="size-4 accent-primary" checked={isPicked(vendor)} onChange={() => toggle(vendor)} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink">
                                        {vendor.full_name}
                                        {vendor.store && <span className="ms-1.5 text-xs font-normal text-muted">· {vendor.store}</span>}
                                    </span>
                                    <span dir="ltr" className="block truncate text-start text-xs text-muted">
                                        {vendor.email}
                                    </span>
                                </span>
                            </label>
                        </li>
                    ))
                )}
            </ul>
            {error && <p className="border-t border-line px-3 py-2 text-xs text-danger">{error}</p>}
        </div>
    );
}
