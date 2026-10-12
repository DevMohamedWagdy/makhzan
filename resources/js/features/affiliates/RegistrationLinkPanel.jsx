import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert } from '@/components/ui/Display';
import { Field, Select, Switch } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useCopy } from '@/hooks/common';
import { AFFILIATE_TIERS } from '@/lib/constants';
import { cn } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';

const TIER_OPTIONS = Object.entries(AFFILIATE_TIERS).map(([value, tier]) => ({ value, label: `${tier.label} (${tier.default_commission}%)` }));

/** Public self-registration link with approval mode controls. Settings save instantly. */
export function RegistrationLinkPanel({ pendingCount = 0, onReviewPending }) {
    const toast = useToast();
    const { copy, copiedValue } = useCopy();
    const [settings, setSettings] = useState(null);
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    useEffect(() => {
        affiliatesApi.getRegistrationLink().then(setSettings).catch((error) => toast.error('تعذر تحميل إعدادات الرابط', error.message));
    }, [toast]);

    const update = async (patch, message) => {
        const previous = settings;

        setSettings({ ...settings, ...patch }); // Optimistic.

        try {
            setSettings(await affiliatesApi.updateRegistrationLink(patch));
            toast.success(message);
        } catch (error) {
            setSettings(previous);
            toast.error('تعذر حفظ الإعداد', error.message);
        }
    };

    const regenerate = async () => {
        setRegenerating(true);

        try {
            setSettings(await affiliatesApi.regenerateRegistrationLink());
            toast.success('تم إنشاء رابط جديد', 'الرابط القديم لم يعد يعمل.');
            setConfirmRegenerate(false);
        } catch (error) {
            toast.error('تعذر إنشاء رابط جديد', error.message);
        } finally {
            setRegenerating(false);
        }
    };

    if (!settings) {
        return (
            <div className="flex flex-col gap-4 p-6">
                <Skeleton className="h-28" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
            </div>
        );
    }

    // The shared URL lives on the storefront domain; preview the same path on this app.
    const joinUrl = new URL(settings.url);
    const previewPath = joinUrl.pathname + joinUrl.search;
    // Approved affiliates sign in at /{store-slug}/affiliates/login on the same domain.
    const loginPath = joinUrl.pathname.replace(/\/join$/, '/login');
    const loginUrl = joinUrl.origin + loginPath;
    const shareText = encodeURIComponent(`انضم لفريق المسوقين لدينا واربح عمولة على كل طلب 💰\n${settings.url}`);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className={cn('rounded-xl border p-5 transition', settings.is_enabled ? 'border-primary/30 bg-primary-soft' : 'border-line bg-surface-2 opacity-70')}>
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                        <Icon name="link" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-ink">رابط التسجيل الذاتي</p>
                        <p className="text-xs text-muted">شاركه على صفحاتك وجروبات الواتساب ليسجل المسوقون بأنفسهم</p>
                    </div>
                </div>

                <div className="mt-4 flex items-stretch gap-2" dir="ltr">
                    <code className="flex min-w-0 flex-1 items-center truncate rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink-2 sm:text-sm">{settings.url}</code>
                    <Button variant={copiedValue === settings.url ? 'success' : 'primary'} icon={copiedValue === settings.url ? 'check' : 'copy'} onClick={() => copy(settings.url)} disabled={!settings.is_enabled}>
                        {copiedValue === settings.url ? 'تم النسخ' : 'نسخ'}
                    </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <a
                        href={`https://wa.me/?text=${shareText}`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white hover:opacity-90', !settings.is_enabled && 'pointer-events-none opacity-50')}
                    >
                        <Icon name="phone" className="size-3.5" />
                        مشاركة عبر واتساب
                    </a>
                    <a
                        href={previewPath}
                        target="_blank"
                        rel="noreferrer"
                        className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-surface-3', !settings.is_enabled && 'pointer-events-none opacity-50')}
                    >
                        <Icon name="eye" className="size-3.5" />
                        معاينة الصفحة
                    </a>
                    <Button variant="secondary" size="sm" icon="refresh" onClick={() => setConfirmRegenerate(true)}>
                        إنشاء رابط جديد
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-surface-3 text-ink-2">
                        <Icon name="log-in" className="size-[18px]" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-ink">رابط دخول المسوقين</p>
                        <p className="text-xs text-muted">أرسله للمسوقين المقبولين ليتابعوا أرباحهم وروابطهم</p>
                    </div>
                </div>
                <div className="mt-3 flex items-stretch gap-2" dir="ltr">
                    <code className="flex min-w-0 flex-1 items-center truncate rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">{loginUrl}</code>
                    <Button size="sm" className="h-auto" variant={copiedValue === loginUrl ? 'success' : 'secondary'} icon={copiedValue === loginUrl ? 'check' : 'copy'} onClick={() => copy(loginUrl)}>
                        {copiedValue === loginUrl ? 'تم' : 'نسخ'}
                    </Button>
                    <a href={loginPath} target="_blank" rel="noreferrer" className="grid w-9 place-items-center rounded-lg border border-line text-ink-2 hover:bg-surface-3" aria-label="فتح صفحة الدخول" title="فتح صفحة الدخول">
                        <Icon name="eye" className="size-4" />
                    </a>
                </div>
            </div>

            <div className="mk-card divide-y divide-line">
                <div className="p-4">
                    <Switch
                        checked={settings.is_enabled}
                        onChange={(is_enabled) => update({ is_enabled }, is_enabled ? 'تم تفعيل رابط التسجيل' : 'تم إيقاف رابط التسجيل')}
                        label="تفعيل رابط التسجيل"
                        description="عند الإيقاف لن يتمكن أحد من التسجيل عبر الرابط حتى تعيد تفعيله."
                    />
                </div>
                <div className="p-4">
                    <Switch
                        checked={settings.auto_approve}
                        onChange={(auto_approve) => update({ auto_approve }, auto_approve ? 'سيتم قبول المسوقين الجدد تلقائياً' : 'ستراجع طلبات الانضمام يدوياً')}
                        label="القبول التلقائي للمسوقين"
                        description={settings.auto_approve ? 'يصبح المسوق نشطاً فور التسجيل ويحصل على كود إحالة مباشرة.' : 'تظهر طلبات الانضمام في قائمة «بانتظار المراجعة» حتى توافق عليها.'}
                    />
                </div>
                <div className="p-4">
                    <Field label="الشريحة الافتراضية للمسجلين عبر الرابط">
                        {(props) => <Select {...props} value={settings.default_tier} onChange={(event) => update({ default_tier: event.target.value }, 'تم تحديث الشريحة الافتراضية')} options={TIER_OPTIONS} />}
                    </Field>
                </div>
            </div>

            {!settings.auto_approve && pendingCount > 0 && (
                <Alert tone="warning" title={`لديك ${pendingCount} طلب انضمام بانتظار المراجعة`}>
                    <button type="button" onClick={onReviewPending} className="mt-1 font-semibold underline underline-offset-4">
                        مراجعة الطلبات الآن
                    </button>
                </Alert>
            )}

            <ConfirmDialog
                open={confirmRegenerate}
                onClose={() => setConfirmRegenerate(false)}
                onConfirm={regenerate}
                loading={regenerating}
                tone="warning"
                icon="refresh"
                title="إنشاء رابط تسجيل جديد؟"
                description="سيتوقف الرابط الحالي عن العمل فوراً، وستحتاج إلى مشاركة الرابط الجديد مرة أخرى. المسوقون المسجلون حالياً لن يتأثروا."
                confirmLabel="إنشاء رابط جديد"
            />
        </div>
    );
}
