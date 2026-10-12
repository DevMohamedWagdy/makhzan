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

/** @type {Record<'draft' | 'active' | 'archived', { label: string, tone: string, description: string }>} */
export const PRODUCT_STATUSES = {
    active: { label: t('منشور'), tone: 'success', description: t('ظاهر في المتجر ومتاح للشراء') },
    draft: { label: t('مسودة'), tone: 'neutral', description: t('مخفي من المتجر لحين اكتماله') },
    archived: { label: t('مؤرشف'), tone: 'warning', description: t('متوقف عن البيع ومحفوظ في السجلات') },
};

/** @type {Record<'in' | 'low' | 'out', string>} */
export const STOCK_LEVELS = { in: t('متوفر'), low: t('مخزون منخفض'), out: t('نفد المخزون') };

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
