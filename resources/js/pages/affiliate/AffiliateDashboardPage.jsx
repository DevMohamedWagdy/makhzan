import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { ImpersonationBanner } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Alert, Avatar, Badge, Card, DetailRow, EmptyState, StatCard } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Field, Input, PasswordInput, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { Skeleton } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { useToast } from '@/context/ToastContext';
import { PayoutMethodLabel, StatusBadge, TierBadge, formatCommission } from '@/features/affiliates/AffiliateBadges';
import { PayoutHistory } from '@/features/affiliates/PayoutHistory';
import { useCopy } from '@/hooks/common';
import { useForm } from '@/hooks/useForm';
import { CURRENCY } from '@/lib/constants';
import { cn, formatDate, formatMoney, formatNumber, formatRelative } from '@/lib/format';
import { rules } from '@/lib/validators';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

const passwordSchema = {
    current_password: [rules.required('أدخل كلمة المرور الحالية')],
    password: [rules.required('أدخل كلمة المرور الجديدة'), rules.password()],
    password_confirmation: [rules.required('أعد كتابة كلمة المرور'), rules.matches('password')],
};

function ChangePasswordModal({ open, onClose }) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const { values, errors, setErrors, bind, validateFields, reset } = useForm({ current_password: '', password: '', password_confirmation: '' }, passwordSchema);

    const close = () => {
        reset();
        onClose();
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!validateFields()) {
            return;
        }

        setSubmitting(true);

        try {
            const { message } = await affiliatePortalApi.changePassword(values);

            toast.success('تم تغيير كلمة المرور', message);
            close();
        } catch (error) {
            setErrors(error.errors ?? { current_password: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={close} dismissible={!submitting} size="sm" icon="lock" title="تغيير كلمة المرور" description="سيتم تسجيل خروجك من جميع الأجهزة الأخرى.">
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Field label="كلمة المرور الحالية" error={errors.current_password} required>
                    {(props) => <PasswordInput {...props} {...bind('current_password')} autoComplete="current-password" data-autofocus />}
                </Field>
                <Field label="كلمة المرور الجديدة" error={errors.password} required>
                    {(props) => <PasswordInput {...props} {...bind('password')} showStrength placeholder="٨ أحرف على الأقل" />}
                </Field>
                <Field label="تأكيد كلمة المرور الجديدة" error={errors.password_confirmation} required>
                    {(props) => <PasswordInput {...props} {...bind('password_confirmation')} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={close} disabled={submitting}>
                        إلغاء
                    </Button>
                    <Button type="submit" loading={submitting} icon="check">
                        حفظ كلمة المرور
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function ReferralLinks({ codes, storeName }) {
    const { copy, copiedValue } = useCopy();

    if (codes.length === 0) {
        return <EmptyState icon="link" title="لا توجد روابط إحالة بعد" description="سيظهر رابطك هنا بمجرد أن ينشئه المتجر." />;
    }

    return (
        <ul className="flex flex-col gap-4">
            {codes.map((referral) => {
                const conversion = referral.clicks ? ((referral.orders / referral.clicks) * 100).toFixed(1) : '0';
                const shareText = encodeURIComponent(`تسوّق من ${storeName} عبر رابطي 🛍️\n${referral.url}`);

                return (
                    <li key={referral.referral_code_id} className={cn('rounded-xl border border-line p-4', !referral.is_active && 'opacity-60')}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="ltr rounded-lg bg-primary-soft px-2.5 py-1 font-mono text-base font-bold text-primary">{referral.code}</span>
                                <Badge tone={referral.is_active ? 'success' : 'neutral'} dot>
                                    {referral.is_active ? 'فعّال' : 'معطّل'}
                                </Badge>
                            </div>
                            <span className="text-xs text-muted">أُنشئ {formatDate(referral.created_at)}</span>
                        </div>

                        <div className="mt-3 flex items-stretch gap-2" dir="ltr">
                            <code className="flex min-w-0 flex-1 items-center truncate rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">{referral.url}</code>
                            <Button size="sm" className="h-auto" variant={copiedValue === referral.url ? 'success' : 'primary'} icon={copiedValue === referral.url ? 'check' : 'copy'} onClick={() => copy(referral.url)} disabled={!referral.is_active}>
                                {copiedValue === referral.url ? 'تم' : 'نسخ'}
                            </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                                <span>
                                    النقرات: <strong className="text-ink">{formatNumber(referral.clicks)}</strong>
                                </span>
                                <span>
                                    الطلبات: <strong className="text-ink">{formatNumber(referral.orders)}</strong>
                                </span>
                                <span>
                                    التحويل: <strong className="text-ink">{conversion}%</strong>
                                </span>
                            </div>
                            {referral.is_active && (
                                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white hover:opacity-90">
                                    <Icon name="phone" className="size-3.5" />
                                    مشاركة عبر واتساب
                                </a>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function RequestPayoutModal({ affiliate, open, onClose, onRequested }) {
    const toast = useToast();
    const balance = affiliate.stats.pending_balance;
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setAmount(String(balance));
            setNote('');
            setErrors({});
        }
    }, [open, balance]);

    const submit = async (event) => {
        event.preventDefault();
        const numeric = Number(amount);

        if (Number.isNaN(numeric) || numeric < 1) {
            setErrors({ amount: `أدخل مبلغاً لا يقل عن 1 ${CURRENCY}` });

            return;
        }

        if (numeric > balance) {
            setErrors({ amount: 'المبلغ أكبر من رصيدك المستحق' });

            return;
        }

        setSubmitting(true);

        try {
            await affiliatePortalApi.requestPayout({ amount: numeric, note: note.trim() || null });
            toast.success('تم إرسال طلب التحويل', 'سيراجع المتجر طلبك ويحوّل المبلغ إلى وسيلة السحب المسجلة.');
            onRequested();
        } catch (error) {
            setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { amount: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} dismissible={!submitting} size="sm" icon="send" title="طلب تحويل العمولة" description="سيصل طلبك للمتجر ليحوّل المبلغ إلى وسيلة السحب المسجلة.">
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
                    <PayoutMethodLabel type={affiliate.payout_method.type} />
                    <span className="ltr font-mono text-xs text-muted">•••• {affiliate.payout_method.account_number_last4}</span>
                </div>
                <Field label="المبلغ المطلوب" error={errors.amount} required hint={`رصيدك المستحق: ${formatMoney(balance)}`}>
                    {(props) => (
                        <Input
                            {...props}
                            data-autofocus
                            type="number"
                            inputMode="decimal"
                            min={1}
                            max={balance}
                            step="0.01"
                            value={amount}
                            onChange={(event) => {
                                setAmount(event.target.value);
                                setErrors({});
                            }}
                            aria-invalid={errors.amount ? 'true' : undefined}
                            suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>}
                        />
                    )}
                </Field>
                <Field label="ملاحظة للمتجر" optional error={errors.note}>
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: أرجو التحويل قبل نهاية الأسبوع" maxLength={200} />}
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        إلغاء
                    </Button>
                    <Button type="submit" loading={submitting} icon="send">
                        إرسال الطلب
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

/** Pending balance, the open transfer request (if any) and the button to ask for one. */
function PayoutRequestCard({ affiliate, isImpersonating, onRequest }) {
    const request = affiliate.payout_request;
    const balance = affiliate.stats.pending_balance;

    return (
        <Card title="تحويل أرباحي">
            <p className="text-xs text-muted">رصيدك المستحق</p>
            <p className="mt-1 text-2xl font-bold text-ink">{formatMoney(balance)}</p>

            {request ? (
                <Alert tone="warning" icon="refresh" title="طلبك قيد المراجعة" className="mt-4">
                    طلبت تحويل {formatMoney(request.amount)} {formatRelative(request.created_at)}، وسيصلك المبلغ بعد موافقة المتجر.
                </Alert>
            ) : (
                <>
                    <Button icon="send" className="mt-4 w-full" onClick={onRequest} disabled={isImpersonating || balance <= 0}>
                        طلب تحويل العمولة
                    </Button>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                        {isImpersonating ? 'غير متاح أثناء الدخول بصفة المسوق.' : balance > 0 ? 'سيصل طلبك للمتجر ليحوّل المبلغ إلى وسيلة السحب المسجلة.' : 'لا يوجد رصيد مستحق للتحويل حالياً.'}
                    </p>
                </>
            )}
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

/**
 * The affiliate's home: earnings, commission, referral links and account. Also what a
 * vendor sees when impersonating, in which case account actions are read-only.
 */
export function AffiliateDashboardPage() {
    const navigate = useNavigate();
    const { logout, isImpersonating, storeSlug } = useAffiliateAuth();
    const [affiliate, setAffiliate] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [payoutOpen, setPayoutOpen] = useState(false);
    const loadPayouts = useCallback((page) => affiliatePortalApi.payouts(page), []);

    const load = useCallback(() => {
        setLoadError(null);
        affiliatePortalApi
            .me()
            .then((data) => {
                setAffiliate(data);
                document.title = `لوحة المسوق | ${data.store.name}`;
            })
            .catch((error) => setLoadError(error.message));
    }, []);

    useEffect(load, [load]);

    const signOut = () => {
        const slug = affiliate?.store.slug ?? storeSlug;

        logout();
        navigate(slug ? `/${slug}/affiliates/login` : '/affiliate', { replace: true });
    };

    const store = affiliate?.store;

    return (
        <div className="min-h-dvh">
            <ImpersonationBanner />
            <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        {store ? <Avatar name={store.name} src={store.logo_url} size="sm" /> : <Skeleton className="size-8 rounded-xl" />}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{store?.name}</p>
                            <p className="text-xs text-muted">بوابة المسوقين</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {affiliate && (
                            <Dropdown
                                label="قائمة الحساب"
                                trigger={(props) => (
                                    <button type="button" {...props} className="flex items-center gap-2 rounded-xl p-1 pe-2 transition hover:bg-surface-3">
                                        <Avatar name={affiliate.full_name} src={affiliate.avatar_url} size="sm" />
                                        <span className="hidden text-sm font-semibold text-ink sm:block">{affiliate.full_name.split(' ')[0]}</span>
                                        <Icon name="chevron-down" className="hidden size-4 text-muted sm:block" />
                                    </button>
                                )}
                                items={[
                                    { label: 'تغيير كلمة المرور', icon: 'lock', onClick: () => setPasswordOpen(true), disabled: isImpersonating, hint: isImpersonating ? 'غير متاح أثناء الدخول بصفة المسوق' : undefined },
                                    { divider: true, hidden: isImpersonating },
                                    { label: 'تسجيل الخروج', icon: 'log-out', tone: 'danger', onClick: signOut, hidden: isImpersonating },
                                ]}
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                {loadError ? (
                    <EmptyState icon="alert-triangle" title="تعذر تحميل بياناتك" description={loadError} action={<Button variant="secondary" icon="refresh" onClick={load}>إعادة المحاولة</Button>} />
                ) : !affiliate ? (
                    <DashboardSkeleton />
                ) : (
                    <div className="flex flex-col gap-6">
                        {affiliate.status !== 'active' && (
                            <Alert tone="danger" icon="snowflake" title="هذا الحساب غير نشط">
                                روابط الإحالة معطلة حالياً. تعرض هذه الصفحة البيانات كما يراها المسوق.
                            </Alert>
                        )}

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-ink">أهلاً {affiliate.full_name.split(' ')[0]} 👋</h1>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <StatusBadge status={affiliate.status} />
                                    <TierBadge tier={affiliate.tier} />
                                    <span className="text-xs text-muted">مسوق منذ {formatDate(affiliate.joined_at)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 px-5 py-4 text-white shadow-lg shadow-primary/20">
                                <Icon name="percent" className="size-8 opacity-80" />
                                <div>
                                    <p className="text-xs text-indigo-100">عمولتك على كل طلب</p>
                                    <p className="text-2xl font-bold">{formatCommission(affiliate.commission)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="طلباتي" value={formatNumber(affiliate.stats.orders_count)} icon="shopping-bag" />
                            <StatCard label="مبيعاتي" value={formatMoney(affiliate.stats.sales_total)} icon="bar-chart" tone="info" />
                            <StatCard label="إجمالي أرباحي" value={formatMoney(affiliate.stats.earned_commission)} icon="wallet" tone="success" />
                            <StatCard label="رصيد مستحق" value={formatMoney(affiliate.stats.pending_balance)} icon="refresh" tone="warning" />
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="flex flex-col gap-6 lg:col-span-2">
                                <Card title="روابط الإحالة الخاصة بي" description="شارك هذه الروابط، وكل طلب يتم عبرها يُحسب لك">
                                    <ReferralLinks codes={affiliate.referral_codes} storeName={store.name} />
                                </Card>

                                <Card title="سجل تحويلاتي" description="المبالغ التي حوّلها المتجر لك وطلبات التحويل">
                                    <PayoutHistory load={loadPayouts} refreshKey={`${affiliate.stats.pending_balance}-${affiliate.payout_request?.payout_id ?? 'none'}`} emptyText="لم تستلم أي تحويلات بعد." />
                                </Card>
                            </div>

                            <div className="flex flex-col gap-6">
                                <PayoutRequestCard affiliate={affiliate} isImpersonating={isImpersonating} onRequest={() => setPayoutOpen(true)} />

                                <Card title="وسيلة استلام الأرباح">
                                    <PayoutMethodLabel type={affiliate.payout_method.type} />
                                    <dl className="mt-3 divide-y divide-line">
                                        <DetailRow label="اسم صاحب الحساب">{affiliate.payout_method.account_name}</DetailRow>
                                        <DetailRow label="رقم الحساب">
                                            <span className="ltr font-mono">•••• {affiliate.payout_method.account_number_last4}</span>
                                        </DetailRow>
                                        {affiliate.payout_method.bank_name && <DetailRow label="البنك">{affiliate.payout_method.bank_name}</DetailRow>}
                                    </dl>
                                    <p className="mt-3 text-xs leading-relaxed text-muted">لتغيير وسيلة السحب تواصل مع المتجر، حمايةً لأرباحك من التحويل لحساب آخر.</p>
                                </Card>

                                <Card title="بيانات الحساب">
                                    <dl className="divide-y divide-line">
                                        <DetailRow label="الاسم">{affiliate.full_name}</DetailRow>
                                        <DetailRow label="الهاتف" ltr>
                                            {affiliate.phone}
                                        </DetailRow>
                                        <DetailRow label="البريد" ltr>
                                            {affiliate.email}
                                        </DetailRow>
                                    </dl>
                                    <Button variant="secondary" size="sm" icon="lock" className="mt-4 w-full" onClick={() => setPasswordOpen(true)} disabled={isImpersonating}>
                                        تغيير كلمة المرور
                                    </Button>
                                </Card>
                            </div>
                        </div>

                        <p className="text-center text-xs text-muted">سجل الطلبات التفصيلي سيتوفر هنا قريباً.</p>
                    </div>
                )}
            </main>

            <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
            {affiliate && (
                <RequestPayoutModal
                    affiliate={affiliate}
                    open={payoutOpen}
                    onClose={() => setPayoutOpen(false)}
                    onRequested={() => {
                        setPayoutOpen(false);
                        load();
                    }}
                />
            )}
            <footer className="pb-8 text-center">
                <Logo className="mx-auto h-7 opacity-60" />
            </footer>
        </div>
    );
}
