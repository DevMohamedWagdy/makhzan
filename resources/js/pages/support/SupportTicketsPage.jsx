import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { Field, Input, OptionCards, Select, Textarea } from '@/components/ui/Form';
import { Pagination, Tabs } from '@/components/ui/Navigation';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AttachmentPicker } from '@/features/support/AttachmentPicker';
import { TICKET_TYPES } from '@/features/support/support';
import { TicketList } from '@/features/support/TicketList';
import { useDebouncedValue } from '@/hooks/common';
import { t } from '@/i18n';
import { supportApi } from '@/services/supportApi';

const TYPE_OPTIONS = [{ value: '', label: t('كل الأنواع') }, ...Object.entries(TICKET_TYPES).map(([value, type]) => ({ value, label: type.label }))];

const EMPTY_TICKET = { subject: '', type: 'problem', body: '' };

function NewTicketModal({ open, onClose, onCreated }) {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY_TICKET);
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setValues(EMPTY_TICKET);
            setFiles([]);
            setErrors({});
        }
    }, [open]);

    const set = (field) => (value) => setValues((current) => ({ ...current, [field]: value }));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const ticket = await supportApi.create({ ...values, attachments: files.length ? files : undefined });
            toast.success(t('تم إرسال تذكرتك'), t('سيرد عليك فريق الدعم في أقرب وقت.'));
            onCreated(ticket);
        } catch (createError) {
            setErrors(createError.errors ?? {});

            if (!Object.keys(createError.errors ?? {}).length) {
                toast.error(t('تعذر إرسال التذكرة'), createError.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const attachmentError = Object.entries(errors).find(([key]) => key.startsWith('attachments'))?.[1];

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            icon="message-square"
            title={t('تذكرة دعم جديدة')}
            description={t('اشرح المشكلة أو الاقتراح بالتفصيل، ويمكنك إرفاق صور أو ملفات توضيحية.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" form="new-ticket-form" icon="send" loading={saving}>
                        {t('إرسال التذكرة')}
                    </Button>
                </>
            }
        >
            <form id="new-ticket-form" onSubmit={submit} className="flex flex-col gap-4">
                <Field label={t('نوع التذكرة')} required error={errors.type}>
                    <OptionCards columns={2} name="type" value={values.type} onChange={set('type')} options={Object.entries(TICKET_TYPES).map(([value, type]) => ({ value, label: type.label, icon: type.icon, description: type.description }))} />
                </Field>
                <Field label={t('العنوان')} required error={errors.subject}>
                    {(props) => <Input {...props} value={values.subject} onChange={(event) => set('subject')(event.target.value)} maxLength={150} placeholder={t('مثال: لا تصل رسائل تأكيد الطلب للعملاء')} />}
                </Field>
                <Field label={t('التفاصيل')} required error={errors.body}>
                    {(props) => <Textarea {...props} rows={6} value={values.body} onChange={(event) => set('body')(event.target.value)} maxLength={5000} placeholder={t('ماذا حدث؟ ومتى؟ وما الخطوات التي تؤدي للمشكلة؟')} />}
                </Field>
                <Field label={t('المرفقات')} optional error={attachmentError}>
                    <AttachmentPicker files={files} onChange={setFiles} onError={(message) => toast.error(t('تعذر إرفاق الملف'), message)} disabled={saving} />
                </Field>
            </form>
        </Modal>
    );
}

/** The store's conversations with the platform's support team. */
export function SupportTicketsPage() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const debouncedSearch = useDebouncedValue(search);

    const load = useCallback(() => {
        setError(null);
        supportApi
            .list({ status, type, search: debouncedSearch, page })
            .then(setResult)
            .catch((loadError) => setError(loadError.message));
    }, [status, type, debouncedSearch, page]);

    useEffect(load, [load]);

    const summary = result?.summary;
    const tabs = [
        { value: '', label: t('الكل'), count: summary?.total },
        { value: 'open', label: t('مفتوحة'), count: summary?.open },
        { value: 'closed', label: t('مغلقة'), count: summary?.closed },
    ];
    const filtered = status || type || debouncedSearch;

    return (
        <>
            <PageHeader
                title={t('الدعم الفني')}
                description={t('تواصل مع فريق Sellygrow بخصوص أي مشكلة تواجهك أو اقتراح لتحسين المنصة')}
                actions={
                    can('support.create') && (
                        <Button icon="plus" onClick={() => setCreating(true)}>
                            {t('تذكرة جديدة')}
                        </Button>
                    )
                }
            />

            <section className="mk-card overflow-hidden">
                <Tabs
                    tabs={tabs}
                    value={status}
                    onChange={(value) => {
                        setStatus(value);
                        setPage(1);
                    }}
                    className="px-3"
                />
                <div className="flex flex-col gap-3 p-4 sm:flex-row">
                    <div className="w-full sm:max-w-sm">
                        <Input
                            icon="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder={t('ابحث في عناوين التذاكر')}
                            aria-label={t('بحث')}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={TYPE_OPTIONS}
                            value={type}
                            onChange={(event) => {
                                setType(event.target.value);
                                setPage(1);
                            }}
                            aria-label={t('نوع التذكرة')}
                        />
                    </div>
                </div>

                {error ? (
                    <div className="p-6">
                        <EmptyState icon="alert-triangle" title={t('تعذر تحميل التذاكر')} description={error} action={<Button variant="secondary" icon="refresh" onClick={load}>{t('إعادة المحاولة')}</Button>} />
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-3 border-t border-line p-4">
                        {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : result.data.length === 0 ? (
                    <div className="border-t border-line p-6">
                        <EmptyState
                            icon="message-square"
                            title={filtered ? t('لا توجد تذاكر مطابقة') : t('لا توجد تذاكر بعد')}
                            description={filtered ? t('جرّب تغيير البحث أو الفلاتر.') : t('إن واجهتك مشكلة أو لديك اقتراح، افتح تذكرة وسيرد عليك فريق الدعم.')}
                            action={!filtered && can('support.create') && <Button icon="plus" onClick={() => setCreating(true)}>{t('تذكرة جديدة')}</Button>}
                        />
                    </div>
                ) : (
                    <TicketList tickets={result.data} viewer="vendor" linkTo={(ticket) => `/dashboard/support/${ticket.ticket_id}`} />
                )}

                {result && result.meta.total > result.meta.per_page && (
                    <div className="border-t border-line px-4 py-3">
                        <Pagination meta={result.meta} onPageChange={setPage} />
                    </div>
                )}
            </section>

            <NewTicketModal open={creating} onClose={() => setCreating(false)} onCreated={(ticket) => navigate(`/dashboard/support/${ticket.ticket_id}`)} />
        </>
    );
}
