import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, Switch } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { t } from '@/i18n';
import { collectionsApi } from '@/services/productsApi';

/**
 * Create or edit a collection. Calls `onSaved(collection)` with the saved record.
 * @param {{ collection?: object | null, open: boolean, onClose: Function, onSaved: Function }} props
 */
export function CollectionFormModal({ collection, open, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName(collection?.name ?? '');
            setIsActive(collection?.is_active ?? true);
            setErrors({});
        }
    }, [open, collection]);

    const submit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            setErrors({ name: t('أدخل اسم التصنيف') });

            return;
        }

        const payload = { name: name.trim(), is_active: isActive };

        setSaving(true);

        try {
            onSaved(collection ? await collectionsApi.update(collection.collection_id, payload) : await collectionsApi.create(payload));
        } catch (error) {
            setErrors(error.errors && Object.keys(error.errors).length ? error.errors : { form: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!saving}
            icon="award"
            title={collection ? t('تعديل التصنيف') : t('إضافة تصنيف جديد')}
            description={t('كل تصنيف يظهر قسماً مستقلاً في الصفحة الرئيسية لمتجرك، مثل: أحدث العروض، الأكثر مبيعاً.')}
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                {errors.form && <Alert tone="danger">{errors.form}</Alert>}
                <Field label={t('اسم التصنيف')} error={errors.name} required>
                    {(props) => (
                        <Input
                            {...props}
                            data-autofocus
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setErrors({});
                            }}
                            aria-invalid={errors.name ? 'true' : undefined}
                            placeholder={t('مثال: أحدث العروض')}
                            maxLength={80}
                        />
                    )}
                </Field>
                <div className="rounded-xl border border-line bg-surface-2 p-4">
                    <Switch checked={isActive} onChange={setIsActive} label={t('ظاهر في المتجر')} description={t('أوقفه لإخفاء التصنيف من الصفحة الرئيسية مؤقتاً مع الإبقاء على منتجاته.')} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('إلغاء')}
                    </Button>
                    <Button type="submit" loading={saving} icon="check">
                        {collection ? t('حفظ التعديلات') : t('إضافة التصنيف')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
