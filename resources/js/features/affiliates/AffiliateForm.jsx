import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, OptionCards, PasswordInput } from '@/components/ui/Form';
import { ImageUpload } from '@/components/ui/Upload';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { t } from '@/i18n';
import { AFFILIATE_TIERS, MAX_AVATAR_SIZE_MB } from '@/lib/constants';
import { normalizePhone, rules } from '@/lib/validators';
import { affiliatesApi } from '@/services/affiliatesApi';
import { PayoutMethodFields, buildPayoutPayload, mapServerErrors, payoutSchema } from './payoutFields';

const TIER_OPTIONS = Object.entries(AFFILIATE_TIERS).map(([value, tier]) => ({
    value,
    label: tier.label,
    icon: value === 'vip' ? 'sparkles' : value === 'new' ? 'user-plus' : 'users',
    description: t('عمولة افتراضية {default_commission}% — {description}', { default_commission: tier.default_commission, description: tier.description }),
}));

function buildSchema(isEdit) {
    return (values) => ({
        full_name: [rules.required(t('أدخل اسم المسوق بالكامل')), rules.minLength(5, t('اكتب الاسم الثنائي على الأقل'))],
        phone: [rules.required(t('أدخل رقم هاتف المسوق')), rules.phone()],
        email: [rules.email()],
        // On edit, password is optional: leaving it blank keeps the current one.
        password: isEdit ? [rules.password()] : [rules.required(t('أدخل كلمة مرور للمسوق')), rules.password()],
        password_confirmation: isEdit && !values.password ? [] : [rules.required(t('أعد كتابة كلمة المرور')), rules.matches('password')],
        ...payoutSchema(values),
    });
}

function toFormValues(affiliate) {
    return {
        full_name: affiliate?.full_name ?? '',
        phone: affiliate?.phone ?? '',
        email: affiliate?.email ?? '',
        password: '',
        password_confirmation: '',
        avatar: affiliate?.avatar_url ?? null,
        tier: affiliate?.tier ?? 'new',
        payout_type: affiliate?.payout_method.type ?? 'vodafone_cash',
        payout_account_name: affiliate?.payout_method.account_name ?? '',
        payout_account_number: affiliate?.payout_method.account_number ?? '',
        payout_bank_name: affiliate?.payout_method.bank_name ?? '',
        payout_iban: affiliate?.payout_method.iban ?? '',
    };
}

function SectionTitle({ index, title, description }) {
    return (
        <div className="flex items-start gap-3 sm:col-span-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">{index}</span>
            <div>
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
            </div>
        </div>
    );
}

/**
 * Manual single-affiliate form. Pass `affiliate` to edit an existing record.
 * @param {{ affiliate?: import('@/lib/schema').Affiliate, onSaved: Function, onCancel: Function }} props
 */
export function AffiliateForm({ affiliate, onSaved, onCancel }) {
    const isEdit = Boolean(affiliate);
    const toast = useToast();
    const [schema] = useState(() => buildSchema(isEdit));
    const [initialValues] = useState(() => toFormValues(affiliate));
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { values, errors, setErrors, setField, setValues, bind, validateFields } = useForm(initialValues, schema);

    const onSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!validateFields()) {
            return;
        }

        const payload = {
            full_name: values.full_name.trim(),
            phone: normalizePhone(values.phone),
            email: values.email.trim() || null,
            tier: values.tier,
            ...(values.password && { password: values.password, password_confirmation: values.password_confirmation }),
            ...(values.avatar instanceof File && { avatar: values.avatar }),
            ...(isEdit && values.avatar === null && affiliate.avatar_url && { remove_avatar: true }),
            payout_method: buildPayoutPayload(values),
        };

        setSubmitting(true);

        try {
            const saved = isEdit ? await affiliatesApi.update(affiliate.affiliate_id, payload) : await affiliatesApi.create(payload);

            toast.success(isEdit ? t('تم حفظ التعديلات') : t('تمت إضافة المسوق بنجاح'), isEdit ? undefined : t('تم إنشاء كود الإحالة {value} تلقائياً.', { value: saved.referral_codes[0]?.code ?? '' }));
            onSaved(saved);
        } catch (error) {
            setErrors(mapServerErrors(error.errors));
            setFormError(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            <div className="grid flex-1 gap-5 p-6 sm:grid-cols-2">
                {formError && <Alert tone="danger" className="sm:col-span-2">{formError}</Alert>}

                <SectionTitle index={t('١')} title={t('البيانات الشخصية')} description={t('بيانات التواصل مع المسوق ودخوله لحسابه')} />

                <Field label={t('الصورة الشخصية')} optional error={errors.avatar} className="sm:col-span-2">
                    {() => (
                        <ImageUpload
                            value={values.avatar}
                            onChange={(file) => setField('avatar', file)}
                            onError={(message) => setErrors((previous) => ({ ...previous, avatar: message ?? undefined }))}
                            shape="circle"
                            maxSizeMb={MAX_AVATAR_SIZE_MB}
                            label={t('رفع صورة')}
                        />
                    )}
                </Field>
                <Field label={t('الاسم بالكامل')} error={errors.full_name} required className="sm:col-span-2">
                    {(props) => <Input {...props} {...bind('full_name')} icon="user" placeholder={t('مثال: سارة محمود إبراهيم')} data-autofocus />}
                </Field>
                <Field label={t('رقم الهاتف')} error={errors.phone} required>
                    {(props) => <Input {...props} {...bind('phone')} icon="phone" type="tel" dir="ltr" className="text-start" placeholder="01012345678" />}
                </Field>
                <Field label={t('البريد الإلكتروني')} optional error={errors.email}>
                    {(props) => <Input {...props} {...bind('email')} icon="mail" type="email" dir="ltr" className="text-start" placeholder="name@example.com" />}
                </Field>
                <Field label={isEdit ? t('كلمة مرور جديدة') : t('كلمة المرور')} error={errors.password} hint={isEdit ? t('اتركها فارغة للإبقاء على كلمة المرور الحالية') : undefined} required={!isEdit}>
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder={t('٨ أحرف على الأقل')} />}
                </Field>
                <Field label={t('تأكيد كلمة المرور')} error={errors.password_confirmation} required={!isEdit}>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} placeholder={t('أعد كتابة كلمة المرور')} />}
                </Field>

                <div className="h-px bg-line sm:col-span-2" />
                <SectionTitle index={t('٢')} title={t('وسيلة السحب المفضلة')} description={t('الحساب الذي ستُحوَّل إليه أرباح المسوق')} />

                <PayoutMethodFields values={values} errors={errors} bind={bind} setValues={setValues} />

                <div className="h-px bg-line sm:col-span-2" />
                <SectionTitle index={t('٣')} title={t('شريحة المسوق')} description={t('تحدد نسبة العمولة الافتراضية، ويمكنك تخصيصها لاحقاً')} />
                <div className="sm:col-span-2">
                    <OptionCards options={TIER_OPTIONS} value={values.tier} onChange={(tier) => setValues({ ...values, tier })} name="tier" />
                </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">
                <Button variant="secondary" onClick={onCancel} disabled={submitting}>
                    {t('إلغاء')}
                </Button>
                <Button type="submit" loading={submitting} icon={isEdit ? 'check' : 'user-plus'}>
                    {isEdit ? t('حفظ التعديلات') : t('إضافة المسوق')}
                </Button>
            </div>
        </form>
    );
}
