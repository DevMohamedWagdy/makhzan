import { t } from '@/i18n';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Strips spaces/dashes and converts Arabic-Indic digits to Latin. */
export function normalizePhone(value = '') {
    return String(value)
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[\s\-()]/g, '');
}

export function isEmail(value) {
    return EMAIL_PATTERN.test(String(value).trim());
}

/** Accepts local Egyptian mobiles (01xxxxxxxxx), Saudi (05xxxxxxxx) or international (+countrycode...). */
export function isPhone(value) {
    const phone = normalizePhone(value);

    return /^01[0125]\d{8}$/.test(phone) || /^05\d{8}$/.test(phone) || /^\+\d{10,15}$/.test(phone);
}

export function isSlug(value) {
    return SLUG_PATTERN.test(value) && value.length >= 3 && value.length <= 40;
}

/**
 * @returns {{ score: 0|1|2|3|4, label: string }}
 */
export function passwordStrength(password = '') {
    let score = 0;

    if (password.length >= 8) {
        score++;
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        score++;
    }

    if (/\d/.test(password)) {
        score++;
    }

    if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) {
        score++;
    }

    const labels = [t('ضعيفة جداً'), t('ضعيفة'), t('متوسطة'), t('جيدة'), t('قوية')];

    return { score, label: labels[score] };
}

/* Composable rule builders. Each returns an error message or null. */

export const rules = {
    required: (message = t('هذا الحقل مطلوب')) => (value) =>
        value === undefined || value === null || String(value).trim() === '' ? message : null,
    minLength: (length, message) => (value) =>
        value && String(value).trim().length < length ? message ?? t('يجب ألا يقل عن {length} أحرف', { length }) : null,
    email: (message = t('صيغة البريد الإلكتروني غير صحيحة')) => (value) => (value && !isEmail(value) ? message : null),
    phone: (message = t('رقم الهاتف غير صحيح، مثال: 01012345678')) => (value) => (value && !isPhone(value) ? message : null),
    password: () => (value) =>
        value && (value.length < 8 || !/\d/.test(value) || !/[A-Za-z]/.test(value))
            ? t('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام')
            : null,
    matches: (field, message = t('كلمتا المرور غير متطابقتين')) => (value, values) =>
        value !== values[field] ? message : null,
    slug: () => (value) =>
        value && !isSlug(value) ? t('استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (-) فقط، من 3 إلى 40 حرفاً') : null,
    range: (min, max, message) => (value) => {
        const number = Number(value);

        return value !== '' && (Number.isNaN(number) || number < min || number > max)
            ? message ?? t('أدخل قيمة بين {min} و {max}', { min, max })
            : null;
    },
};

/**
 * Runs a schema of rule arrays against values.
 * @param {Record<string, Array<(value: any, values: object) => string|null>>} schema
 */
export function validate(schema, values) {
    const errors = {};

    for (const [field, fieldRules] of Object.entries(schema)) {
        for (const rule of fieldRules) {
            const error = rule(values[field], values);

            if (error) {
                errors[field] = error;
                break;
            }
        }
    }

    return errors;
}
