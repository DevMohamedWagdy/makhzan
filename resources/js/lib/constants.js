import { t } from '@/i18n';

export const APP_NAME = t('مخزن');
export const APP_DOMAIN = 'makhzan.app';
export const CURRENCY = t('ج.م');

/** @type {Record<import('./schema').AffiliateTier, { label: string, tone: string, default_commission: number, description: string }>} */
export const AFFILIATE_TIERS = {
    new: { label: t('مسوق جديد'), tone: 'info', default_commission: 5, description: t('للمسوقين في أول ٣٠ يوم') },
    general: { label: t('مسوق عام'), tone: 'primary', default_commission: 8, description: t('الشريحة القياسية لأغلب المسوقين') },
    vip: { label: t('مسوق VIP'), tone: 'warning', default_commission: 12, description: t('لكبار المسوقين أصحاب المبيعات العالية') },
};

/** @type {Record<import('./schema').AffiliateStatus, { label: string, tone: string }>} */
export const AFFILIATE_STATUSES = {
    active: { label: t('نشط'), tone: 'success' },
    frozen: { label: t('مجمد'), tone: 'danger' },
    pending: { label: t('بانتظار المراجعة'), tone: 'warning' },
};

/** @type {Record<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned', { label: string, tone: string, icon: string, action?: string }>} */
export const ORDER_STATUSES = {
    pending: { label: t('بانتظار التأكيد'), tone: 'warning', icon: 'refresh' },
    confirmed: { label: t('مؤكد'), tone: 'info', icon: 'check', action: t('تأكيد الطلب') },
    shipped: { label: t('تم الشحن'), tone: 'primary', icon: 'truck', action: t('تم الشحن') },
    delivered: { label: t('تم التوصيل'), tone: 'success', icon: 'check-circle', action: t('تم التوصيل') },
    cancelled: { label: t('ملغي'), tone: 'danger', icon: 'x', action: t('إلغاء الطلب') },
    returned: { label: t('مرتجع'), tone: 'neutral', icon: 'refresh', action: t('تسجيل كمرتجع') },
};

/** How a customer pays: on delivery, or online through the store's Paymob account. */
export const PAYMENT_METHODS = {
    cod: { label: t('الدفع عند الاستلام'), short: t('عند الاستلام'), icon: 'wallet', description: t('ادفع نقداً للمندوب عند استلام طلبك.') },
    card: { label: t('بطاقة بنكية'), short: t('بطاقة'), icon: 'credit-card', description: t('فيزا أو ماستركارد أو ميزة، دفع آمن عبر Paymob.') },
    wallet: { label: t('محفظة إلكترونية'), short: t('محفظة'), icon: 'smartphone', description: t('فودافون كاش أو أي محفظة موبايل، عبر Paymob.') },
};

/** Online payment status of an order (cash-on-delivery orders have none). */
export const PAYMENT_STATUSES = {
    pending: { label: t('بانتظار الدفع'), tone: 'warning', icon: 'clock' },
    paid: { label: t('مدفوع'), tone: 'success', icon: 'check-circle' },
    failed: { label: t('فشل الدفع'), tone: 'danger', icon: 'x' },
    partially_refunded: { label: t('مسترد جزئياً'), tone: 'info', icon: 'refresh' },
    refunded: { label: t('مسترد'), tone: 'neutral', icon: 'refresh' },
};

/** @type {Record<'draft' | 'active' | 'archived', { label: string, tone: string, description: string }>} */
export const PRODUCT_STATUSES = {
    active: { label: t('منشور'), tone: 'success', description: t('ظاهر في المتجر ومتاح للشراء') },
    draft: { label: t('مسودة'), tone: 'neutral', description: t('مخفي من المتجر لحين اكتماله') },
    archived: { label: t('مؤرشف'), tone: 'warning', description: t('متوقف عن البيع ومحفوظ في السجلات') },
};

/** @type {Record<'in' | 'low' | 'out', string>} */
export const STOCK_LEVELS = { in: t('متوفر'), low: t('مخزون منخفض'), out: t('نفد المخزون') };

/** @type {Record<'initial'|'sale'|'cancellation'|'return'|'restock'|'adjustment'|'damage'|'product_edit', { label: string, tone: string, icon: string }>} */
export const STOCK_MOVEMENT_TYPES = {
    restock: { label: t('توريد'), tone: 'success', icon: 'download' },
    adjustment: { label: t('تسوية جرد'), tone: 'info', icon: 'check-circle' },
    damage: { label: t('تالف أو مفقود'), tone: 'danger', icon: 'alert-triangle' },
    sale: { label: t('بيع'), tone: 'primary', icon: 'shopping-bag' },
    cancellation: { label: t('إلغاء طلب'), tone: 'neutral', icon: 'x' },
    return: { label: t('مرتجع'), tone: 'warning', icon: 'refresh' },
    transfer: { label: t('تحويل بين المخازن'), tone: 'info', icon: 'arrow-left' },
    initial: { label: t('رصيد افتتاحي'), tone: 'neutral', icon: 'plus' },
    product_edit: { label: t('تعديل من صفحة المنتج'), tone: 'neutral', icon: 'edit' },
};

