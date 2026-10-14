import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Display';
import { Field, PasswordInput, Switch } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { t } from '@/i18n';
import { formatDate } from '@/lib/format';
import { ordersApi } from '@/services/ordersApi';

/** Connects the store's Bosta account so orders can be shipped and tracked automatically. */
export function BostaConnectionCard() {
    const toast = useToast();
    const [connection, setConnection] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [allowOpenPackage, setAllowOpenPackage] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        ordersApi
            .bostaConnection()
            .then((loaded) => {
                setConnection(loaded);
                setAllowOpenPackage(loaded.allow_open_package);
            })
            .catch(() => setConnection({ connected: false }));
    }, []);

    const save = async () => {
        setBusy(true);
        setError(null);

        try {
            const saved = await ordersApi.saveBostaConnection({ api_key: apiKey || null, allow_open_package: allowOpenPackage });

            setConnection(saved);
            setApiKey('');
            toast.success(t('تم ربط حساب بوسطة'));
        } catch (saveError) {
            setError(saveError.errors?.api_key ?? saveError.message);
        } finally {
            setBusy(false);
        }
    };

    const disconnect = async () => {
        setBusy(true);

        try {
            await ordersApi.disconnectBosta();
            setConnection({ connected: false });
            toast.success(t('تم فصل حساب بوسطة'));
        } catch (disconnectError) {
            toast.error(t('تعذر فصل الحساب'), disconnectError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card
            title={t('بوسطة')}
            description={t('أنشئ شحنات بوسطة من صفحة الطلب، واطبع البوالص، وتتحدث حالة الطلب تلقائياً عند التوصيل أو المرتجع')}
            actions={connection?.connected && <Badge tone="success" icon="check">{t('متصل')}</Badge>}
        >
            {!connection ? (
                <Skeleton className="h-24 w-full" />
            ) : (
                <div className="flex flex-col gap-4">
                    <Field
                        label={t('مفتاح API من بوسطة')}
                        required={!connection.connected}
                        error={error}
                        hint={connection.connected ? t('المفتاح الحالي {hint} · تم التحقق {date}. اكتب مفتاحاً جديداً لتغييره.', { hint: connection.api_key_hint, date: formatDate(connection.verified_at) }) : t('من لوحة بوسطة: الإعدادات ← API Integration ← إنشاء مفتاح.')}
                    >
                        {(props) => <PasswordInput {...props} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" dir="ltr" className="text-start" />}
                    </Field>
                    <Switch checked={allowOpenPackage} onChange={setAllowOpenPackage} label={t('السماح للعميل بفتح الشحنة قبل الاستلام')} />
                    <div className="flex flex-wrap justify-end gap-2">
                        {connection.connected && (
                            <Button variant="danger-soft" icon="x" onClick={disconnect} disabled={busy}>
                                {t('فصل الحساب')}
                            </Button>
                        )}
                        <Button icon="check" loading={busy} onClick={save} disabled={!connection.connected && !apiKey.trim()}>
                            {connection.connected ? t('حفظ') : t('ربط الحساب')}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
