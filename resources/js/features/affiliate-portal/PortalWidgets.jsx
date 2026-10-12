import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, PasswordInput, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { useToast } from '@/context/ToastContext';
import { PayoutMethodLabel } from '@/features/affiliates/AffiliateBadges';
import { useCopy } from '@/hooks/common';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { CURRENCY } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { rules } from '@/lib/validators';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

const passwordSchema = {
    current_password: [rules.required(t('أدخل كلمة المرور الحالية'))],
    password: [rules.required(t('أدخل كلمة المرور الجديدة')), rules.password()],
    password_confirmation: [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
};

export function ChangePasswordModal({ open, onClose }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const { values, errors, setErrors, bind, validateFields, reset } = useForm({ current_password: '', password: '', password_confirmation: '' }, passwordSchema);

    const close = () => {
        reset();
        onClose();
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            const { message } = await affiliatePortalApi.changePassword(values);

            toast.success(t('تم تغيير كلمة المرور'), message);
            close();
        } catch (error) {
            setErrors(error.errors ?? { current_password: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={close} dismissible={!submitting} size="sm" icon="lock" title={t('تغيير كلمة المرور')} description={t('سيتم تسجيل خروجك من جميع الأجهزة الأخرى.')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label={t('كلمة المرور الحالية')} error={errors.current_password} required>
                    {(props) => <PasswordInput {...props} {...bind('current_password')} autoComplete="current-password" data-autofocus />}
                </Field>
                <Field label={t('كلمة المرور الجديدة')} error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('٨ أحرف على الأقل')} />}
                </Field>
                <Field label={t('تأكيد كلمة المرور الجديدة')} error={errors.password_confirmation} required>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={close} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        {t('حفظ كلمة المرور')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function ReferralLinks({ codes, storeName }) {
    const { copy, copiedValue } = useCopy();

    if (codes.length === 0) {
        return <EmptyState icon="link" title={t('لا توجد روابط إحالة بعد')} description={t('سيظهر رابطك هنا بمجرد أن ينشئه المتجر.')} />;
    }

    return (
        <ul className="flex flex-col gap-4">
            {codes.map((referral) => {
                const conversion = referral.clicks ? ((referral.orders / referral.clicks) * 100).toFixed(1) : '0';
                const shareText = encodeURIComponent(t('تسوّق من {storeName} عبر رابطي 🛍️\n{url}', { storeName, url: referral.url }));

                return (
                    <li key={referral.referral_code_id} className={cn('rounded-xl border border-line p-4', !referral.is_active && 'opacity-60')}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="ltr rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-base font-bold text-primary">{referral.code}</span>
                                <Badge tone={referral.is_active ? 'success' : 'neutral'} dot>
                                    {referral.is_active ? t('فعّال') : t('معطّل')}
                                </Badge>
                            </div>
                            <span className="text-xs text-muted">{t('أُنشئ {value}', { value: formatDate(referral.created_at) })}</span>
                        </div>

                        <div className="mt-3 flex items-stretch gap-2" dir="ltr">
                            <code className="flex min-w-0 flex-1 items-center truncate rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">{referral.url}</code>
                            <Button size="sm" className="h-auto" variant={copiedValue === referral.url ? 'success' : 'primary'} icon={copiedValue === referral.url ? 'check' : 'copy'} onClick={() => copy(referral.url)} disabled={!referral.is_active}>
                                {copiedValue === referral.url ? t('تم') : t('نسخ')}
                            </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                                <span>
                                    {t('النقرات:')} <strong className="text-ink">{formatNumber(referral.clicks)}</strong>
                                </span>
                                <span>
                                    {t('الطلبات:')} <strong className="text-ink">{formatNumber(referral.orders)}</strong>
                                </span>
                                <span>
                                    {t('التحويل:')} <strong className="text-ink">{conversion}%</strong>
                                </span>
                            </div>
                            {referral.is_active && (
                                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white hover:opacity-90">
                                    <Icon name="phone" className="size-3.5" />
                                    {t('مشاركة عبر واتساب')}
                                </a>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export function RequestPayoutModal({ affiliate, open, onClose, onRequested }) {
    const toast = useToast();
    const balance = affiliate.stats.pending_balance;
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setAmount(String(balance));
            setNote('');
            setErrors({});
        }
    }, [open, balance]);

    const submit = async (event) => {
        event.preventDefault();
        const numeric = Number(amount);

        if (Number.isNaN(numeric) || numeric < 1) {
            setErrors({ amount: t('أدخل مبلغاً لا يقل عن 1 {CURRENCY}', { CURRENCY }) });

            return;
        }

        if (numeric > balance) {
            setErrors({ amount: t('المبلغ أكبر من رصيدك المستحق') });

            return;
        }

        setSubmitting(true);

        try {
            await affiliatePortalApi.requestPayout({ amount: numeric, note: note.trim() || null });
            toast.success(t('تم إرسال طلب التحويل'), t('سيراجع المتجر طلبك ويحوّل المبلغ إلى وسيلة السحب المسجلة.'));
            onRequested();
        } catch (error) {
            setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { amount: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="sm" icon="send" title={t('طلب تحويل العمولة')} description={t('سيصل طلبك للمتجر ليحوّل المبلغ إلى وسيلة السحب المسجلة.')}>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
                    <PayoutMethodLabel type={affiliate.payout_method.type} />
                    <span className="ltr font-mono text-xs text-muted">•••• {affiliate.payout_method.account_number_last4}</span>
                </div>
                <Field label={t('المبلغ المطلوب')} error={errors.amount} required hint={t('رصيدك المستحق: {value}', { value: formatMoney(balance) })}>
                    {(props) => (
                        <Input
                            {...props}
                            data-autofocus
                            type="number"
                            inputMode="decimal"
                            min={1}
                            max={balance}
                            step="0.01"
                            value={amount}
                            onChange={(event) => {
                                setAmount(event.target.value);
                                setErrors({});
                            }}
                            aria-invalid={errors.amount ? 'true' : undefined}
                            suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>}
                        />
                    )}
                </Field>
                <Field label={t('ملاحظة للمتجر')} optional error={errors.note}>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('مثال: أرجو التحويل قبل نهاية الأسبوع')} maxLength={200} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={submitting} icon="send">
                        {t('إرسال الطلب')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

/** Pending balance, the open transfer request (if any) and the button to ask for one. */
export function PayoutRequestCard({ affiliate, isImpersonating, onRequest }) {
    const request = affiliate.payout_request;
    const balance = affiliate.stats.pending_balance;

    return (
        <Card title={t('تحويل أرباحي')}>
            <p className="text-xs text-muted">{t('رصيدك المستحق')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatMoney(balance)}</p>

            {request ? (
                <Alert tone="warning" icon="refresh" title={t('طلبك قيد المراجعة')} className="mt-4">
                    {t('طلبت تحويل {value} {value2}، وسيصلك المبلغ بعد موافقة المتجر.', { value: formatMoney(request.amount), value2: formatRelative(request.created_at) })}
                </Alert>
            ) : (
                <>
                    <Button icon="send" className="mt-4 w-full" onClick={onRequest} disabled={isImpersonating || balance <= 0}>
                        {t('طلب تحويل العمولة')}
                    </Button>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                        {isImpersonating ? t('غير متاح أثناء الدخول بصفة المسوق.') : balance > 0 ? t('سيصل طلبك للمتجر ليحوّل المبلغ إلى وسيلة السحب المسجلة.') : t('لا يوجد رصيد مستحق للتحويل حالياً.')}
                    </p>
                </>
            )}
        </Card>
    );
}
