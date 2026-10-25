import { Button } from '@/components/ui/Button';
import { Card, DetailRow } from '@/components/ui/Display';
import { useAffiliatePortal } from '@/features/affiliate-portal/AffiliatePortalLayout';
import { PayoutMethodLabel, StatusBadge, TierBadge, formatCommission } from '@/features/affiliates/AffiliateBadges';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';

/** Account details, payout method and password. */
export function AffiliateAccountPage() {
    const { affiliate, isImpersonating, openPasswordModal } = useAffiliatePortal();

    return (
        <>
            <div className="border-b border-line pb-6">
                <h1 className="mk-page-title">{t('حسابي')}</h1>
                <p className="mt-1 text-sm text-muted">{t('بياناتك ووسيلة استلام أرباحك')}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title={t('بيانات الحساب')}>
                    <dl className="divide-y divide-line">
                        <DetailRow label={t('الاسم')}>{affiliate.full_name}</DetailRow>
                        <DetailRow label={t('الهاتف')} ltr>
                            {affiliate.phone}
                        </DetailRow>
                        <DetailRow label={t('البريد')} ltr>
                            {affiliate.email}
                        </DetailRow>
                        <DetailRow label={t('الحالة')}>
                            <StatusBadge status={affiliate.status} />
                        </DetailRow>
                        <DetailRow label={t('الشريحة')}>
                            <TierBadge tier={affiliate.tier} />
                        </DetailRow>
                        <DetailRow label={t('العمولة')}>{formatCommission(affiliate.commission)}</DetailRow>
                        <DetailRow label={t('مسوق منذ')}>{formatDate(affiliate.joined_at)}</DetailRow>
                    </dl>
                    <Button variant="secondary" size="sm" icon="lock" className="mt-4 w-full" onClick={openPasswordModal} disabled={isImpersonating}>
                        {t('تغيير كلمة المرور')}
                    </Button>
                </Card>

                <Card title={t('وسيلة استلام الأرباح')}>
                    <PayoutMethodLabel type={affiliate.payout_method.type} />
                    <dl className="mt-3 divide-y divide-line">
                        <DetailRow label={t('اسم صاحب الحساب')}>{affiliate.payout_method.account_name}</DetailRow>
                        <DetailRow label={t('رقم الحساب')}>
                            <span className="ltr font-mono">•••• {affiliate.payout_method.account_number_last4}</span>
                        </DetailRow>
                        {affiliate.payout_method.bank_name && <DetailRow label={t('البنك')}>{affiliate.payout_method.bank_name}</DetailRow>}
                    </dl>
                    <p className="mt-3 text-xs leading-relaxed text-muted">{t('لتغيير وسيلة السحب تواصل مع المتجر، حمايةً لأرباحك من التحويل لحساب آخر.')}</p>
                </Card>
            </div>
        </>
    );
}
