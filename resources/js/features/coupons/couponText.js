import { t } from '@/i18n';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';

/** "خصم 25%" / "خصم 100 ج.م" / "شحن مجاني", with the cap on a percentage. */
export function describeDiscount(coupon) {
    if (coupon.type === 'free_shipping') {
        return t('شحن مجاني');
    }

    if (coupon.type === 'fixed') {
        return t('خصم {amount}', { amount: formatMoney(coupon.value) });
    }

    return coupon.max_discount
        ? t('خصم {value}% بحد أقصى {max}', { value: formatNumber(coupon.value), max: formatMoney(coupon.max_discount) })
        : t('خصم {value}%', { value: formatNumber(coupon.value) });
}

/** Short list of the coupon's conditions for tables and the affiliate portal. */
export function describeConditions(coupon) {
    return [
        coupon.min_subtotal && t('لطلبات من {amount}', { amount: formatMoney(coupon.min_subtotal) }),
        coupon.applies_to === 'products' && t('على {count} منتج', { count: formatNumber(coupon.product_ids?.length ?? 0) }),
        coupon.applies_to === 'categories' && t('على {count} قسم', { count: formatNumber(coupon.category_ids?.length ?? 0) }),
        coupon.first_order_only && t('لأول طلب'),
        coupon.per_customer_limit && t('{count} مرة لكل عميل', { count: formatNumber(coupon.per_customer_limit) }),
        coupon.ends_at && t('حتى {date}', { date: formatDate(coupon.ends_at) }),
    ].filter(Boolean);
}
