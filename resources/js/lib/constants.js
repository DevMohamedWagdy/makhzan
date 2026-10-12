export const APP_NAME = 'مخزن';
export const APP_DOMAIN = 'makhzan.app';
export const CURRENCY = 'ج.م';

/** @type {Record<import('./schema').AffiliateTier, { label: string, tone: string, default_commission: number, description: string }>} */
export const AFFILIATE_TIERS = {
    new: { label: 'مسوق جديد', tone: 'info', default_commission: 5, description: 'للمسوقين في أول ٣٠ يوم' },
    general: { label: 'مسوق عام', tone: 'primary', default_commission: 8, description: 'الشريحة القياسية لأغلب المسوقين' },
    vip: { label: 'مسوق VIP', tone: 'warning', default_commission: 12, description: 'لكبار المسوقين أصحاب المبيعات العالية' },
};

/** @type {Record<import('./schema').AffiliateStatus, { label: string, tone: string }>} */
export const AFFILIATE_STATUSES = {
    active: { label: 'نشط', tone: 'success' },
    frozen: { label: 'مجمد', tone: 'danger' },
    pending: { label: 'بانتظار المراجعة', tone: 'warning' },
};

/** @type {Record<import('./schema').PayoutMethodType, { label: string, numberLabel: string, numberPlaceholder: string, needsBank: boolean }>} */
export const PAYOUT_METHODS = {
    vodafone_cash: {
        label: 'فودافون كاش',
        numberLabel: 'رقم المحفظة',
        numberPlaceholder: '010xxxxxxxx',
        needsBank: false,
    },
    instapay: {
        label: 'إنستاباي',
        numberLabel: 'عنوان الدفع (IPA) أو رقم الهاتف',
        numberPlaceholder: 'name@instapay',
        needsBank: false,
    },
    bank_account: {
        label: 'حساب بنكي',
        numberLabel: 'رقم الحساب',
        numberPlaceholder: '1234 5678 9012 3456',
        needsBank: true,
    },
    orange_cash: {
        label: 'أورانج كاش',
        numberLabel: 'رقم المحفظة',
        numberPlaceholder: '012xxxxxxxx',
        needsBank: false,
    },
    we_cash: {
        label: 'WE كاش',
        numberLabel: 'رقم المحفظة',
        numberPlaceholder: '015xxxxxxxx',
        needsBank: false,
    },
    etisalat_cash: {
        label: 'اتصالات كاش',
        numberLabel: 'رقم المحفظة',
        numberPlaceholder: '011xxxxxxxx',
        needsBank: false,
    },
};

export const AFFILIATE_SOURCES = {
    manual: 'إضافة يدوية',
    self_registration: 'تسجيل ذاتي',
    bulk_import: 'رفع جماعي',
};

export const PER_PAGE_OPTIONS = [10, 20, 50];

export const RESERVED_SLUGS = ['admin', 'api', 'app', 'makhzan', 'store', 'login', 'register', 'dashboard', 'help', 'affiliate', 'slug-availability'];

export const BULK_IMPORT_COLUMNS = ['full_name', 'phone', 'email', 'tier', 'payout_type', 'payout_account_name', 'payout_account_number'];

export const MAX_LOGO_SIZE_MB = 2;
export const MAX_AVATAR_SIZE_MB = 2;
export const MAX_IMPORT_SIZE_MB = 5;
