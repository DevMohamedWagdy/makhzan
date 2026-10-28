import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { adminApi } from '@/services/adminApi';

const BODY_LIMIT = 5000;

/**
 * Write an email to one merchant account: a subject and a text (blank lines start new paragraphs). It goes out
 * in the platform's mail design and the subject is kept in the activity log. `vendor` needs vendor_id,
 * full_name and email; null keeps the modal closed.
 */
export function VendorEmailModal({ vendor, onClose }) {
    const toast = useToast();
    const [values, setValues] = useState({ subject: '', body: '' });
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (vendor) {
            setValues({ subject: '', body: '' });
            setErrors({});
        }
    }, [vendor]);

    if (!vendor) {
        return null;
    }

    const set = (key) => (event) => {
        setValues((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const send = async (event) => {
        event.preventDefault();
        setSending(true);

        try {
            const result = await adminApi.emailVendor(vendor.vendor_id, values);

            toast.success(t('تم الإرسال'), result.message);
            onClose();
        } catch (error) {
            setErrors(error.errors ?? {});
            toast.error(t('تعذر إرسال البريد'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal open onClose={onClose} dismissible={!sending} size="lg" icon="mail" title={t('إرسال بريد إلى التاجر')} description={t('يصل بتصميم بريد المنصة، ويُسجَّل العنوان في سجل النشاط.')}>
            <form onSubmit={send} noValidate className="flex flex-col gap-5">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
                    <Avatar name={vendor.full_name} size="sm" shape="circle" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{vendor.full_name}</p>
                        <p dir="ltr" className="truncate text-start text-xs text-muted">
                            {vendor.email}
                        </p>
                    </div>
                </div>

                <Field label={t('عنوان الرسالة')} required error={errors.subject}>
                    {(props) => <Input {...props} value={values.subject} onChange={set('subject')} maxLength={150} placeholder={t('مثال: تحديث مهم بخصوص متجرك')} autoFocus />}
                </Field>

                <Field label={t('نص الرسالة')} required error={errors.body} hint={t('سطر فارغ يبدأ فقرة جديدة. تبدأ الرسالة بتحية التاجر باسمه وتنتهي بتوقيع فريق المنصة.')}>
                    {(props) => <Textarea {...props} value={values.body} onChange={set('body')} rows={9} maxLength={BODY_LIMIT} className="min-h-48" />}
                </Field>
                <p className={cn('-mt-3 text-end text-2xs', values.body.length > BODY_LIMIT * 0.9 ? 'text-warning' : 'text-muted')}>
                    {t('{count} / {limit} حرف', { count: formatNumber(values.body.length), limit: formatNumber(BODY_LIMIT) })}
                </p>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={sending}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" icon="send" loading={sending} disabled={!values.subject.trim() || !values.body.trim()}>
                        {t('إرسال')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
