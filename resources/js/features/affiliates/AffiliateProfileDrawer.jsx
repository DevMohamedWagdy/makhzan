import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, Badge, DetailRow } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { AFFILIATE_SOURCES, PAYOUT_METHODS } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber, formatRelative, maskAccount } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';
import { ordersApi } from '@/services/ordersApi';
import { PayoutMethodLabel, StatusBadge, TierBadge, formatCommission, getEffectiveCommission } from './AffiliateBadges';
import { AffiliateOrdersList } from './AffiliateOrdersList';
import { PayoutHistory } from './PayoutHistory';

function Section({ title, icon, action, children }) {
    return (
        <section className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon name={icon} className="size-[18px] text-muted" />
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function CopyButton({ value, label }) {
    const { copy, copiedValue } = useCopy();
    const copied = copiedValue === value;

    return (
        <button
            type="button"
            onClick={() => copy(value)}
            className={cn('grid size-8 shrink-0 place-items-center rounded-lg transition', copied ? 'bg-success-soft text-success' : 'text-muted hover:bg-surface-3 hover:text-ink')}
            aria-label={copied ? t('تم النسخ') : label}
            title={copied ? t('تم النسخ') : label}
        >
            <Icon name={copied ? 'check' : 'copy'} className="size-4" />
        </button>
    );
}

/**
 * Affiliate profile side panel: identity, performance, payout, referral links.
 * `actions` comes from the page so the drawer and table share the same handlers.
 */
export function AffiliateProfileDrawer({ affiliate, open, onClose, actions, creatingCode }) {
    const [revealAccount, setRevealAccount] = useState(false);
    const affiliateId = affiliate?.affiliate_id;
    const loadPayouts = useCallback((page) => affiliatesApi.listPayouts(affiliateId, page), [affiliateId]);
    const loadOrders = useCallback((page) => ordersApi.list({ affiliate_id: affiliateId, page, per_page: 10 }), [affiliateId]);
    const navigate = useNavigate();

    if (!affiliate) {
        return null;
    }

    const commission = getEffectiveCommission(affiliate);
    const payoutConfig = PAYOUT_METHODS[affiliate.payout_method.type];
    const isPending = affiliate.status === 'pending';
    const { can } = useAuth();
    const canUpdate = can('affiliates.update');
    const isFrozen = affiliate.status === 'frozen';
    const payoutRequest = affiliate.payout_request;

    const header = (
        <div className="relative">
            <div className="mk-grid-texture relative h-24 bg-panel"><div className="absolute -top-16 end-10 size-48 rounded-full bg-brand-accent/25 blur-3xl" /></div>
            <button type="button" onClick={onClose} className="absolute top-4 end-4 grid size-9 place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-white/25" aria-label={t('إغلاق')} title={t('إغلاق')}>
                <Icon name="x" />
            </button>
            <div className="-mt-10 flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
                <Avatar name={affiliate.full_name} src={affiliate.avatar_url} size="xl" ring />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold text-ink">{affiliate.full_name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={affiliate.status} />
                        <TierBadge tier={affiliate.tier} />
                        <span className="text-xs text-muted">#{affiliate.affiliate_id}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-line px-6 pb-5">
                {!canUpdate ? null : isPending ? (
                    <>
                        <Button size="sm" variant="success" icon="check" onClick={() => actions.approve(affiliate)}>
                            {t('قبول الطلب')}
                        </Button>
                        <Button size="sm" variant="danger-soft" icon="x" onClick={() => actions.reject(affiliate)}>
                            {t('رفض')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button size="sm" variant="soft" icon="edit" onClick={() => actions.edit(affiliate)}>
                            {t('تعديل البيانات')}
                        </Button>
                        <Button size="sm" variant="secondary" icon="percent" onClick={() => actions.commission(affiliate)}>
                            {t('تخصيص العمولة')}
                        </Button>
                    </>
                )}
                {!isPending && can('affiliates.impersonate') && (
                    <Button size="sm" variant="secondary" icon="log-in" onClick={() => actions.impersonate(affiliate)}>
                        {t('الدخول بصفته')}
                    </Button>
                )}
                <Dropdown
                    label={t('إجراءات إضافية')}
                    trigger={(props) => (
                        <button type="button" {...props} className="grid size-8 place-items-center rounded-lg border border-line text-ink-2 hover:bg-surface-3">
                            <Icon name="more-vertical" className="size-4" />
                        </button>
                    )}
                    items={[
                        { label: t('تعديل البيانات'), icon: 'edit', onClick: () => actions.edit(affiliate), hidden: !isPending || !canUpdate },
                        { label: t('تجميد الحساب'), icon: 'snowflake', onClick: () => actions.freeze(affiliate), hidden: affiliate.status !== 'active' || !canUpdate },
                        { label: t('إلغاء التجميد'), icon: 'zap', tone: 'success', onClick: () => actions.activate(affiliate), hidden: !isFrozen || !canUpdate },
                        { divider: true },
                        { label: t('حذف نهائي'), icon: 'trash', tone: 'danger', onClick: () => actions.remove(affiliate), hidden: !can('affiliates.delete') },
                    ]}
                />
            </div>
        </div>
    );

    return (
        <Drawer open={open} onClose={onClose} title={t('ملف المسوق {full_name}', { full_name: affiliate.full_name })} header={header} size="lg">
            {isFrozen && (
                <div className="px-6 pt-5">
                    <Alert tone="danger" icon="snowflake" title={t('الحساب مجمد')}>
                        {t('{value}روابط الإحالة معطلة، والسجلات التاريخية محفوظة.', { value: affiliate.frozen_reason ? t('السبب: {frozen_reason}. ', { frozen_reason: affiliate.frozen_reason }) : '' })}
                    </Alert>
                </div>
            )}
            {payoutRequest && (
                <div className="px-6 pt-5">
                    <Alert tone="warning" icon="send" title={t('طلب تحويل عمولة بقيمة {value}', { value: formatMoney(payoutRequest.amount) })}>
                        <p>
                            {t('أرسل المسوق الطلب {value}.{value2}', { value: formatRelative(payoutRequest.created_at), value2: payoutRequest.request_note ? t(' ملاحظته: {request_note}', { request_note: payoutRequest.request_note }) : '' })}
                        </p>
                        <div className={cn('mt-3 flex flex-wrap gap-2', !can('payouts.update') && 'hidden')}>
                            <Button size="sm" variant="success" icon="check" onClick={() => actions.payout(affiliate)}>
                                {t('تأكيد التحويل')}
                            </Button>
                            <Button size="sm" variant="danger-soft" icon="x" onClick={() => actions.rejectPayout(affiliate)}>
                                {t('رفض الطلب')}
                            </Button>
                        </div>
                    </Alert>
                </div>
            )}
            {isPending && (
                <div className="px-6 pt-5">
                    <Alert tone="warning" title={t('طلب انضمام جديد')}>
                        {t('سجّل هذا المسوق عبر رابط التسجيل الذاتي {value}، وينتظر موافقتك.', { value: formatRelative(affiliate.joined_at) })}
                    </Alert>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 px-6 pt-5 sm:grid-cols-4">
                {[
                    { label: t('الطلبات'), value: formatNumber(affiliate.stats.orders_count), icon: 'shopping-bag' },
                    { label: t('المبيعات'), value: formatMoney(affiliate.stats.sales_total), icon: 'bar-chart' },
                    { label: t('العمولات المكتسبة'), value: formatMoney(affiliate.stats.earned_commission), icon: 'wallet' },
                    { label: t('رصيد معلق'), value: formatMoney(affiliate.stats.pending_balance), icon: 'refresh' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-line bg-surface-2 p-3">
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                            <Icon name={stat.icon} className="size-3.5" />
                            {stat.label}
                        </p>
                        <p className="mt-1.5 truncate text-base font-semibold text-ink">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="divide-y divide-line">
                <Section title={t('البيانات الشخصية وبيانات التواصل')} icon="user">
                    <dl className="divide-y divide-line">
                        <DetailRow label={t('رقم الهاتف')}>
                            <span className="inline-flex items-center gap-1">
                                <span className="ltr">{affiliate.phone}</span>
                                <CopyButton value={affiliate.phone} label={t('نسخ رقم الهاتف')} />
                            </span>
                        </DetailRow>
                        <DetailRow label={t('البريد الإلكتروني')} ltr>
                            {affiliate.email}
                        </DetailRow>
                        <DetailRow label={t('تاريخ الانضمام')}>{formatDate(affiliate.joined_at)}</DetailRow>
                        <DetailRow label={t('آخر نشاط')}>{formatRelative(affiliate.last_active_at)}</DetailRow>
                        <DetailRow label={t('طريقة الإضافة')}>{AFFILIATE_SOURCES[affiliate.source]}</DetailRow>
                    </dl>
                </Section>

                <Section title={t('العمولة')} icon="percent" action={!isPending && canUpdate && <Button size="sm" variant="ghost" onClick={() => actions.commission(affiliate)}>{t('تعديل')}</Button>}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
                        <div>
                            <p className="text-xs text-muted">{commission.isCustom ? t('عمولة استثنائية مخصصة') : t('عمولة الشريحة الافتراضية')}</p>
                            <p className="mt-1 text-lg font-semibold text-ink">{formatCommission(commission)}</p>
                            {commission.note && <p className="mt-1 text-xs text-ink-2">{commission.note}</p>}
                        </div>
                        <Badge tone={commission.isCustom ? 'warning' : 'neutral'}>{commission.isCustom ? t('مخصصة') : t('افتراضية')}</Badge>
                    </div>
                </Section>

                <Section title={t('بيانات السحب')} icon="wallet">
                    <div className="rounded-xl border border-line p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <PayoutMethodLabel type={affiliate.payout_method.type} />
                            <button type="button" onClick={() => setRevealAccount((value) => !value)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <Icon name={revealAccount ? 'eye-off' : 'eye'} className="size-3.5" />
                                {revealAccount ? t('إخفاء') : t('إظهار البيانات')}
                            </button>
                        </div>
                        <dl className="divide-y divide-line">
                            <DetailRow label={t('اسم صاحب الحساب')}>{affiliate.payout_method.account_name}</DetailRow>
                            <DetailRow label={payoutConfig.numberLabel}>
                                <span className="inline-flex items-center gap-1">
                                    <span className="ltr font-mono">{revealAccount ? affiliate.payout_method.account_number : maskAccount(affiliate.payout_method.account_number)}</span>
                                    {revealAccount && <CopyButton value={affiliate.payout_method.account_number} label={t('نسخ رقم الحساب')} />}
                                </span>
                            </DetailRow>
                            {affiliate.payout_method.bank_name && <DetailRow label={t('البنك')}>{affiliate.payout_method.bank_name}</DetailRow>}
                            {affiliate.payout_method.iban && (
                                <DetailRow label="IBAN">
                                    <span className="ltr font-mono text-xs">{revealAccount ? affiliate.payout_method.iban : maskAccount(affiliate.payout_method.iban)}</span>
                                </DetailRow>
                            )}
                        </dl>
                    </div>
                </Section>

                {!isPending && (
                    <Section
                        title={t('طلبات المسوق')}
                        icon="shopping-bag"
                        action={
                            <Button size="sm" variant="ghost" to={`/dashboard/orders?affiliate_id=${affiliate.affiliate_id}`}>
                                {t('عرض الكل')}
                            </Button>
                        }
                    >
                        <AffiliateOrdersList load={loadOrders} refreshKey={affiliate.stats.orders_count} onOpen={(order) => navigate(`/dashboard/orders?order=${order.order_id}`)} emptyText={t('لا توجد طلبات من روابط هذا المسوق بعد.')} />
                    </Section>
                )}

                <Section
                    title={t('تحويلات العمولة')}
                    icon="send"
                    action={
                        !isPending &&
                        !payoutRequest &&
                        affiliate.stats.pending_balance > 0 && (
                            <Button size="sm" variant="soft" icon="plus" onClick={() => actions.payout(affiliate)}>
                                {t('تسجيل دفعة')}
                            </Button>
                        )
                    }
                >
                    <PayoutHistory load={loadPayouts} refreshKey={`${affiliate.stats.pending_balance}-${payoutRequest?.payout_id ?? 'none'}`} emptyText={t('لم تُسجَّل أي تحويلات لهذا المسوق بعد.')} />
                </Section>

                <Section
                    title={t('أكواد الإحالة والروابط النشطة')}
                    icon="link"
                    action={
                        affiliate.status === 'active' &&
                        canUpdate && (
                            <Button size="sm" variant="soft" icon="plus" loading={creatingCode} onClick={() => actions.createReferralCode(affiliate)}>
                                {t('كود جديد')}
                            </Button>
                        )
                    }
                >
                    {affiliate.referral_codes.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{isPending ? t('سيُنشأ كود الإحالة تلقائياً عند قبول الطلب.') : t('لا توجد أكواد إحالة بعد.')}</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {affiliate.referral_codes.map((referral) => {
                                const conversion = referral.clicks ? ((referral.orders / referral.clicks) * 100).toFixed(1) : '0';

                                return (
                                    <li key={referral.referral_code_id} className="rounded-xl border border-line p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="ltr rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-sm font-semibold text-primary">{referral.code}</span>
                                                <CopyButton value={referral.code} label={t('نسخ الكود')} />
                                            </div>
                                            <Badge tone={referral.is_active ? 'success' : 'neutral'} dot>
                                                {referral.is_active ? t('فعّال') : t('معطّل')}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-1 rounded-lg bg-surface-2 ps-3" dir="ltr">
                                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{referral.url}</span>
                                            <CopyButton value={referral.url} label={t('نسخ الرابط')} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                                            <span>
                                                {t('النقرات:')} <strong className="text-ink">{formatNumber(referral.clicks)}</strong>
                                            </span>
                                            <span>
                                                {t('الطلبات:')} <strong className="text-ink">{formatNumber(referral.orders)}</strong>
                                            </span>
                                            <span>
                                                {t('معدل التحويل:')} <strong className="text-ink">{conversion}%</strong>
                                            </span>
                                            <span>{t('أُنشئ {value}', { value: formatDate(referral.created_at) })}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>
            </div>
        </Drawer>
    );
}