/** @type {Record<'draft'|'ordered'|'partial'|'received'|'closed'|'cancelled', { label: string, tone: string, icon: string }>} */
/** Moderation states of a product review. */
export const REVIEW_STATUSES = {
    pending: { label: t('بانتظار المراجعة'), tone: 'warning' },
    approved: { label: t('منشور'), tone: 'success' },
    rejected: { label: t('مرفوض'), tone: 'neutral' },
};

/** Where an order came from (App\Enums\OrderSource); all but `store` are recorded by hand in the dashboard. */
export const ORDER_SOURCES = {
    store: { label: t('المتجر الإلكتروني'), icon: 'store' },
    whatsapp: { label: t('واتساب'), icon: 'message-square' },
    messenger: { label: t('ماسنجر'), icon: 'send' },
    instagram: { label: t('إنستجرام'), icon: 'camera' },
    phone: { label: t('مكالمة هاتفية'), icon: 'phone' },
    walkin: { label: t('من المحل'), icon: 'shopping-bag' },
    other: { label: t('أخرى'), icon: 'more-vertical' },
};

export const PURCHASE_ORDER_STATUSES = {
    draft: { label: t('مسودة'), tone: 'neutral', icon: 'edit' },
    ordered: { label: t('بانتظار الاستلام'), tone: 'info', icon: 'send' },
    partial: { label: t('مستلم جزئياً'), tone: 'warning', icon: 'refresh' },
    received: { label: t('مستلم بالكامل'), tone: 'success', icon: 'check-circle' },
    closed: { label: t('مغلق'), tone: 'neutral', icon: 'lock' },
    cancelled: { label: t('ملغي'), tone: 'danger', icon: 'x' },
};

/** @type {Record<'active'|'scheduled'|'expired'|'disabled', { label: string, tone: string }>} */
export const COUPON_STATES = {
    active: { label: t('فعّال'), tone: 'success' },
    scheduled: { label: t('مجدول'), tone: 'info' },
    expired: { label: t('منتهي'), tone: 'neutral' },
    disabled: { label: t('موقوف'), tone: 'danger' },
};

/** Common option names offered as suggestions in the product form. */
export const OPTION_SUGGESTIONS = [t('المقاس'), t('اللون'), t('الخامة'), t('الوزن')];

/** @type {Record<'requested' | 'paid' | 'rejected', { label: string, tone: string, icon: string }>} */
export const PAYOUT_STATUSES = {
    requested: { label: t('قيد المراجعة'), tone: 'warning', icon: 'refresh' },
    paid: { label: t('تم التحويل'), tone: 'success', icon: 'check-circle' },
    rejected: { label: t('مرفوض'), tone: 'danger', icon: 'x' },
};

/** @type {Record<import('./schema').PayoutMethodType, { label: string, numberLabel: string, numberPlaceholder: string, needsBank: boolean }>} */
export const PAYOUT_METHODS = {
    vodafone_cash: {
        label: t('فودافون كاش'),
        numberLabel: t('رقم المحفظة'),
        numberPlaceholder: '010xxxxxxxx',
        needsBank: false,
    },
    instapay: {
        label: t('إنستاباي'),
        numberLabel: t('عنوان الدفع (IPA) أو رقم الهاتف'),
        numberPlaceholder: 'name@instapay',
        needsBank: false,
    },
    bank_account: {
        label: t('حساب بنكي'),
        numberLabel: t('رقم الحساب'),
        numberPlaceholder: '1234 5678 9012 3456',
        needsBank: true,
    },
    orange_cash: {
        label: t('أورانج كاش'),
        numberLabel: t('رقم المحفظة'),
        numberPlaceholder: '012xxxxxxxx',
        needsBank: false,
    },
    we_cash: {
        label: t('WE كاش'),
        numberLabel: t('رقم المحفظة'),
        numberPlaceholder: '015xxxxxxxx',
        needsBank: false,
    },
    etisalat_cash: {
        label: t('اتصالات كاش'),
        numberLabel: t('رقم المحفظة'),
        numberPlaceholder: '011xxxxxxxx',
        needsBank: false,
    },
};

export const AFFILIATE_SOURCES = {
    manual: t('إضافة يدوية'),
    self_registration: t('تسجيل ذاتي'),
    bulk_import: t('رفع جماعي'),
};

export const PER_PAGE_OPTIONS = [10, 20, 50];

export const RESERVED_SLUGS = ['admin', 'api', 'app', 'makhzan', 'store', 'login', 'register', 'dashboard', 'help', 'affiliate', 'slug-availability'];

export const BULK_IMPORT_COLUMNS = ['full_name', 'phone', 'email', 'tier', 'payout_type', 'payout_account_name', 'payout_account_number'];

export const MAX_LOGO_SIZE_MB = 2;
export const MAX_AVATAR_SIZE_MB = 2;
export const MAX_IMPORT_SIZE_MB = 5;
