import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { cn, formatNumber, formatRelative } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const BODY_LIMIT = 5000;
const EMPTY_FORM = { subject: '', body: '' };

const STATUSES = {
    sending: { label: t('جارٍ الإرسال'), tone: 'info' },
    sent: { label: t('تم الإرسال'), tone: 'success' },
    partial: { label: t('أُرسل جزئياً'), tone: 'warning' },
    failed: { label: t('فشل الإرسال'), tone: 'danger' },
};

/**
 * Emails from the platform team to merchants: write once and send to every active store owner or to the ones
 * picked, then follow how many went out in the history beside it.
 */
export function AdminEmailsPage() {
    const { can } = useAdminAuth();
    const toast = useToast();
    const canSend = can('emails.send');
    const [history, setHistory] = useState(null);
    const [historyError, setHistoryError] = useState(null);
    const [page, setPage] = useState(1);
    const [audience, setAudience] = useState('all');
    const [selected, setSelected] = useState([]);
    const [values, setValues] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);

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

    const eligibleCount = history?.eligible_count ?? 0;
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
            setValues(EMPTY_FORM);
            setSelected([]);
            setPage(1);
            loadHistory();
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
            <PageHeader title={t('البريد للتجار')} icon="send" description={t('اكتب رسالة وأرسلها لكل التجار أو لتجار تختارهم، بتصميم بريد المنصة.')} breadcrumbs={[t('الدعم والتواصل'), t('البريد للتجار')]} />

            <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                {canSend ? (
                    <Card title={t('رسالة جديدة')} description={t('تبدأ بتحية التاجر باسمه وتنتهي بتوقيع فريق المنصة.')}>
                        <form
                            className="flex flex-col gap-5"
                            noValidate
                            onSubmit={(event) => {
                                event.preventDefault();
                                setConfirming(true);
                            }}
                        >
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
                                {audience === 'all' ? (
                                    <p className="mt-2 text-xs text-muted">{t('كل أصحاب المتاجر النشطين الذين لديهم بريد إلكتروني.')}</p>
                                ) : (
                                    <RecipientPicker selected={selected} onChange={setSelected} error={errors.vendor_ids} />
                                )}
                            </div>

                            <Field label={t('عنوان الرسالة')} required error={errors.subject}>
                                {(props) => <Input {...props} value={values.subject} onChange={set('subject')} maxLength={150} placeholder={t('مثال: تحديث مهم بخصوص متجرك')} />}
                            </Field>

                            <Field label={t('نص الرسالة')} required error={errors.body} hint={t('سطر فارغ يبدأ فقرة جديدة.')}>
                                {(props) => <Textarea {...props} value={values.body} onChange={set('body')} rows={10} maxLength={BODY_LIMIT} className="min-h-56" />}
                            </Field>
                            <p className={cn('-mt-3 text-end text-2xs', values.body.length > BODY_LIMIT * 0.9 ? 'text-warning' : 'text-muted')}>
                                {t('{count} / {limit} حرف', { count: formatNumber(values.body.length), limit: formatNumber(BODY_LIMIT) })}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                                <span className="text-sm text-muted">{recipientsCount > 0 ? t('ستصل إلى {count} تاجر', { count: formatNumber(recipientsCount) }) : t('اختر تاجراً واحداً على الأقل')}</span>
                                <Button type="submit" icon="send" disabled={!canSubmit}>
                                    {t('إرسال الرسالة')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    <Card>
                        <EmptyState icon="lock" title={t('لا تملك صلاحية الإرسال')} description={t('يمكنك متابعة سجل الإرسال فقط.')} />
                    </Card>
                )}

                <Card title={t('سجل الإرسال')} description={t('الرسائل التي أُرسلت للتجار ونتيجتها')} bodyClassName="p-0">
                    {historyError ? (
                        <div className="p-5">
                            <EmptyState icon="alert-triangle" title={t('تعذر تحميل السجل')} description={historyError} action={<Button variant="secondary" icon="refresh" onClick={loadHistory}>{t('إعادة المحاولة')}</Button>} />
                        </div>
                    ) : !history ? (
                        <div className="flex flex-col gap-3 p-5">
                            {[0, 1, 2].map((index) => (
                                <Skeleton key={index} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    ) : history.data.length === 0 ? (
                        <div className="p-5">
                            <EmptyState icon="send" title={t('لم تُرسل أي رسالة بعد')} description={t('ستظهر هنا الرسائل التي ترسلها ونتيجة إرسال كل منها.')} />
                        </div>
                    ) : (
                        <ul className="divide-y divide-line">
                            {history.data.map((campaign) => (
                                <CampaignRow key={campaign.id} campaign={campaign} />
                            ))}
                        </ul>
                    )}
                    {history && history.meta.total > history.meta.per_page && (
                        <div className="border-t border-line px-4 py-3">
                            <Pagination meta={history.meta} onPageChange={setPage} />
                        </div>
                    )}
                </Card>
            </div>

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
            <ul className="mk-scroll max-h-64 overflow-y-auto border-t border-line">
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

/** One sent email: its subject and opening, who it went to, how many arrived, and when. */
function CampaignRow({ campaign }) {
    const status = STATUSES[campaign.status] ?? STATUSES.sending;

    return (
        <li className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">{campaign.subject}</p>
                <Badge tone={status.tone} dot>
                    {campaign.status === 'sending' && <Spinner className="size-3" />}
                    {status.label}
                </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{campaign.body}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                    <Icon name="users" className="size-3.5" />
                    {campaign.audience === 'all' ? t('كل التجار') : t('تجار محددين')}
                </span>
                <span className="mk-num">
                    {t('وصلت {sent} من {total}', { sent: formatNumber(campaign.sent_count), total: formatNumber(campaign.recipients_count) })}
                    {campaign.failed_count > 0 && <span className="text-danger"> · {t('فشل {count}', { count: formatNumber(campaign.failed_count) })}</span>}
                </span>
                {campaign.sent_by && <span>{campaign.sent_by}</span>}
                <span>{formatRelative(campaign.created_at)}</span>
            </div>
        </li>
    );
}
