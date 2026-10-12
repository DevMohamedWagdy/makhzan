import { Field, Input, OptionCards } from '@/components/ui/Form';
import { t } from '@/i18n';
import { PAYOUT_METHODS } from '@/lib/constants';
import { rules } from '@/lib/validators';

/**
 * Payout-method fields shared by the vendor's "add affiliate" form and the public
 * self-registration page. Form values use flat keys (payout_type, payout_account_number…);
 * the API expects a nested `payout_method` object.
 */

export const PAYOUT_INITIAL_VALUES = {
    payout_type: 'vodafone_cash',
    payout_account_name: '',
    payout_account_number: '',
    payout_bank_name: '',
    payout_iban: '',
};

const PAYOUT_OPTIONS = Object.entries(PAYOUT_METHODS).map(([value, method]) => ({
    value,
    label: method.label,
    icon: value === 'bank_account' ? 'building' : 'wallet',
}));

/** Maps API validation keys ("payout_method.account_number") to the flat form field names. */
const SERVER_FIELD_MAP = {
    'payout_method.type': 'payout_type',
    'payout_method.account_name': 'payout_account_name',
    'payout_method.account_number': 'payout_account_number',
    'payout_method.bank_name': 'payout_bank_name',
    'payout_method.iban': 'payout_iban',
};

export function mapServerErrors(errors = {}) {
    return Object.fromEntries(Object.entries(errors).map(([key, message]) => [SERVER_FIELD_MAP[key] ?? key, message]));
}

export function payoutSchema(values) {
    const method = PAYOUT_METHODS[values.payout_type];

    return {
        payout_account_number: [rules.required(t('أدخل {numberLabel}', { numberLabel: method.numberLabel }))],
        payout_account_name: [rules.required(t('أدخل اسم صاحب الحساب'))],
        payout_bank_name: method.needsBank ? [rules.required(t('أدخل اسم البنك'))] : [],
    };
}

export function buildPayoutPayload(values) {
    const needsBank = PAYOUT_METHODS[values.payout_type].needsBank;

    return {
        type: values.payout_type,
        account_name: values.payout_account_name.trim(),
        account_number: values.payout_account_number.trim(),
        bank_name: needsBank ? values.payout_bank_name.trim() : null,
        iban: needsBank ? values.payout_iban.trim() || null : null,
    };
}

/** Renders inside a 2-column grid: method cards span both columns, inputs sit side by side. */
export function PayoutMethodFields({ values, errors, bind, setValues }) {
    const method = PAYOUT_METHODS[values.payout_type];

    return (
        <>
            <div className="sm:col-span-2">
                <OptionCards options={PAYOUT_OPTIONS} value={values.payout_type} onChange={(type) => setValues({ ...values, payout_type: type })} columns={2} name="payout_type" />
            </div>
            <Field label={t('اسم صاحب الحساب')} error={errors.payout_account_name} required>
                {(props) => <Input {...props} {...bind('payout_account_name')} placeholder={values.full_name || t('كما هو مسجل في المحفظة أو البنك')} />}
            </Field>
            <Field label={method.numberLabel} error={errors.payout_account_number} required>
                {(props) => <Input {...props} {...bind('payout_account_number')} dir="ltr" className="text-start" placeholder={method.numberPlaceholder} />}
            </Field>
            {method.needsBank && (
                <>
                    <Field label={t('اسم البنك')} error={errors.payout_bank_name} required>
                        {(props) => <Input {...props} {...bind('payout_bank_name')} icon="building" placeholder={t('مثال: البنك الأهلي المصري')} />}
                    </Field>
                    <Field label={t('رقم الآيبان IBAN')} optional error={errors.payout_iban}>
                        {(props) => <Input {...props} {...bind('payout_iban')} dir="ltr" className="text-start" placeholder="EG00 0000 0000 0000 0000 0000 000" />}
                    </Field>
                </>
            )}
        </>
    );
}
