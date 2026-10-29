import { localized, t } from '@/i18n';
import { ORDER_STATUSES, PRODUCT_STATUSES } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { findGovernorate } from '@/lib/locations';

/** The store's log in words: "سيف غيّر حالة الطلب #1002", with each change as "الحالة: مؤكد ← تم الشحن". */

/** What an entry is about, with its article (activity subject types, see App\Support\ActivityLogger::typeOf). */
const SUBJECTS = {
    store: t('إعدادات المتجر'),
    vendor: t('الحساب'),
    store_role: t('الدور'),
    product: t('المنتج'),
    product_category: t('القسم'),
    product_collection: t('التصنيف'),
    product_variant: t('صنف المنتج'),
    order: t('الطلب'),
    customer: t('العميل'),
    coupon: t('الكوبون'),
    affiliate: t('المسوق'),
    affiliate_payout: t('تحويل العمولة'),
    warehouse: t('المخزن'),
    supplier: t('المورد'),
    purchase_order: t('أمر الشراء'),
    store_payment_gateway: t('بوابة الدفع'),
};

/** The entry's verb, by the event's second part. */
const VERBS = {
    created: t('أضاف'),
    updated: t('عدّل'),
    deleted: t('حذف'),
    status_changed: t('غيّر حالة'),
    shipped: t('أضاف بيانات شحن'),
};

/** Whole-event wording for events that don't read as "verb + subject". */
const SENTENCES = {
    'vendor.login': t('سجّل الدخول إلى لوحة التحكم'),
    'store.shipping_updated': t('عدّل أسعار الشحن'),
    'store.domain_verified': t('فعّل دومين المتجر'),
};

/** Which group an event falls in, for its icon and colour. */
const KINDS = {
    created: { icon: 'plus', tone: 'success' },
    deleted: { icon: 'trash', tone: 'danger' },
    status_changed: { icon: 'refresh', tone: 'primary' },
    shipped: { icon: 'truck', tone: 'primary' },
    login: { icon: 'log-in', tone: 'info' },
    shipping_updated: { icon: 'truck', tone: 'warning' },
};

/** Filter options: one per area of the store. */
export const STORE_EVENT_FILTERS = [
    { value: '', label: t('كل الأقسام') },
    { value: 'order.', label: t('الطلبات') },
    { value: 'product', label: t('المنتجات') },
    { value: 'customer.', label: t('العملاء') },
    { value: 'coupon.', label: t('الكوبونات') },
    { value: 'affiliate', label: t('المسوقين') },
    { value: 'purchase_order.', label: t('أوامر الشراء') },
    { value: 'supplier.', label: t('الموردين') },
    { value: 'warehouse.', label: t('المخازن') },
    { value: 'store.', label: t('إعدادات المتجر') },
    { value: 'vendor.', label: t('الحسابات وتسجيل الدخول') },
];

/** Readable names of the attributes that show up in changes. */
const FIELDS = {
    name: t('الاسم'),
    name_en: t('الاسم بالإنجليزية'),
    full_name: t('الاسم'),
    title: t('العنوان'),
    description: t('الوصف'),
    status: t('الحالة'),
    price: t('السعر'),
    compare_at_price: t('السعر قبل الخصم'),
    cost: t('التكلفة'),
    sku: t('الكود'),
    option_values: t('الخيارات'),
    category_id: t('القسم'),
    low_stock_threshold: t('حد تنبيه المخزون'),
    email: t('البريد الإلكتروني'),
    phone: t('الهاتف'),
    job_title: t('الوظيفة'),
    role_id: t('الدور'),
    is_active: t('مفعّل'),
    code: t('الكود'),
    value: t('القيمة'),
    type: t('النوع'),
    max_uses: t('أقصى عدد استخدامات'),
    min_order_total: t('أقل قيمة للطلب'),
    starts_at: t('يبدأ في'),
    ends_at: t('ينتهي في'),
    tracking_number: t('رقم التتبع'),
    carrier: t('شركة الشحن'),
    total: t('الإجمالي'),
    subtotal: t('المجموع الفرعي'),
    discount: t('الخصم'),
    shipping_fee: t('الشحن'),
    address_line: t('العنوان'),
    recipient_name: t('اسم المستلم'),
    commission_rate: t('نسبة العمولة'),
    tier: t('المستوى'),
    default_shipping_price: t('سعر الشحن الافتراضي'),
    free_shipping_threshold: t('حد الشحن المجاني'),
    custom_domain: t('الدومين'),
    logo_path: t('اللوجو'),
    notes: t('ملاحظات'),
    note: t('ملاحظة'),
};

/** Named values of an attribute, by the area it belongs to ("coupon.type" → "نسبة مئوية"). */
const VALUE_LABELS = {
    'coupon.type': { percentage: t('نسبة مئوية'), fixed: t('مبلغ ثابت'), free_shipping: t('شحن مجاني') },
};

/** Attributes that hold money, shown with the currency. */
const MONEY_FIELDS = ['price', 'compare_at_price', 'cost', 'total', 'subtotal', 'discount', 'shipping_fee', 'min_order_total', 'default_shipping_price', 'free_shipping_threshold'];

/** The verb, the subject and the subject's label of an entry, e.g. ["غيّر حالة", "الطلب", "#1002"]. */
export function describeEntry(log) {
    if (SENTENCES[log.event]) {
        return { action: SENTENCES[log.event], subject: null, label: null };
    }

    const [subject, verb] = log.event.split('.');

    return { action: VERBS[verb] ?? verb, subject: SUBJECTS[subject] ?? subject, label: log.subject.label };
}

export function entryKind(event) {
    return KINDS[event.split('.')[1]] ?? { icon: 'edit', tone: 'neutral' };
}

/** "سعر الشحن — القاهرة" for a governorate's rate, otherwise the attribute's name (or the raw key). */
export function fieldLabel(field) {
    if (field.startsWith('rate:')) {
        const governorate = findGovernorate(field.slice(5));

        return t('الشحن إلى {name}', { name: governorate ? localized(governorate) : field.slice(5) });
    }

    return FIELDS[field] ?? field;
}

/** A changed value, readable: statuses by name, money with the currency, yes/no for switches. */
export function fieldValue(field, value, event = '') {
    if (field.startsWith('rate:')) {
        return value === 'off' ? t('بدون توصيل') : value === null || value === undefined ? t('السعر الافتراضي') : formatMoney(value);
    }

    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const named = VALUE_LABELS[`${event.split('.')[0]}.${field}`]?.[value];

    if (named) {
        return named;
    }

    if (field === 'status') {
        const statuses = event.startsWith('order.') ? ORDER_STATUSES : event.startsWith('product.') ? PRODUCT_STATUSES : {};

        return statuses[value]?.label ?? String(value);
    }

    if (typeof value === 'boolean' || ((field.startsWith('is_') || field.startsWith('has_')) && (value === 0 || value === 1))) {
        return value ? t('نعم') : t('لا');
    }

    if (MONEY_FIELDS.includes(field) && !Number.isNaN(Number(value))) {
        return formatMoney(Number(value));
    }

    if (Array.isArray(value)) {
        return value.join('، ');
    }

    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** The fields an entry changed, in the order they were saved: [{ field, label, before, after }]. */
export function entryChanges(log) {
    const changes = log.changes ?? {};
    const after = changes.new ?? {};

    return Object.keys(after).map((field) => ({
        field,
        label: fieldLabel(field),
        before: changes.old ? fieldValue(field, changes.old[field], log.event) : null,
        after: fieldValue(field, after[field], log.event),
    }));
}
