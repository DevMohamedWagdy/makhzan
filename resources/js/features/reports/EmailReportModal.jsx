import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge } from '@/components/ui/Display';
import { Checkbox, Field, Input } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { isEmail } from '@/lib/validators';
import { reportsApi } from '@/services/reportsApi';

/** Matches EmailReportRequest::MAX_EMAILS. */
const MAX_EMAILS = 5;

/**
 * Emails the period's PDF report: to the signed-in account (ticked by default), any of the store's team
 * members, and/or up to MAX_EMAILS other addresses typed in (an accountant, a partner).
 */
export function EmailReportModal({ open, onClose, period }) {
    const toast = useToast();
    const [accounts, setAccounts] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [emails, setEmails] = useState([]);
    const [draft, setDraft] = useState('');
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setEmails([]);
        setDraft('');
        setErrors({});
        reportsApi
            .recipients()
            .then((list) => {
                setAccounts(list);
                setSelectedIds(list.filter((account) => account.is_me).map((account) => account.vendor_id));
            })
            .catch((error) => {
                setAccounts([]);
                setErrors({ form: error.message });
            });
    }, [open]);

    const toggle = (vendorId) => setSelectedIds((ids) => (ids.includes(vendorId) ? ids.filter((id) => id !== vendorId) : [...ids, vendorId]));

    /** Adds the typed address (Enter, comma or the button); returns false when it isn't valid. */
    const addDraft = () => {
        const email = draft.trim().replace(/,$/, '').toLowerCase();

        if (!email) {
            return true;
        }

        if (!isEmail(email)) {
            setErrors({ emails: t('أدخل بريداً إلكترونياً صحيحاً') });

            return false;
        }

        if (emails.length >= MAX_EMAILS) {
            setErrors({ emails: t('يمكنك إضافة {max} عناوين بريد كحد أقصى', { max: MAX_EMAILS }) });

            return false;
        }

        setEmails((list) => (list.includes(email) ? list : [...list, email]));
        setDraft('');
        setErrors({});

        return true;
    };

    const send = async () => {
        if (!addDraft()) {
            return;
        }

        const typed = draft.trim().toLowerCase();
        const allEmails = typed && !emails.includes(typed) ? [...emails, typed] : emails;

        if (selectedIds.length === 0 && allEmails.length === 0) {
            setErrors({ form: t('اختر مستلماً واحداً على الأقل') });

            return;
        }

        setSending(true);

        try {
            const { message } = await reportsApi.email({ ...period, vendor_ids: selectedIds, emails: allEmails });
            toast.success(t('جارٍ إرسال التقرير'), message);
            onClose();
        } catch (error) {
            const fieldErrors = error.errors ?? {};
            const emailError = Object.entries(fieldErrors).find(([key]) => key.startsWith('emails'))?.[1];

            setErrors({ emails: emailError, form: emailError ? null : Object.values(fieldErrors)[0] ?? error.message });
        } finally {
            setSending(false);
        }
    };

    const total = selectedIds.length + emails.length;

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!sending}
            icon="mail"
            title={t('إرسال التقرير بالبريد')}
            description={t('يصل التقرير بصيغة PDF مرفقاً بالرسالة.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={sending}>
                        {t('إلغاء')}
                    </Button>
                    <Button icon="send" loading={sending} onClick={send} disabled={!accounts}>
                        {total > 0 ? t('إرسال إلى {count}', { count: total }) : t('إرسال')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors.form && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errors.form}</p>}

                <section>
                    <h3 className="mb-2 text-sm font-semibold text-ink">{t('من فريق المتجر')}</h3>
                    {!accounts ? (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-12 rounded-xl" />
                            <Skeleton className="h-12 rounded-xl" />
                        </div>
                    ) : (
                        <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
                            {accounts.map((account) => (
                                <li key={account.vendor_id}>
                                    <Checkbox
                                        checked={selectedIds.includes(account.vendor_id)}
                                        onChange={() => toggle(account.vendor_id)}
                                        className="flex w-full items-center rounded-xl border border-line px-3 py-2.5 transition hover:bg-surface-2 has-[:checked]:border-primary/40 has-[:checked]:bg-primary-soft"
                                        label={
                                            <span className="flex items-center gap-3">
                                                <Avatar name={account.full_name} size="sm" />
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-2 font-medium">
                                                        {account.full_name}
                                                        {account.is_me && <Badge tone="info">{t('أنت')}</Badge>}
                                                        {account.is_owner && !account.is_me && <Badge tone="neutral">{t('صاحب المتجر')}</Badge>}
                                                    </span>
                                                    <span dir="ltr" className="block truncate text-start text-xs text-muted">
                                                        {account.email}
                                                    </span>
                                                </span>
                                            </span>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <Field label={t('بريد إلكتروني آخر')} optional hint={t('لمحاسبك أو شريكك. حتى {max} عناوين.', { max: MAX_EMAILS })} error={errors.emails}>
                        {(props) => (
                            <div className="flex gap-2">
                                <Input
                                    {...props}
                                    type="email"
                                    dir="ltr"
                                    icon="mail"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ',') {
                                            event.preventDefault();
                                            addDraft();
                                        }
                                    }}
                                    placeholder="name@example.com"
                                    className="flex-1 text-start"
                                    disabled={emails.length >= MAX_EMAILS}
                                />
                                <Button variant="secondary" icon="plus" onClick={addDraft} disabled={!draft.trim()}>
                                    {t('إضافة')}
                                </Button>
                            </div>
                        )}
                    </Field>
                    {emails.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {emails.map((email) => (
                                <li key={email} className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 ps-3 pe-1 py-1 text-sm text-ink-2">
                                    <span dir="ltr">{email}</span>
                                    <button type="button" onClick={() => setEmails((list) => list.filter((item) => item !== email))} className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-danger" aria-label={t('إزالة {name}', { name: email })}>
                                        <Icon name="x" className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Modal>
    );
}
