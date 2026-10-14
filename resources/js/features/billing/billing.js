import { t } from '@/i18n';
import { formatMoney } from '@/lib/format';

/** Plan features, mirroring App\Enums\PlanFeature. */
export const PLAN_FEATURES = {
    affiliates: { label: t('نظام المسوقين بالعمولة'), icon: 'users' },
    online_payments: { label: t('الدفع أونلاين بالبطاقة والمحفظة'), icon: 'credit-card' },
    custom_domain: { label: t('دومين خاص لمتجرك'), icon: 'link' },
    loyalty: { label: t('برنامج نقاط الولاء للعملاء'), icon: 'star' },
};

/** How vendors pay the platform, mirroring App\Enums\BillingMethod. */
export const BILLING_METHODS = {
    vodafone_cash: t('فودافون كاش'),
    instapay: t('إنستاباي'),
    bank_transfer: t('تحويل بنكي'),
    cash: t('نقداً'),
};

export const PERIODS = [
    { value: 1, label: t('شهر') },
    { value: 3, label: t('٣ شهور') },
    { value: 6, label: t('٦ شهور') },
    { value: 12, label: t('سنة') },
];

/** Same rule as Plan::priceFor(): the yearly price for 12 months when set. */
export function priceFor(plan, months) {
    return months === 12 && plan.price_yearly != null ? plan.price_yearly : Math.round(plan.price_monthly * months * 100) / 100;
}

/** "unlimited" or the number, for plan limits. */
export function formatLimit(value) {
    return value == null ? t('غير محدود') : value;
}

export function formatPlanPrice(plan) {
    return plan.price_monthly > 0 ? t('{price} / شهرياً', { price: formatMoney(plan.price_monthly) }) : t('مجاناً');
}
