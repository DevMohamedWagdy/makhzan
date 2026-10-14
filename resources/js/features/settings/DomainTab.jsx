import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, Badge } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCopy } from '@/hooks/common';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { storeSettingsApi } from '@/services/storeSettingsApi';

/** The store's own domain: save it, add the CNAME record, then verify. */
export function DomainTab() {
    const toast = useToast();
    const { isOwner } = useAuth();
    const { copy, copiedValue } = useCopy();
    const [data, setData] = useState(null);
    const [domain, setDomain] = useState('');
    const [error, setError] = useState(null);
    const [planRequired, setPlanRequired] = useState(false);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        storeSettingsApi
            .domain()
            .then((loaded) => {
                setData(loaded);
                setDomain(loaded.domain ?? '');
            })
            .catch((loadError) => setError(loadError.message));
    }, []);

    const run = async (name, action, message) => {
        setBusy(name);
        setError(null);

        try {
            const updated = await action();

            setData(updated);
            setDomain(updated.domain ?? '');
            toast.success(message);
        } catch (actionError) {
            setPlanRequired(actionError.status === 402);
            setError(actionError.errors?.domain ?? actionError.message);
        } finally {
            setBusy(null);
        }
    };

    if (!data) {
        return error ? <Alert tone="danger">{error}</Alert> : <Skeleton className="h-40 w-full" />;
    }

    const host = data.domain?.split('.').length > 2 ? data.domain.split('.')[0] : '@';

    return (
        <div className="flex max-w-2xl flex-col gap-5">
            <p className="text-sm leading-relaxed text-muted">{t('اعرض متجرك على دومينك الخاص (مثل shop.example.com) بدلاً من رابط مخزن. يظل الرابط القديم يعمل.')}</p>

            {planRequired && (
                <Alert tone="warning" title={t('الدومين الخاص غير متاح في باقتك')}>
                    {isOwner ? t('رقِّ باقتك من صفحة الاشتراك لاستخدام دومين خاص.') : t('اطلب من صاحب المتجر ترقية الباقة.')}
                    {isOwner && (
                        <Button to="/dashboard/subscription" size="sm" variant="secondary" icon="zap" className="ms-2">
                            {t('الاشتراك والباقة')}
                        </Button>
                    )}
                </Alert>
            )}

            <Field label={t('الدومين')} error={!planRequired ? error : null} hint={t('بدون https أو /، مثل: shop.example.com')}>
                {(props) => <Input {...props} value={domain} onChange={(event) => setDomain(event.target.value)} dir="ltr" className="text-start" placeholder="shop.example.com" />}
            </Field>

            <div className="flex flex-wrap gap-2">
                <Button icon="check" loading={busy === 'save'} disabled={!domain.trim() || domain.trim() === data.domain} onClick={() => run('save', () => storeSettingsApi.saveDomain(domain), t('تم حفظ الدومين'))}>
                    {t('حفظ الدومين')}
                </Button>
                {data.domain && (
                    <Button variant="danger-soft" icon="trash" loading={busy === 'remove'} onClick={() => run('remove', () => storeSettingsApi.removeDomain(), t('تم حذف الدومين'))}>
                        {t('إزالة الدومين')}
                    </Button>
                )}
            </div>

            {data.domain && (
                <section className="rounded-xl border border-line p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-ink">{data.domain}</h3>
                        {data.verified_at ? <Badge tone="success" icon="check">{t('مفعّل منذ {date}', { date: formatDate(data.verified_at) })}</Badge> : <Badge tone="warning">{t('بانتظار ضبط DNS')}</Badge>}
                    </div>
                    {!data.verified_at && (
                        <>
                            <p className="text-sm text-ink-2">{t('أضف هذا السجل في إعدادات DNS عند مزود الدومين، ثم اضغط تحقق:')}</p>
                            <div className="mk-scroll mt-3 overflow-x-auto">
                                <table className="w-full min-w-[420px] text-sm" dir="ltr">
                                    <thead className="text-xs text-muted">
                                        <tr>
                                            <th className="py-1.5 text-start font-medium">Type</th>
                                            <th className="py-1.5 text-start font-medium">Host / Name</th>
                                            <th className="py-1.5 text-start font-medium">Value / Target</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        <tr>
                                            <td className="py-1.5">CNAME</td>
                                            <td className="py-1.5">{host}</td>
                                            <td className="py-1.5">
                                                <button type="button" onClick={() => copy(data.cname_target)} className="hover:text-primary" title={t('نسخ')}>
                                                    {copiedValue === data.cname_target ? t('تم النسخ') : data.cname_target}
                                                </button>
                                            </td>
                                        </tr>
                                        {data.ip && (
                                            <tr>
                                                <td className="py-1.5">A</td>
                                                <td className="py-1.5">@</td>
                                                <td className="py-1.5">{data.ip}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Button className="mt-4" icon="refresh" loading={busy === 'verify'} onClick={() => run('verify', () => storeSettingsApi.verifyDomain(), t('تم تفعيل الدومين'))}>
                                {t('تحقق من الدومين')}
                            </Button>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
