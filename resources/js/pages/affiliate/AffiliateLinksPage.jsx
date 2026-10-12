import { Card } from '@/components/ui/Display';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { ReferralLinks } from '@/features/affiliate-portal/PortalWidgets';
import { t } from '@/i18n';

/** The affiliate's referral links with their clicks, orders and share buttons. */
export function AffiliateLinksPage() {
    const { affiliate } = useAffiliatePortal();

    return (
        <>
            <div>
                <h1 className="text-2xl font-bold text-ink">{t('روابط الإحالة')}</h1>
                <p className="mt-1 text-sm text-muted">{t('شارك هذه الروابط، وكل طلب يتم عبرها يُحسب لك')}</p>
            </div>
            <Card>
                <ReferralLinks codes={affiliate.referral_codes} storeName={affiliate.store.name} />
            </Card>
        </>
    );
}
