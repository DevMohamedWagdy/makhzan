import { t } from '@/i18n';

/** What a log entry is about, by subject type (App\Support\ActivityLogger::typeOf). */
const SUBJECTS = {
    store: t('المتجر'),
    vendor: t('حساب'),
    admin: t('مدير'),
    admin_role: t('دور إداري'),
    store_role: t('دور'),
    product: t('منتج'),
    product_category: t('قسم'),
    product_collection: t('تصنيف'),
    product_variant: t('صنف منتج'),
    order: t('طلب'),
    customer: t('عميل'),
    coupon: t('كوبون'),
    affiliate: t('مسوق'),
    affiliate_payout: t('تحويل عمولة'),
    warehouse: t('مخزن'),
    supplier: t('مورد'),
    purchase_order: t('أمر شراء'),
    store_payment_gateway: t('بوابة الدفع'),
    shipping_rate: t('سعر شحن'),
    vendor_email_campaign: t('بريد للتجار'),
};

const VERBS = {
    created: t('إضافة'),
    updated: t('تعديل'),
    deleted: t('حذف'),
    status_changed: t('تغيير حالة'),
    shipped: t('شحن'),
    suspended: t('إيقاف'),
    unsuspended: t('إعادة تفعيل'),
    login: t('تسجيل دخول'),
    impersonated: t('دخول الإدارة بحساب'),
    emailed: t('إرسال بريد إلى'),
    sent: t('إرسال'),
    domain_verified: t('تفعيل دومين'),
};

const ACTORS = { admin: t('الإدارة'), vendor: t('فريق المتجر'), customer: t('عميل'), affiliate: t('مسوق'), store_customer: t('عميل'), system: t('النظام') };

export const ACTOR_TYPES = [
    { value: '', label: t('كل المنفذين') },
    { value: 'admin', label: ACTORS.admin },
    { value: 'vendor', label: ACTORS.vendor },
    { value: 'customer', label: ACTORS.customer },
    { value: 'affiliate', label: ACTORS.affiliate },
    { value: 'system', label: ACTORS.system },
];

export const EVENT_FILTERS = [
    { value: '', label: t('كل الأحداث') },
    ...['order', 'product', 'customer', 'coupon', 'affiliate', 'store', 'vendor', 'admin'].map((value) => ({ value: `${value}.`, label: SUBJECTS[value] })),
];

/** "تعديل منتج", "تسجيل دخول حساب", … */
export function eventLabel(event) {
    const [subject, verb] = event.split('.');

    return `${VERBS[verb] ?? verb} ${SUBJECTS[subject] ?? subject}`;
}

export function actorLabel(actor) {
    return actor.name ?? ACTORS[actor.type] ?? ACTORS.system;
}

export function actorTypeLabel(type) {
    return ACTORS[type] ?? ACTORS.system;
}

export function eventTone(event) {
    const verb = event.split('.')[1];

    return { created: 'success', deleted: 'danger', suspended: 'danger', login: 'info', impersonated: 'warning', status_changed: 'primary' }[verb] ?? 'neutral';
}
