import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Display';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { ReferralLinks } from '@/features/affiliate-portal/PortalWidgets';
import { describeConditions, describeDiscount } from '@/features/coupons/couponText';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';

/** The affiliate's referral links with their clicks, orders and share buttons. */
export function AffiliateLinksPage() {
    const { affiliate } = useAffiliatePortal();
    const { copy, copiedValue } = useCopy();

    return (
        <>
            <div className="border-b border-line pb-6">
                <h1 className="mk-page-title">{t('روابط الإحالة')}</h1>
                <p className="mt-1 text-sm text-muted">{t('شارك هذه الروابط، وكل طلب يتم عبرها يُحسب لك')}</p>
            </div>
            <Card>
                <ReferralLinks codes={affiliate.referral_codes} storeName={affiliate.store.name} />
            </Card>
            {affiliate.coupons?.length > 0 && (
                <Card title={t('أكواد الخصم الخاصة بك')} description={t('شاركها مع متابعيك؛ كل طلب يستخدمها يُحسب لك حتى بدون رابطك.')}>
                    <ul className="flex flex-col gap-3">
                        {affiliate.coupons.map((coupon) => (
                            <li key={coupon.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                                <span>
                                    <span className="ltr inline-block rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-base font-bold text-primary">{coupon.code}</span>
                                    <span className="mt-1.5 block text-sm text-ink">{describeDiscount(coupon)}</span>
                                    {describeConditions(coupon).length > 0 && <span className="block text-xs text-muted">{describeConditions(coupon).join(' · ')}</span>}
                                </span>
                                <span className="flex gap-2">
                                    <Button size="sm" variant={copiedValue === coupon.code ? 'success' : 'secondary'} icon={copiedValue === coupon.code ? 'check' : 'copy'} onClick={() => copy(coupon.code)}>
                                        {copiedValue === coupon.code ? t('تم') : t('نسخ الكود')}
                                    </Button>
                                    <Button size="sm" variant={copiedValue === coupon.url ? 'success' : 'primary'} icon={copiedValue === coupon.url ? 'check' : 'link'} onClick={() => copy(coupon.url)}>
                                        {copiedValue === coupon.url ? t('تم') : t('نسخ الرابط بالكود')}
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </>
    );
}
