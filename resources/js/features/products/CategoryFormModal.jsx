import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { Field, Input, Switch, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Overlay';
import { ImageUpload } from '@/components/ui/Upload';
import { categoriesApi } from '@/services/productsApi';

/**
 * Create or edit a category. Calls `onSaved(category)` with the saved record.
 * @param {{ category?: object | null, open: boolean, onClose: Function, onSaved: Function }} props
 */
export function CategoryFormModal({ category, open, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName(category?.name ?? '');
            setDescription(category?.description ?? '');
            setImage(category?.image_url ?? null);
            setIsActive(category?.is_active ?? true);
            setErrors({});
        }
    }, [open, category]);

    const submit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            setErrors({ name: 'أدخل اسم القسم' });

            return;
        }

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            is_active: isActive,
            ...(image instanceof File && { image }),
            ...(category?.image_url && !image && { remove_image: true }),
        };

        setSaving(true);

        try {
            onSaved(category ? await categoriesApi.update(category.category_id, payload) : await categoriesApi.create(payload));
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
            icon="grid"
            title={category ? 'تعديل القسم' : 'إضافة قسم جديد'}
            description="الأقسام تنظّم منتجاتك في لوحة التحكم وفي متجرك، مثل: فساتين، عبايات، إكسسوارات."
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                {errors.form && <Alert tone="danger">{errors.form}</Alert>}
                <Field label="اسم القسم" error={errors.name} required>
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
                            placeholder="مثال: فساتين سهرة"
                            maxLength={80}
                        />
                    )}
                </Field>
                <Field label="وصف مختصر" optional error={errors.description} hint="يظهر أعلى صفحة القسم في المتجر">
                    {(props) => <Textarea {...props} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} />}
                </Field>
                <Field label="صورة القسم" optional error={errors.image}>
                    {() => <ImageUpload value={image} onChange={setImage} onError={(message) => setErrors(message ? { image: message } : {})} />}
                </Field>
                <div className="rounded-xl border border-line bg-surface-2 p-4">
                    <Switch checked={isActive} onChange={setIsActive} label="ظاهر في المتجر" description="أوقفه لإخفاء القسم من المتجر مؤقتاً مع الإبقاء على منتجاته." />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        إلغاء
                    </Button>
                    <Button type="submit" loading={saving} icon="check">
                        {category ? 'حفظ التعديلات' : 'إضافة القسم'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
