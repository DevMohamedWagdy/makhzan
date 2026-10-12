import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, Badge, DetailRow } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Overlay';
import { useCopy } from '@/hooks/common';
import { AFFILIATE_SOURCES, PAYOUT_METHODS } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber, formatRelative, maskAccount } from '@/lib/format';
import { PayoutMethodLabel, StatusBadge, TierBadge, formatCommission, getEffectiveCommission } from './AffiliateBadges';

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
            aria-label={copied ? 'تم النسخ' : label}
            title={copied ? 'تم النسخ' : label}
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

    if (!affiliate) {
        return null;
    }

    const commission = getEffectiveCommission(affiliate);
    const payoutConfig = PAYOUT_METHODS[affiliate.payout_method.type];
    const isPending = affiliate.status === 'pending';
    const isFrozen = affiliate.status === 'frozen';

    const header = (
        <div className="relative">
            <div className="h-24 bg-gradient-to-l from-indigo-600 to-sky-500 dark:from-indigo-900 dark:to-sky-900" />
            <button type="button" onClick={onClose} className="absolute top-4 end-4 grid size-9 place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-white/25" aria-label="إغلاق" title="إغلاق">
                <Icon name="x" />
            </button>
            <div className="-mt-10 flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
                <Avatar name={affiliate.full_name} src={affiliate.avatar_url} size="xl" ring />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-bold text-ink">{affiliate.full_name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={affiliate.status} />
                        <TierBadge tier={affiliate.tier} />
                        <span className="text-xs text-muted">#{affiliate.affiliate_id}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-line px-6 pb-5">
                {isPending ? (
                    <>
                        <Button size="sm" variant="success" icon="check" onClick={() => actions.approve(affiliate)}>
                            قبول الطلب
                        </Button>
                        <Button size="sm" variant="danger-soft" icon="x" onClick={() => actions.reject(affiliate)}>
                            رفض
                        </Button>
                    </>
                ) : (
                    <>
                        <Button size="sm" variant="soft" icon="edit" onClick={() => actions.edit(affiliate)}>
                            تعديل البيانات
                        </Button>
                        <Button size="sm" variant="secondary" icon="percent" onClick={() => actions.commission(affiliate)}>
                            تخصيص العمولة
                        </Button>
                        <Button size="sm" variant="secondary" icon="log-in" onClick={() => actions.impersonate(affiliate)}>
                            الدخول بصفته
                        </Button>
                    </>
                )}
                <Dropdown
                    label="إجراءات إضافية"
                    trigger={(props) => (
                        <button type="button" {...props} className="grid size-8 place-items-center rounded-lg border border-line text-ink-2 hover:bg-surface-3">
                            <Icon name="more-vertical" className="size-4" />
                        </button>
                    )}
                    items={[
                        { label: 'تعديل البيانات', icon: 'edit', onClick: () => actions.edit(affiliate), hidden: !isPending },
                        { label: 'تجميد الحساب', icon: 'snowflake', onClick: () => actions.freeze(affiliate), hidden: affiliate.status !== 'active' },
                        { label: 'إلغاء التجميد', icon: 'zap', tone: 'success', onClick: () => actions.activate(affiliate), hidden: !isFrozen },
                        { divider: true },
                        { label: 'حذف نهائي', icon: 'trash', tone: 'danger', onClick: () => actions.remove(affiliate) },
                    ]}
                />
            </div>
        </div>
    );

    return (
        <Drawer open={open} onClose={onClose} title={`ملف المسوق ${affiliate.full_name}`} header={header} size="lg">
            {isFrozen && (
                <div className="px-6 pt-5">
                    <Alert tone="danger" icon="snowflake" title="الحساب مجمد">
                        {affiliate.frozen_reason ? `السبب: ${affiliate.frozen_reason}. ` : ''}روابط الإحالة معطلة، والسجلات التاريخية محفوظة.
                    </Alert>
                </div>
            )}
            {isPending && (
                <div className="px-6 pt-5">
                    <Alert tone="warning" title="طلب انضمام جديد">
                        سجّل هذا المسوق عبر رابط التسجيل الذاتي {formatRelative(affiliate.joined_at)}، وينتظر موافقتك.
                    </Alert>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 px-6 pt-5 sm:grid-cols-4">
                {[
                    { label: 'الطلبات', value: formatNumber(affiliate.stats.orders_count), icon: 'shopping-bag' },
                    { label: 'المبيعات', value: formatMoney(affiliate.stats.sales_total), icon: 'bar-chart' },
                    { label: 'العمولات المكتسبة', value: formatMoney(affiliate.stats.earned_commission), icon: 'wallet' },
                    { label: 'رصيد معلق', value: formatMoney(affiliate.stats.pending_balance), icon: 'refresh' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-line bg-surface-2 p-3">
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                            <Icon name={stat.icon} className="size-3.5" />
                            {stat.label}
                        </p>
                        <p className="mt-1.5 truncate text-base font-bold text-ink">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="divide-y divide-line">
                <Section title="البيانات الشخصية وبيانات التواصل" icon="user">
                    <dl className="divide-y divide-line">
                        <DetailRow label="رقم الهاتف">
                            <span className="inline-flex items-center gap-1">
                                <span className="ltr">{affiliate.phone}</span>
                                <CopyButton value={affiliate.phone} label="نسخ رقم الهاتف" />
                            </span>
                        </DetailRow>
                        <DetailRow label="البريد الإلكتروني" ltr>
                            {affiliate.email}
                        </DetailRow>
                        <DetailRow label="تاريخ الانضمام">{formatDate(affiliate.joined_at)}</DetailRow>
                        <DetailRow label="آخر نشاط">{formatRelative(affiliate.last_active_at)}</DetailRow>
                        <DetailRow label="طريقة الإضافة">{AFFILIATE_SOURCES[affiliate.source]}</DetailRow>
                    </dl>
                </Section>

                <Section title="العمولة" icon="percent" action={!isPending && <Button size="sm" variant="ghost" onClick={() => actions.commission(affiliate)}>تعديل</Button>}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
                        <div>
                            <p className="text-xs text-muted">{commission.isCustom ? 'عمولة استثنائية مخصصة' : 'عمولة الشريحة الافتراضية'}</p>
                            <p className="mt-1 text-lg font-bold text-ink">{formatCommission(commission)}</p>
                            {commission.note && <p className="mt-1 text-xs text-ink-2">{commission.note}</p>}
                        </div>
                        <Badge tone={commission.isCustom ? 'warning' : 'neutral'}>{commission.isCustom ? 'مخصصة' : 'افتراضية'}</Badge>
                    </div>
                </Section>

                <Section title="بيانات السحب" icon="wallet">
                    <div className="rounded-xl border border-line p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <PayoutMethodLabel type={affiliate.payout_method.type} />
                            <button type="button" onClick={() => setRevealAccount((value) => !value)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <Icon name={revealAccount ? 'eye-off' : 'eye'} className="size-3.5" />
                                {revealAccount ? 'إخفاء' : 'إظهار البيانات'}
                            </button>
                        </div>
                        <dl className="divide-y divide-line">
                            <DetailRow label="اسم صاحب الحساب">{affiliate.payout_method.account_name}</DetailRow>
                            <DetailRow label={payoutConfig.numberLabel}>
                                <span className="inline-flex items-center gap-1">
                                    <span className="ltr font-mono">{revealAccount ? affiliate.payout_method.account_number : maskAccount(affiliate.payout_method.account_number)}</span>
                                    {revealAccount && <CopyButton value={affiliate.payout_method.account_number} label="نسخ رقم الحساب" />}
                                </span>
                            </DetailRow>
                            {affiliate.payout_method.bank_name && <DetailRow label="البنك">{affiliate.payout_method.bank_name}</DetailRow>}
                            {affiliate.payout_method.iban && (
                                <DetailRow label="IBAN">
                                    <span className="ltr font-mono text-xs">{revealAccount ? affiliate.payout_method.iban : maskAccount(affiliate.payout_method.iban)}</span>
                                </DetailRow>
                            )}
                        </dl>
                    </div>
                </Section>

                <Section
                    title="أكواد الإحالة والروابط النشطة"
                    icon="link"
                    action={
                        affiliate.status === 'active' && (
                            <Button size="sm" variant="soft" icon="plus" loading={creatingCode} onClick={() => actions.createReferralCode(affiliate)}>
                                كود جديد
                            </Button>
                        )
                    }
                >
                    {affiliate.referral_codes.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{isPending ? 'سيُنشأ كود الإحالة تلقائياً عند قبول الطلب.' : 'لا توجد أكواد إحالة بعد.'}</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {affiliate.referral_codes.map((referral) => {
                                const conversion = referral.clicks ? ((referral.orders / referral.clicks) * 100).toFixed(1) : '0';

                                return (
                                    <li key={referral.referral_code_id} className="rounded-xl border border-line p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="ltr rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-sm font-bold text-primary">{referral.code}</span>
                                                <CopyButton value={referral.code} label="نسخ الكود" />
                                            </div>
                                            <Badge tone={referral.is_active ? 'success' : 'neutral'} dot>
                                                {referral.is_active ? 'فعّال' : 'معطّل'}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-1 rounded-lg bg-surface-2 ps-3" dir="ltr">
                                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{referral.url}</span>
                                            <CopyButton value={referral.url} label="نسخ الرابط" />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                                            <span>
                                                النقرات: <strong className="text-ink">{formatNumber(referral.clicks)}</strong>
                                            </span>
                                            <span>
                                                الطلبات: <strong className="text-ink">{formatNumber(referral.orders)}</strong>
                                            </span>
                                            <span>
                                                معدل التحويل: <strong className="text-ink">{conversion}%</strong>
                                            </span>
                                            <span>أُنشئ {formatDate(referral.created_at)}</span>
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
